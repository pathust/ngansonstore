import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const categoriesRouter = Router();

categoriesRouter.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = dbManager.getCategories();
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

categoriesRouter.post('/categories', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Tên danh mục không được để trống' });
    }
    const created = dbManager.createCategory(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

categoriesRouter.put('/categories/:id', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateCategory(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

categoriesRouter.delete('/categories/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteCategory(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
    }
    res.json({ success: true, message: 'Đã xóa danh mục' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
