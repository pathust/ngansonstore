import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const systemRouter = Router();

systemRouter.get('/system/stats', (req: Request, res: Response) => {
  try {
    const stats = dbManager.getStats();
    res.json({ success: true, data: stats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Yêu cầu ADMIN_KEY được cấu hình qua biến môi trường — không có fallback hardcode,
// vì đây là endpoint xóa dữ liệu (an toàn thất bại nếu chưa cấu hình).
systemRouter.post('/system/clean-mock', (req: Request, res: Response) => {
  try {
    const configuredKey = process.env.ADMIN_KEY;
    if (!configuredKey) {
      return res.status(503).json({ success: false, error: 'ADMIN_KEY chưa được cấu hình trên server — endpoint này bị vô hiệu hóa.' });
    }
    const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
    if (adminKey !== configuredKey) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin key required' });
    }
    dbManager.cleanMockData();
    res.json({ success: true, message: 'Đã dọn sạch toàn bộ dữ liệu mock trên máy chủ backend.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
