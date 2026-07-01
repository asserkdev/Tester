import { Request, Response, NextFunction } from 'express';
import type { APIResponse } from '../../types/index.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  const response: APIResponse<null> = {
    success: false,
    error: message,
  };

  if (process.env.NODE_ENV === 'development') {
    Object.assign(response, {
      stack: err.stack,
      details: {
        path: req.path,
        method: req.method,
      },
    });
  }

  console.error(`[Error] ${statusCode} - ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: APIResponse<null> = {
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
  };
  res.status(404).json(response);
}
