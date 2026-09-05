import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const usersRouter = Router();

usersRouter.get('/users', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const users = dbManager.getUsers();
    res.json({ success: true, data: users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

usersRouter.post('/users', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ success: false, error: 'Tên người dùng không được để trống!' });
    }
    const saved = dbManager.saveUser(req.body);
    res.json({ success: true, data: saved, message: 'Lưu thông tin tài khoản thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

usersRouter.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' });
    }
    const ok = dbManager.updateUserPassword(req.params.id, newPassword);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản để đặt lại mật khẩu!' });
    }
    res.json({ success: true, message: 'Đặt lại mật khẩu cho nhân viên thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

usersRouter.patch('/users/:id/status', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'LOCKED') {
      return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ!' });
    }
    const ok = dbManager.updateUserStatus(req.params.id, status);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản!' });
    }
    res.json({
      success: true,
      message: status === 'ACTIVE' ? 'Đã kích hoạt lại tài khoản thành công!' : 'Đã khóa tài khoản thành công!',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

usersRouter.put('/users/:id/profile', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const updated = dbManager.updateUserProfile(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản!' });
    }
    res.json({ success: true, data: updated, message: 'Cập nhật hồ sơ cá nhân thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

usersRouter.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const ok = dbManager.deleteUser(req.params.id);
    if (!ok) {
      return res.status(400).json({ success: false, error: 'Không thể xóa tài khoản Quản trị viên (Admin) hoặc tài khoản không tồn tại!' });
    }
    res.json({ success: true, message: 'Đã xóa tài khoản thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});
