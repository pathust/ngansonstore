import { BackgroundTask, Product } from '../types/index';
import { apiClient } from './apiClient';

type TaskListener = (tasks: BackgroundTask[]) => void;

class BackgroundWorkerManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private listeners: Set<TaskListener> = new Set();
  private cancelFlags: Map<string, boolean> = new Map();
  private pauseFlags: Map<string, boolean> = new Map();

  public subscribe(listener: TaskListener): () => void {
    this.listeners.add(listener);
    listener(this.getAllTasks());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const taskList = this.getAllTasks();
    this.listeners.forEach((fn) => fn(taskList));
  }

  public getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.startTime - a.startTime);
  }

  public getActiveTaskCount(): number {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'RUNNING').length;
  }

  public cancelTask(taskId: string): void {
    this.cancelFlags.set(taskId, true);
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'CANCELLED';
      this.notify();
    }
  }

  public togglePauseTask(taskId: string): void {
    const isPaused = this.pauseFlags.get(taskId) || false;
    this.pauseFlags.set(taskId, !isPaused);
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = isPaused ? 'RUNNING' : 'PAUSED';
      this.notify();
    }
  }

  public removeTask(taskId: string): void {
    this.tasks.delete(taskId);
    this.cancelFlags.delete(taskId);
    this.pauseFlags.delete(taskId);
    this.notify();
  }

  public clearCompletedTasks(): void {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED' || task.status === 'ERROR') {
        this.tasks.delete(id);
        this.cancelFlags.delete(id);
        this.pauseFlags.delete(id);
      }
    }
    this.notify();
  }

  /**
   * Process a large array of products progressively in small chunks (e.g. 50 items/chunk)
   * Sends chunks to backend /api/products/batch while updating progress smoothly
   */
  public async runProgressiveProductImport(
    products: Product[],
    strategy: 'OVERWRITE' | 'SKIP' | 'KEEP_BOTH' | 'REPLACE_ALL' = 'OVERWRITE',
    options?: {
      title?: string;
      chunkSize?: number;
      delayBetweenChunksMs?: number;
      onChunkComplete?: (chunk: Product[], processed: number, total: number) => void;
    }
  ): Promise<{ success: boolean; totalProcessed: number; cancelled?: boolean }> {
    const taskId = `task-import-${Date.now()}`;
    const chunkSize = options?.chunkSize || 50;
    const delayMs = options?.delayBetweenChunksMs || 25;
    const total = products.length;

    const task: BackgroundTask = {
      id: taskId,
      title: options?.title || `Nhập danh mục (${total.toLocaleString('vi-VN')} hàng hóa)`,
      description: `Đang xử lý theo từng đợt ${chunkSize} sản phẩm để tối ưu bộ nhớ & tránh đơ máy...`,
      type: 'IMPORT_PRODUCTS',
      status: 'RUNNING',
      progress: 0,
      processedCount: 0,
      totalCount: total,
      startTime: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.cancelFlags.set(taskId, false);
    this.pauseFlags.set(taskId, false);
    this.notify();

    let processed = 0;
    const totalChunks = Math.ceil(total / chunkSize);

    try {
      for (let i = 0; i < totalChunks; i++) {
        // Check cancellation
        if (this.cancelFlags.get(taskId)) {
          task.status = 'CANCELLED';
          this.notify();
          return { success: false, totalProcessed: processed, cancelled: true };
        }

        // Check pause loop
        while (this.pauseFlags.get(taskId)) {
          await new Promise((r) => setTimeout(r, 200));
          if (this.cancelFlags.get(taskId)) {
            task.status = 'CANCELLED';
            this.notify();
            return { success: false, totalProcessed: processed, cancelled: true };
          }
        }

        const startIdx = i * chunkSize;
        const chunk = products.slice(startIdx, startIdx + chunkSize);

        // Upload chunk to backend
        await apiClient.batchUpsertProducts(
          chunk,
          i === 0 && strategy === 'REPLACE_ALL' ? 'REPLACE_ALL' : strategy === 'REPLACE_ALL' ? 'OVERWRITE' : strategy
        );

        processed += chunk.length;
        task.processedCount = processed;
        task.progress = Math.min(100, Math.round((processed / total) * 100));
        task.currentItemName = chunk[chunk.length - 1]?.name || '';

        // Estimate remaining time
        const elapsed = Date.now() - task.startTime;
        const rate = processed / elapsed; // items per ms
        const remainingItems = total - processed;
        task.estimatedRemainingMs = rate > 0 ? Math.round(remainingItems / rate) : 0;

        if (options?.onChunkComplete) {
          options.onChunkComplete(chunk, processed, total);
        }

        this.notify();

        // Frame yield delay to keep main UI thread 60fps responsive
        if (delayMs > 0 && i < totalChunks - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      task.status = 'COMPLETED';
      task.progress = 100;
      task.processedCount = total;
      this.notify();

      // Auto clear after 8 seconds if completed
      setTimeout(() => {
        if (this.tasks.get(taskId)?.status === 'COMPLETED') {
          this.removeTask(taskId);
        }
      }, 8000);

      return { success: true, totalProcessed: processed };
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[BackgroundWorker] Error during chunked product import:', err);
      task.status = 'ERROR';
      task.errorMessage = message || 'Lỗi trong quá trình xử lý ngầm';
      this.notify();
      return { success: false, totalProcessed: processed };
    }
  }

  /**
   * Run generic background progressive task
   */
  public async runGenericProgressiveTask<T>(
    items: T[],
    processor: (chunk: T[], chunkIndex: number) => Promise<void>,
    options: {
      id?: string;
      title: string;
      description?: string;
      type: BackgroundTask['type'];
      chunkSize?: number;
      delayMs?: number;
      getItemName?: (item: T) => string;
    }
  ): Promise<boolean> {
    const taskId = options.id || `task-${Date.now()}`;
    const chunkSize = options.chunkSize || 50;
    const total = items.length;

    const task: BackgroundTask = {
      id: taskId,
      title: options.title,
      description: options.description,
      type: options.type,
      status: 'RUNNING',
      progress: 0,
      processedCount: 0,
      totalCount: total,
      startTime: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.cancelFlags.set(taskId, false);
    this.pauseFlags.set(taskId, false);
    this.notify();

    let processed = 0;
    const totalChunks = Math.ceil(total / chunkSize);

    try {
      for (let i = 0; i < totalChunks; i++) {
        if (this.cancelFlags.get(taskId)) {
          task.status = 'CANCELLED';
          this.notify();
          return false;
        }

        while (this.pauseFlags.get(taskId)) {
          await new Promise((r) => setTimeout(r, 200));
          if (this.cancelFlags.get(taskId)) {
            task.status = 'CANCELLED';
            this.notify();
            return false;
          }
        }

        const chunk = items.slice(i * chunkSize, (i + 1) * chunkSize);
        await processor(chunk, i);

        processed += chunk.length;
        task.processedCount = processed;
        task.progress = Math.min(100, Math.round((processed / total) * 100));
        if (options.getItemName && chunk.length > 0) {
          task.currentItemName = options.getItemName(chunk[chunk.length - 1]);
        }

        this.notify();
        await new Promise((r) => setTimeout(r, options.delayMs || 20));
      }

      task.status = 'COMPLETED';
      task.progress = 100;
      this.notify();

      setTimeout(() => {
        if (this.tasks.get(taskId)?.status === 'COMPLETED') {
          this.removeTask(taskId);
        }
      }, 8000);

      return true;
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
      task.status = 'ERROR';
      task.errorMessage = message || 'Lỗi tiến trình ngầm';
      this.notify();
      return false;
    }
  }
}

export const backgroundWorker = new BackgroundWorkerManager();
