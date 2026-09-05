import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const settingsRouter = Router();

settingsRouter.get('/settings', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const settings = dbManager.getSettings();
    res.json({ success: true, data: settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

settingsRouter.put('/settings', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const updated = dbManager.updateSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
