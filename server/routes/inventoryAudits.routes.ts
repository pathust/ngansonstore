import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const inventoryAuditsRouter = Router();

inventoryAuditsRouter.get('/inventory-audits', (req: Request, res: Response) => {
  try {
    const { search, status, limit, offset } = req.query;
    const result = dbManager.getAudits({
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

inventoryAuditsRouter.post('/inventory-audits', (req: Request, res: Response) => {
  try {
    const audit = req.body;
    const created = dbManager.createAudit(audit);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

inventoryAuditsRouter.post('/inventory-audits/:id/balance', (req: Request, res: Response) => {
  try {
    const balanced = dbManager.balanceAudit(req.params.id);
    if (!balanced) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }
    res.json({ success: true, data: balanced });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
