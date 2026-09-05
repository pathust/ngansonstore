import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const customersRouter = Router();

customersRouter.get('/customers', (req: Request, res: Response) => {
  try {
    const { search, group, type, status, debt, limit, offset } = req.query;
    const result = dbManager.getCustomers({
      search: search as string,
      group: group as string,
      type: type as string,
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

customersRouter.get('/customers/:id', (req: Request, res: Response) => {
  try {
    const customer = dbManager.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

customersRouter.post('/customers', (req: Request, res: Response) => {
  try {
    const customer = req.body;
    if (!customer.name) {
      return res.status(400).json({ success: false, error: 'Missing required fields (name)' });
    }
    const created = dbManager.createCustomer(customer);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

customersRouter.post('/customers/bulk', (req: Request, res: Response) => {
  try {
    const { items, mode } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items must be an array' });
    }
    const result = dbManager.batchUpsertCustomers(items, mode || 'OVERWRITE');
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

customersRouter.put('/customers/:id', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateCustomer(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

customersRouter.delete('/customers/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteCustomer(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, message: 'Deleted customer' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
