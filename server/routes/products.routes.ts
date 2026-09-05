import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';

export const productsRouter = Router();

productsRouter.get('/products', (req: Request, res: Response) => {
  try {
    const { search, category, status, limit, offset } = req.query;
    const result = dbManager.getProducts({
      search: search as string,
      category: category as string,
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

productsRouter.get('/products/:id', (req: Request, res: Response) => {
  try {
    const product = dbManager.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

productsRouter.post('/products', (req: Request, res: Response) => {
  try {
    const product = req.body;
    if (!product.name || typeof product.name !== 'string' || product.name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Tên sản phẩm không hợp lệ' });
    }
    if (product.selling_price !== undefined && product.selling_price < 0) {
      return res.status(400).json({ success: false, error: 'Giá bán không được âm' });
    }
    if (product.stock !== undefined && product.stock < 0) {
      return res.status(400).json({ success: false, error: 'Tồn kho không được âm' });
    }
    if (!product.sku) {
      return res.status(400).json({ success: false, error: 'Missing required fields (sku)' });
    }
    const created = dbManager.createProduct(product);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Chunked Batch Products Upsert (for progressive Excel import / background queue)
productsRouter.post('/products/batch', (req: Request, res: Response) => {
  try {
    const { items, strategy } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }
    const result = dbManager.batchUpsertProducts(items, strategy || 'OVERWRITE');
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

productsRouter.put('/products/:id', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim() === '')) {
      return res.status(400).json({ success: false, error: 'Tên sản phẩm không hợp lệ' });
    }
    if (updates.selling_price !== undefined && updates.selling_price < 0) {
      return res.status(400).json({ success: false, error: 'Giá bán không được âm' });
    }
    if (updates.stock !== undefined && updates.stock < 0) {
      return res.status(400).json({ success: false, error: 'Tồn kho không được âm' });
    }
    const updated = dbManager.updateProduct(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

productsRouter.delete('/products/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, message: 'Deleted product' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
