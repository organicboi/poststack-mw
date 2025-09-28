import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { isBaseError } from '../utils/errors';
import { ErrorCode } from '../types/errors';
import {
  RegisterRequest,
  LoginRequest,
  PasswordResetRequest,
  PasswordUpdateRequest,
  OAuthRequest
} from '../modules/auth/auth.types';
import { authenticateUser, optionalAuthenticateUser } from './auth.middleware';

const router = Router();
const authService = new AuthService();

// Registration endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const registerRequest: RegisterRequest = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      company: req.body.company,
      firstName: req.body.firstName,
      lastName: req.body.lastName
    };

    const result = await authService.register(registerRequest);

    res.status(201).json(result);
  } catch (error: any) {
    handleControllerError(error, res);
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginRequest: LoginRequest = {
      email: req.body.email,
      password: req.body.password,
      rememberMe: req.body.rememberMe
    };

    const result = await authService.login(loginRequest);

    if (result.success && result.data?.session) {
      // Set secure HTTP-only cookies
      const maxAge = loginRequest.rememberMe
        ? 30 * 24 * 60 * 60 * 1000  // 30 days
        : 7 * 24 * 60 * 60 * 1000;  // 7 days

      res.cookie('access_token', result.data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge,
        domain: process.env.COOKIE_DOMAIN,
      });

      if (result.data.session.refresh_token) {
        res.cookie('refresh_token', result.data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          domain: process.env.COOKIE_DOMAIN,
        });
      }
    }

    res.json(result);
  } catch (error: any) {
    handleControllerError(error, res);
  }
});

// OAuth initiation
router.get('/oauth/:provider', async (req: Request, res: Response) => {
  try {
    const oauthRequest: OAuthRequest = {
      provider: req.params.provider as any,
      redirectTo: req.query.redirectTo as string,
      ...(req.query.scopes && { scopes: (req.query.scopes as string).split(',') })
    };

    const url = await authService.getOAuthUrl(oauthRequest);

    res.json({
      success: true,
      data: { url },
      message: 'OAuth URL generated successfully'
    });
  } catch (error: any) {
    handleControllerError(error, res);
  }
});

// OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(
          'No authorization code provided'
        )}`
      );
    }

    const result = await authService.handleOAuthCallback(code);

    if (result.success && result.data?.session) {
      // Set secure HTTP-only cookies
      res.cookie('access_token', result.data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: process.env.COOKIE_DOMAIN,
      });

      if (result.data.session.refresh_token) {
        res.cookie('refresh_token', result.data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          domain: process.env.COOKIE_DOMAIN,
        });
      }
    }

    // Redirect to frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error: any) {
    const errorMessage = isBaseError(error) ? error.message : 'OAuth authentication failed';
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(errorMessage)}`
    );
  }
});

// Token refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Refresh token is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    if (result.success && result.data?.session) {
      // Set new tokens in cookies
      res.cookie('access_token', result.data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: process.env.COOKIE_DOMAIN,
      });

      if (result.data.session.refresh_token) {
        res.cookie('refresh_token', result.data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          domain: process.env.COOKIE_DOMAIN,
        });
      }
    }

    res.json(result);
  } catch (error: any) {
    handleControllerError(error, res);
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await authService.logout(token);
    }

    // Clear all auth-related cookies
    const cookieOptions = {
      domain: process.env.COOKIE_DOMAIN,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    res.clearCookie('auth', cookieOptions); // Legacy cookie support

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    handleControllerError(error, res);
  }
});

// Password reset request
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const resetRequest: PasswordResetRequest = {
      email: req.body.email,
      redirectTo: req.body.redirectTo
    };

    const result = await authService.resetPassword(resetRequest);

    res.json({
      success: true,
      message: result.message || 'Password reset email sent successfully',
    });
  } catch (error: any) {
    handleControllerError(error, res);
  }
});

// Update password
router.put('/update-password', authenticateUser, async (req: Request, res: Response) => {
  try {
    const updateRequest: PasswordUpdateRequest = {
      newPassword: req.body.newPassword,
      accessToken: req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '') || ''
    };

    const result = await authService.updatePassword(updateRequest);

    res.json(result);
  } catch (error: any) {
    handleControllerError(error, res);
  }
});

// Get current user (protected route)
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
        authContext: req.authContext
      },
      message: 'User information retrieved successfully'
    });
  } catch (error: any) {
    handleControllerError(error, res);
  }
});

// Check authentication status (optional auth)
router.get('/status', optionalAuthenticateUser, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        isAuthenticated: req.isAuthenticated || false,
        user: req.user || null,
        authContext: req.authContext
      },
      message: 'Authentication status retrieved successfully'
    });
  } catch (error: any) {
    handleControllerError(error, res);
  }
});

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Helper function to handle controller errors
function handleControllerError(error: any, res: Response): void {
  console.error('Auth controller error:', error);

  if (isBaseError(error)) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  });
}

export { router as authRoutes };
