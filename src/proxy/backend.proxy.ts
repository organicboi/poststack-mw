import { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service';

const authService = new AuthService();
// Default service role key for testing. Replace/remove for production.
const DEFAULT_SERVICE_ROLE_KEY =
  'service_role_Z4KxPqLmN8tRvWyD7cJbH2gF3sA5eB9U';

export const backendProxy = async (req: Request, res: Response) => {
  try {
    console.log('\n==== BACKEND PROXY REQUEST ====');
    console.log('Request path:', req.originalUrl);
    console.log('Request method:', req.method);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));

    // ALWAYS USE SERVICE KEY FOR BACKEND AUTHENTICATION
    // This middleware acts as a transparent proxy that automatically handles authentication
    const serviceKey = process.env.SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY;

    console.log(
      '� AUTO-AUTHENTICATION: Using service key for backend requests'
    );
    console.log('- Service key loaded:', `${serviceKey.substring(0, 10)}...`);
    console.log('- Middleware mode: Transparent proxy with auto-auth');

    // Always proceed with service key authentication
    if (serviceKey) {
      console.log(
        '✅ AUTO-AUTHENTICATION: Forwarding request with service key'
      );

      // Forward the request to backend with service key
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const targetUrl = `${backendUrl}${req.originalUrl}`;
      console.log('Forwarding to backend URL:', targetUrl);

      // Prepare headers for backend request with service key
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Service-Key': serviceKey.toString(), // Send only one service key header
      };

      console.log('🔑 Auto-including service key in backend request headers');

      // Add user agent header if present
      if (req.headers['user-agent']) {
        headers['User-Agent'] = req.headers['user-agent'] as string;
      }

      // Add forwarded IP if available
      if (req.ip) {
        headers['X-Forwarded-For'] = req.ip as string;
      }

      // Forward the request to backend with the service key
      console.log('📤 Sending request to backend with auto-auth headers');

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        ...(req.method !== 'GET' &&
          req.method !== 'HEAD' && {
            body:
              Object.keys(req.body).length > 0
                ? JSON.stringify(req.body)
                : undefined,
          }),
      });

      console.log('📥 Backend response status:', response.status);

      const data = await response.text();
      console.log('📥 Backend response data preview:', data.substring(0, 200));

      // Forward response headers
      for (const [key, value] of response.headers.entries()) {
        if (
          !['content-encoding', 'transfer-encoding', 'content-length'].includes(
            key.toLowerCase()
          )
        ) {
          res.setHeader(key, value);
        }
      }

      res.status(response.status);

      // Try to parse as JSON, fallback to text
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch {
        res.send(data);
      }

      return;
    }

    // If no service key is configured, return an error
    console.error('❌ SERVICE KEY MISSING: Cannot authenticate with backend');
    return res.status(500).json({
      success: false,
      message:
        'Service authentication not configured. Please check middleware configuration.',
    });
  } catch (error: any) {
    console.error('Backend proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
