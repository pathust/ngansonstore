import express from 'express';
import { apiRouter } from '../server/routes.js';

const app = express();

// Body parsers with large limit for bulk import & sync
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Version');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Mount /api routes
app.use('/api', apiRouter);

// Health check root
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'Vercel Serverless',
    timestamp: Date.now(),
    service: 'Cửa hàng Ngân Sơn - 318 Vũ Quang',
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Serverless API Error]', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

export default app;
