import { Request, Response } from 'express';
import axios, { AxiosRequestConfig } from 'axios';
import { config } from '../../common/config';
import { AuthenticatedRequest } from '../workspace/workspace.middleware';

// Create axios instance for backend API requests
const backendAPI = axios.create({
  baseURL: config.backend.url,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Proxy service to forward requests to the backend API
 */
export class BackendProxyService {
  /**
   * Forward requests to the backend API using service key authentication only
   * Used for calendar API and other public endpoints
   */
  async proxyRequestWithServiceKey(req: Request, res: Response): Promise<void> {
    try {
      // Extract the API path from the originalUrl (without query string)
      const originalUrl = req.originalUrl;
      const pathMatch = originalUrl.match(/^\/api\/(.*)/);

      if (!pathMatch) {
        res.status(400).json({
          success: false,
          message: 'Invalid API path',
          error: 'INVALID_PATH',
        });
        return;
      }

      // Get just the path part without query string
      let targetPath = pathMatch[1].split('?')[0];

      // Map Postiz-compatible routes to backend routes
      // /api/postiz/posts -> /posts
      // /api/postiz/posts/tags -> /posts/tags
      // /api/postiz/integrations/list -> /integrations
      // /api/auth/session -> /auth/can-register (fallback to existing endpoint)
      if (targetPath.startsWith('postiz/posts/tags')) {
        targetPath = 'posts/tags';
      } else if (targetPath.startsWith('postiz/posts')) {
        targetPath = 'posts';
      } else if (targetPath === 'postiz/integrations/list') {
        targetPath = 'integrations';
      } else if (targetPath === 'auth/session') {
        targetPath = 'auth/can-register';
      }

      // Prepare headers for proxying
      const headers: Record<string, string> = {
        ...(req.headers as Record<string, string>),
      };

      // Remove cookies and host headers as they're specific to the middleware server
      delete headers.cookie;
      delete headers.host;
      delete headers['content-length'];

      // Add service key for authenticating with backend
      headers['x-service-key'] = config.serviceRole.key || '';

      // Create request config
      const axiosConfig: AxiosRequestConfig = {
        method: req.method,
        url: targetPath,
        headers,
        data: req.method !== 'GET' ? req.body : undefined,
        params: req.query,
        responseType: 'json',
        maxContentLength: 100 * 1024 * 1024, // 100MB max response size
        maxBodyLength: 100 * 1024 * 1024, // 100MB max request body size
      };

      // Log proxy request (without sensitive data)
      const logConfig = {
        method: axiosConfig.method,
        url: axiosConfig.url,
        targetPath,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path,
        hasBody: !!axiosConfig.data,
        params: axiosConfig.params,
        bypassAuth: true,
      };
      console.log(`Service key proxy request: ${JSON.stringify(logConfig)}`);

      // Execute request to backend
      const response = await backendAPI.request(axiosConfig);

      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        // Skip content-encoding, connection headers, etc. that might cause issues
        if (
          !['content-encoding', 'connection', 'transfer-encoding'].includes(
            key.toLowerCase()
          )
        ) {
          res.setHeader(key, value);
        }
      });

      // Send response with status and data
      res.status(response.status).send(response.data);
    } catch (error: any) {
      // Handle axios errors
      if (error.response) {
        // Backend returned error response
        const { status, data } = error.response;
        res.status(status).json(data);
      } else if (error.request) {
        // No response received
        console.error('Backend proxy error - no response:', error.message);
        res.status(504).json({
          success: false,
          message: 'Gateway timeout - backend server did not respond',
          error: 'GATEWAY_TIMEOUT',
        });
      } else {
        // Request setup error
        console.error('Backend proxy error - request setup:', error.message);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: 'PROXY_ERROR',
          details:
            process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  }

  /**
   * Forward requests to the backend API
   */
  async proxyRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Get the path that comes after /api/
      const pathMatch = req.originalUrl.match(/^\/api\/(.*)/);
      if (!pathMatch) {
        res.status(400).json({
          success: false,
          message: 'Invalid API path',
          error: 'INVALID_PATH',
        });
        return;
      }

      const targetPath = pathMatch[1].split('?')[0];

      // Prepare headers for proxying
      const headers: Record<string, string> = {
        ...(req.headers as Record<string, string>),
        'x-middleware-user-id': req.user?.id || '',
      };

      // Remove cookies and host headers as they're specific to the middleware server
      delete headers.cookie;
      delete headers.host;
      delete headers['content-length'];

      // Add service key for authenticating with backend
      headers['x-service-key'] = config.serviceRole.key || '';

      // Create request config
      const axiosConfig: AxiosRequestConfig = {
        method: req.method,
        url: targetPath,
        headers,
        data: req.method !== 'GET' ? req.body : undefined,
        params: req.query,
        responseType: 'json',
        maxContentLength: 100 * 1024 * 1024, // 100MB max response size
        maxBodyLength: 100 * 1024 * 1024, // 100MB max request body size
      };

      // Log proxy request (without sensitive data)
      const logConfig = {
        method: axiosConfig.method,
        url: axiosConfig.url,
        hasBody: !!axiosConfig.data,
        params: axiosConfig.params,
        userId: req.user?.id || 'anonymous',
      };
      console.log(`Proxy request: ${JSON.stringify(logConfig)}`);

      // Execute request to backend
      const response = await backendAPI.request(axiosConfig);

      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        // Skip content-encoding, connection headers, etc. that might cause issues
        if (
          !['content-encoding', 'connection', 'transfer-encoding'].includes(
            key.toLowerCase()
          )
        ) {
          res.setHeader(key, value);
        }
      });

      // Send response with status and data
      res.status(response.status).send(response.data);
    } catch (error: any) {
      // Handle axios errors
      if (error.response) {
        // Backend returned error response
        const { status, data } = error.response;
        res.status(status).json(data);
      } else if (error.request) {
        // No response received
        console.error('Backend proxy error - no response:', error.message);
        res.status(504).json({
          success: false,
          message: 'Gateway timeout - backend server did not respond',
          error: 'GATEWAY_TIMEOUT',
        });
      } else {
        // Request setup error
        console.error('Backend proxy error - request setup:', error.message);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: 'PROXY_ERROR',
          details:
            process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  }
}

export const backendProxy = new BackendProxyService();
