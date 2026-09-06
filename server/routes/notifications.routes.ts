import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const notificationsRouter = Router();

// GET /api/notifications - Lấy danh sách thông báo và số lượng chưa đọc
notificationsRouter.get('/api/notifications', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();

    const type = req.query.type as string | undefined;
    const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const result = dbManager.getNotifications({ type, isRead, limit, offset });
    res.json({
      success: true,
      total: result.total,
      unreadCount: result.unreadCount,
      data: result.items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/notifications/read-all - Đánh dấu đã đọc tất cả thông báo
notificationsRouter.put('/api/notifications/read-all', async (_req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    dbManager.markAllNotificationsAsRead();
    res.json({ success: true, message: 'Đã đánh dấu đọc tất cả thông báo' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/notifications/:id/read - Đánh dấu đã đọc 1 thông báo
notificationsRouter.put('/api/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { id } = req.params;
    const ok = dbManager.markNotificationAsRead(id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy thông báo' });
    }
    res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/notifications/:id - Xóa / Bỏ qua 1 thông báo
notificationsRouter.delete('/api/notifications/:id', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { id } = req.params;
    const ok = dbManager.dismissNotification(id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy thông báo' });
    }
    res.json({ success: true, message: 'Đã xóa thông báo' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/notifications - Xóa tất cả thông báo
notificationsRouter.delete('/api/notifications', async (_req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    dbManager.clearAllNotifications();
    res.json({ success: true, message: 'Đã xóa tất cả thông báo' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
