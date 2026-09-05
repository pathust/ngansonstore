import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const suppliersRouter = Router();

suppliersRouter.get('/suppliers', (req: Request, res: Response) => {
  try {
    const { search, group, status, debt, limit, offset } = req.query;
    const result = dbManager.getSuppliers({
      search: search as string,
      group: group as string,
      status: status as string,
      debt: debt as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

suppliersRouter.post('/suppliers', (req: Request, res: Response) => {
  try {
    const supplier = req.body;
    const created = dbManager.createSupplier(supplier);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

suppliersRouter.post('/suppliers/batch', (req: Request, res: Response) => {
  try {
    const { items, strategy } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }
    const result = dbManager.batchUpsertSuppliers(items, strategy || 'OVERWRITE');
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

suppliersRouter.put('/suppliers/:id', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateSupplier(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

suppliersRouter.delete('/suppliers/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteSupplier(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }
    res.json({ success: true, message: 'Deleted supplier' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
