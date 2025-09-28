import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError('Route', `${req.method} ${req.path}`);

  // Log 404 attempts for monitoring
  logger.warn('Route not found:', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.requestId,
  });

  next(error);
};