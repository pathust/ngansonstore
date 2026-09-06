import { Router } from 'express';
import { dbManager } from './db.js';
import { healthRouter } from './routes/health.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { systemRouter } from './routes/system.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { suppliersRouter } from './routes/suppliers.routes.js';
import { customersRouter } from './routes/customers.routes.js';
import { inventoryAuditsRouter } from './routes/inventoryAudits.routes.js';
import { cashbookRouter } from './routes/cashbook.routes.js';
import { categoriesRouter } from './routes/categories.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';

// File này chỉ còn ghép các router con theo domain (server/routes/*.routes.ts).
// Xem .claude/skills/refactor-roadmap/SKILL.md (Pha D) để biết lý do và bản đồ file.
export const apiRouter = Router();

// Middleware: log API requests & add cache headers & ensure DB cache is loaded
apiRouter.use(async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    await dbManager.ensureLoaded();
  } catch (err) {
    // Non-blocking fallback
  }
  next();
});

apiRouter.use(healthRouter);
apiRouter.use(aiRouter);
apiRouter.use(systemRouter);
apiRouter.use(syncRouter);
apiRouter.use(productsRouter);
apiRouter.use(ordersRouter);
apiRouter.use(suppliersRouter);
apiRouter.use(customersRouter);
apiRouter.use(inventoryAuditsRouter);
apiRouter.use(cashbookRouter);
apiRouter.use(categoriesRouter);
apiRouter.use(authRouter);
apiRouter.use(usersRouter);
apiRouter.use(settingsRouter);
apiRouter.use(notificationsRouter);
