import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const cashbookRouter = Router();

cashbookRouter.get('/cashbook', (req: Request, res: Response) => {
  try {
    const { search, type, limit, offset } = req.query;
    const result = dbManager.getCashbook({
      search: search as string,
      type: type as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

cashbookRouter.post('/cashbook', (req: Request, res: Response) => {
  try {
    const entry = req.body;
    const created = dbManager.createCashbookEntry(entry);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

cashbookRouter.post('/cashbook/batch', (req: Request, res: Response) => {
  try {
    const { items, strategy } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }
    const result = dbManager.batchUpsertCashbook(items, strategy || 'OVERWRITE');
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

cashbookRouter.delete('/cashbook/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteCashbookEntry(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Cashbook entry not found' });
    }
    res.json({ success: true, message: 'Deleted entry' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

cashbookRouter.put('/cashbook/:id', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateCashbookEntry(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu thu/chi' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
