import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const authRouter = Router();

authRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!' });
    }

    const user = dbManager.getUserByUsernameOrEmail(username);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc tài khoản không tồn tại trên hệ thống!' });
    }

    if (user.status === 'LOCKED') {
      return res.status(403).json({ success: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên!' });
    }

    if (user.password && user.password !== password) {
      return res.status(401).json({ success: false, error: 'Mật khẩu không chính xác! Vui lòng thử lại.' });
    }

    const { password: _, ...sanitizedUser } = user;
    const token = `ns_token_${user.id}_${Date.now()}`;
    return res.json({
      success: true,
      user: sanitizedUser,
      token,
      message: `Đăng nhập thành công! Chào mừng ${user.name}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

authRouter.post('/auth/change-password', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ mật khẩu cũ và mật khẩu mới!' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' });
    }

    const user = dbManager.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng!' });
    }

    if (user.password && user.password !== oldPassword) {
      return res.status(400).json({ success: false, error: 'Mật khẩu hiện tại không đúng!' });
    }

    const ok = dbManager.updateUserPassword(userId, newPassword);
    if (!ok) {
      return res.status(500).json({ success: false, error: 'Không thể cập nhật mật khẩu!' });
    }

    return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});
