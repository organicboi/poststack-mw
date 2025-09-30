import { Router, Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '../../utils/async-handler';
import { config } from '../../common/config';

const router = Router();
const authService = new AuthService();

// Cookie options
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  maxAge: config.cookie.maxAge,
  domain: config.cookie.domain,
};

// Registration endpoint
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, company } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await authService.register(email, password, company || '');

    res.json({
      success: true,
      user: result.user,
      message: result.message,
    });
  })
);

// Login endpoint
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await authService.login(email, password);

    // Set HTTP-only cookie with Supabase JWT
    if (result.session?.access_token) {
      res.cookie('auth', result.session.access_token, cookieOptions);
    }

    res.json({
      success: true,
      user: result.user,
      message: 'Login successful',
    });
  })
);

// OAuth initiation
router.get(
  '/oauth/:provider',
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    const { redirectTo } = req.query;

    const url = await authService.getOAuthUrl(provider, redirectTo as string);

    res.json({ url });
  })
);

// OAuth callback
router.get(
  '/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.query;

    if (!code) {
      throw new Error('No authorization code provided');
    }

    const result = await authService.handleOAuthCallback(code as string);

    // Set HTTP-only cookie with Supabase JWT
    if (result.session?.access_token) {
      res.cookie('auth', result.session.access_token, cookieOptions);
    }

    // Redirect to frontend dashboard
    res.redirect(`${config.frontend.url}/dashboard`);
  })
);

// Logout
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.auth;

    if (token) {
      await authService.logout(token);
    }

    res.clearCookie('auth', cookieOptions);

    res.json({ success: true, message: 'Logged out successfully' });
  })
);

// Password reset
router.post(
  '/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    await authService.resetPassword(email);

    res.json({
      success: true,
      message: 'Password reset email sent',
    });
  })
);

// Validate session (for frontend checks)
router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.auth;

    if (!token) {
      throw new Error('No token provided');
    }

    const user = await authService.validateToken(token);

    res.json({
      success: true,
      user,
    });
  })
);

// Health check for auth routes - no authentication required
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth middleware is healthy',
    timestamp: new Date().toISOString(),
    routes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/auth/me',
      'POST /api/auth/reset-password',
      'GET /api/auth/oauth/:provider',
      'GET /api/auth/callback',
    ],
  });
});

export { router as authRoutes };
