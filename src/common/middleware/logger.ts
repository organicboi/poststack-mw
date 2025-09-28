import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

  // Log service key if present (for debugging)
  if (req.headers['x-service-key']) {
    const serviceKey = req.headers['x-service-key'] as string;
    console.log(
      `Service key header received: ${serviceKey.substring(0, 10)}...`
    );
  }

  // Add response logging
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${
        res.statusCode
      } - ${duration}ms`
    );
    return originalSend.call(this, body);
  };

  next();
};
