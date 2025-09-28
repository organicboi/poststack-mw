import { Router } from 'express';
import { backendProxy } from '../proxy/backend.proxy';
import { Request, Response } from 'express';

const router = Router();

/**
 * Calendar API routes that bypass regular authentication
 * but still use service key for backend communication
 */

// Create specialized router handlers for each route
const createCalendarRouter = (routeType: string) => {
  const routeRouter = Router();

  // Catch all routes, including '/' and any other path
  routeRouter.get('*', (req: Request, res: Response) => {
    console.log(
      `Processing ${routeType} request with path: ${req.path}, originalUrl: ${req.originalUrl}, baseUrl: ${req.baseUrl}`
    );
    return backendProxy.proxyRequestWithServiceKey(req, res);
  });

  return routeRouter;
};

// Export different router instances for each route
export const postsRouter = createCalendarRouter('posts');
export const sessionRouter = createCalendarRouter('session');
export const integrationsRouter = createCalendarRouter('integrations');
export const tagsRouter = createCalendarRouter('tags');
export const testRouter = Router().get('/', (req: Request, res: Response) => {
  res.json({ message: 'Calendar controller test route works!' });
});

export default router;
