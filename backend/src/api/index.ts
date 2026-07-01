import { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import scanRoutes from './routes/scans.js';
import analyzerRoutes from './routes/analyzers.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const router = Router();

router.use(helmet());
router.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
router.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use('/scans', scanRoutes);
router.use('/analyzers', analyzerRoutes);

router.use(notFoundHandler);
router.use(errorHandler);

export default router;
