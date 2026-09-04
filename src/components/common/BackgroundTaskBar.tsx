import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Clock,
  Layers
} from 'lucide-react';
import { backgroundWorker } from '../../services/backgroundWorker';
import { BackgroundTask } from '../../types/index';

export const BackgroundTaskBar: React.FC = () => {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = backgroundWorker.subscribe((allTasks) => {
      setTasks(allTasks);
    });
    return unsubscribe;
  }, []);

  if (tasks.length === 0) return null;

  const runningTasks = tasks.filter((t) => t.status === 'RUNNING');
  const activeCount = runningTasks.length;

  return (
    <div className="fixed bottom-10 right-5 z-50 max-w-md w-full sm:w-[420px] transition-all duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden backdrop-blur-md">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Layers className="w-4 h-4 text-blue-400" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold">Tiến trình chạy ngầm</span>
              <span className="bg-blue-600/80 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {tasks.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => backgroundWorker.clearCompletedTasks()}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Dọn dẹp danh sách hoàn tất"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task List (if not minimized) */}
        {!isMinimized && (
          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
            {tasks.map((task) => {
              const isRunning = task.status === 'RUNNING';
              const isCompleted = task.status === 'COMPLETED';
              const isPaused = task.status === 'PAUSED';
              const isError = task.status === 'ERROR';
              const isCancelled = task.status === 'CANCELLED';

              return (
                <div key={task.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isRunning && <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />}
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        {isPaused && <Pause className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        {isError && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                        {isCancelled && <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        <span className="text-xs font-bold text-slate-800 truncate">{task.title}</span>
                      </div>
                      {task.currentItemName && isRunning && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 pl-5">
                          Đang nạp: <span className="font-medium text-slate-700">{task.currentItemName}</span>
                        </p>
                      )}
                    </div>

                    {/* Task Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isRunning && (
                        <button
                          onClick={() => backgroundWorker.togglePauseTask(task.id)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                          title="Tạm dừng"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isPaused && (
                        <button
                          onClick={() => backgroundWorker.togglePauseTask(task.id)}
                          className="p-1 hover:bg-slate-200 rounded text-emerald-600 cursor-pointer"
                          title="Tiếp tục"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(isRunning || isPaused) && (
                        <button
                          onClick={() => backgroundWorker.cancelTask(task.id)}
                          className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                          title="Hủy tiến trình"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(isCompleted || isError || isCancelled) && (
                        <button
                          onClick={() => backgroundWorker.removeTask(task.id)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 cursor-pointer"
                          title="Đóng"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : isError
                            ? 'bg-rose-500'
                            : isPaused
                            ? 'bg-amber-500'
                            : isCancelled
                            ? 'bg-slate-400'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>
                        {(task.processedCount ?? 0).toLocaleString('vi-VN')} / {(task.totalCount ?? 0).toLocaleString('vi-VN')} ({task.progress ?? 0}%)
                      </span>
                      {isRunning && task.estimatedRemainingMs !== undefined && task.estimatedRemainingMs > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Clock className="w-3 h-3" />
                          Còn ~{Math.ceil(task.estimatedRemainingMs / 1000)}s
                        </span>
                      )}
                      {isCompleted && <span className="text-emerald-600 font-bold">Hoàn tất 100%</span>}
                      {isError && <span className="text-rose-600 font-bold">{task.errorMessage || 'Lỗi'}</span>}
                      {isPaused && <span className="text-amber-600 font-bold">Đang tạm dừng</span>}
                      {isCancelled && <span className="text-slate-500 font-bold">Đã hủy</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
