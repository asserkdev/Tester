import { Router, Request, Response, NextFunction } from 'express';
import { analyzerRegistry } from '../../analyzers/base/AnalyzerRegistry.js';
import type { APIResponse } from '../../types/index.js';

const router = Router();

router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const analyzers = analyzerRegistry.getInfo();
    const categories = analyzerRegistry.getCategories();

    const response: APIResponse<typeof analyzers> & { categories?: typeof categories } = {
      success: true,
      data: analyzers,
      categories,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/categories', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = analyzerRegistry.getCategories();
    const byCategory = categories.map((cat) => ({
      category: cat,
      analyzers: analyzerRegistry.getByCategory(cat).map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
      })),
    }));

    const response: APIResponse<typeof byCategory> = {
      success: true,
      data: byCategory,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] ?? '';
    const analyzer = analyzerRegistry.get(id);

    if (!analyzer) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Analyzer not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: APIResponse<typeof analyzer> = {
      success: true,
      data: analyzer,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
