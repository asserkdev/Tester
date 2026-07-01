import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scanService } from '../../services/scanService.js';
import type { APIResponse, ScanOptions, AnalyzerCategory } from '../../types/index.js';

const router = Router();

const createScanSchema = z.object({
  url: z.string().url('Invalid URL format'),
  options: z.object({
    viewport: z.enum(['mobile', 'tablet', 'desktop']).optional(),
    categories: z.array(z.string()).optional(),
    maxDepth: z.number().min(0).max(10).optional(),
    timeout: z.number().min(10).max(600).optional(),
    followRedirects: z.boolean().optional(),
    checkExternalLinks: z.boolean().optional(),
  }).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(20),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createScanSchema.safeParse(req.body);
    if (!validation.success) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Validation failed',
        message: validation.error.errors.map((e) => e.message).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { url, options } = validation.data;
    const scanOptions: Partial<ScanOptions> = options ? {
      ...options,
      categories: options.categories as AnalyzerCategory[],
    } : undefined;
    const scan = await scanService.createScan(url, scanOptions);
    
    scanService.runScan(scan.id).catch((err) => {
      console.error(`Scan ${scan.id} failed:`, err);
    });

    const response: APIResponse<typeof scan> = {
      success: true,
      data: scan,
      message: 'Scan created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid query parameters' });
      return;
    }

    const { page, pageSize } = validation.data;
    const offset = (page - 1) * pageSize;
    const scans = await scanService.getAllScans(pageSize, offset);
    const total = await scanService.getScanCount();

    const response: APIResponse<typeof scans> & { total?: number; page?: number; pageSize?: number } = {
      success: true,
      data: scans,
      total,
      page,
      pageSize,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] ?? '';
    const scan = await scanService.getScan(id);

    if (!scan) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Scan not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: APIResponse<typeof scan> = {
      success: true,
      data: scan,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] ?? '';
    const scan = await scanService.getScan(id);

    if (!scan) {
      res.status(404).json({ success: false, error: 'Scan not found' });
      return;
    }

    const results = await scanService.getScanResults(id);
    const stats = await scanService.getScanStats(id);
    const score = scanService.calculateScore(results);

    const response: APIResponse<typeof results> & { stats?: typeof stats; score?: number } = {
      success: true,
      data: results,
      stats,
      score,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] ?? '';
    await scanService.deleteScan(id);
    res.json({ success: true, message: 'Scan deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] ?? '';
    await scanService.cancelScan(id);
    res.json({ success: true, message: 'Scan cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
