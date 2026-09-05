import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const syncRouter = Router();

syncRouter.get('/sync/pull', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const since = parseInt(req.query.since as string) || 0;
    const data = dbManager.pullSync(since);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

syncRouter.post('/sync/push', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const payload = req.body;
    const result = dbManager.pushSync(payload);
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
