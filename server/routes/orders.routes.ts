import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const ordersRouter = Router();

ordersRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { search, status, limit, offset } = req.query;
    const result = dbManager.getOrders({
      search: search as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

ordersRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const order = req.body;
    if (!order.code || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid order structure or empty items' });
    }
    for (const item of order.items) {
      if (!item.product_id || item.quantity <= 0 || (item.unit_price !== undefined && item.unit_price < 0) || (item.price !== undefined && item.price < 0)) {
        return res.status(400).json({ success: false, error: 'Chi tiết sản phẩm trong đơn hàng không hợp lệ' });
      }
    }
    const created = await dbManager.createOrder(order);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Chunked Batch Orders Upsert (for progressive Excel import)
ordersRouter.post('/orders/batch', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { items, strategy } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }
    const result = dbManager.batchUpsertOrders(items, strategy || 'OVERWRITE');
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

ordersRouter.put('/orders/:id', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const updates = req.body;
    if (updates.items && Array.isArray(updates.items)) {
      if (updates.items.length === 0) {
        return res.status(400).json({ success: false, error: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
      }
      for (const item of updates.items) {
        if (!item.product_id || item.quantity <= 0 || (item.unit_price !== undefined && item.unit_price < 0) || (item.price !== undefined && item.price < 0)) {
          return res.status(400).json({ success: false, error: 'Chi tiết sản phẩm trong đơn hàng không hợp lệ' });
        }
      }
    }
    const updated = await dbManager.updateOrder(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

ordersRouter.delete('/orders/:id', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const returnStock = req.query.returnStock === 'true';
    await dbManager.deleteOrder(req.params.id, returnStock);
    res.json({ success: true, message: 'Deleted order' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
