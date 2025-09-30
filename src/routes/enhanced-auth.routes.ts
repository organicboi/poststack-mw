import { Router, Request, Response } from 'express';
import { authService } from '../auth/enhanced-auth.service';
import {
  authenticate,
  optionalAuthenticate,
  validateApiKey,
} from '../auth/enhanced-auth.middleware';
import {
  asyncHandler,
  createSuccessResponse,
  validateRequired,
} from '../utils/error-handler';
import {
  AuthRequest,
  RegisterRequest,
  EnhancedUser,
  AuthResponse,
} from '../types/enhanced.types';

const router = Router();

// =============================================================================
// PUBLIC ROUTES (No Authentication Required)
// =============================================================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with JWT authentication
 * @access  Public
 */
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, first_name, last_name }: RegisterRequest =
      req.body;
    const requestId = req.headers['x-request-id'] as string;

    // Validate required fields
    validateRequired(req.body, ['email', 'password'], requestId);

    const result: AuthResponse = await authService.registerWithJWT({
      email,
      password,
      first_name,
      last_name,
    });

    res.status(201).json(
      createSuccessResponse(
        {
          user: {
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            plan_tier: result.user.plan_tier,
            avatar: result.user.avatar,
          },
          token: result.token,
          expires_in: result.expires_in,
        },
        'User registered successfully'
      )
    );
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get JWT token
 * @access  Public
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password }: AuthRequest = req.body;
    const requestId = req.headers['x-request-id'] as string;

    // Validate required fields
    validateRequired(req.body, ['email', 'password'], requestId);

    const result: AuthResponse = await authService.loginWithJWT({
      email,
      password,
    });

    res.json(
      createSuccessResponse(
        {
          user: {
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            plan_tier: result.user.plan_tier,
            avatar: result.user.avatar,
          },
          token: result.token,
          expires_in: result.expires_in,
        },
        'Login successful'
      )
    );
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT access token
 * @access  Public
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refresh_token } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    validateRequired(req.body, ['refresh_token'], requestId);

    const result: AuthResponse = await authService.refreshToken(refresh_token);

    res.json(
      createSuccessResponse(
        {
          user: {
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            plan_tier: result.user.plan_tier,
            avatar: result.user.avatar,
          },
          token: result.token,
          expires_in: result.expires_in,
        },
        'Token refreshed successfully'
      )
    );
  })
);

/**
 * @route   POST /api/auth/supabase
 * @desc    Authenticate with Supabase session token
 * @access  Public
 */
router.post(
  '/supabase',
  asyncHandler(async (req: Request, res: Response) => {
    const { access_token } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    validateRequired(req.body, ['access_token'], requestId);

    const user: EnhancedUser =
      await authService.authenticateWithSupabase(access_token);

    res.json(
      createSuccessResponse(
        {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            plan_tier: user.plan_tier,
            avatar: user.avatar,
          },
        },
        'Supabase authentication successful'
      )
    );
  })
);

// =============================================================================
// PROTECTED ROUTES (Authentication Required)
// =============================================================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!; // We know user exists because of authenticate middleware

    res.json(
      createSuccessResponse(
        {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.full_name,
            display_name: user.display_name,
            plan_tier: user.plan_tier,
            is_active: user.is_active,
            avatar: user.avatar,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
        },
        'User profile retrieved successfully'
      )
    );
  })
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { first_name, last_name, avatar } = req.body;

    const updatedUser = await authService.updateProfile(userId, {
      first_name,
      last_name,
      avatar,
    });

    res.json(
      createSuccessResponse(
        {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            full_name: updatedUser.full_name,
            display_name: updatedUser.display_name,
            plan_tier: updatedUser.plan_tier,
            avatar: updatedUser.avatar,
          },
        },
        'Profile updated successfully'
      )
    );
  })
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { current_password, new_password } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    validateRequired(req.body, ['current_password', 'new_password'], requestId);

    await authService.updatePassword(userId, current_password, new_password);

    res.json(createSuccessResponse(null, 'Password updated successfully'));
  })
);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token (for middleware testing)
 * @access  Public
 */
router.post(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    const requestId = req.headers['x-request-id'] as string;

    validateRequired(req.body, ['token'], requestId);

    const user = await authService.verifyToken(token);

    res.json(
      createSuccessResponse(
        {
          valid: true,
          user: {
            id: user.id,
            email: user.email,
            plan_tier: user.plan_tier,
            is_active: user.is_active,
          },
        },
        'Token is valid'
      )
    );
  })
);

// =============================================================================
// ADMIN ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/deactivate/:userId
 * @desc    Deactivate user account (Admin only)
 * @access  Private/Admin
 */
router.post(
  '/deactivate/:userId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUser = req.user!;

    // Check if current user is admin
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim());
    if (!adminEmails.includes(currentUser.email)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    }

    await authService.deactivateAccount(userId);

    res.json(createSuccessResponse(null, 'Account deactivated successfully'));
  })
);

// =============================================================================
// WEBHOOK ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/webhook/user-updated
 * @desc    Handle user update webhooks from external services
 * @access  API Key
 */
router.post(
  '/webhook/user-updated',
  validateApiKey,
  asyncHandler(async (req: Request, res: Response) => {
    const { user_id, updates } = req.body;

    // Update user in our system
    if (user_id && updates) {
      await authService.updateProfile(user_id, updates);
    }

    res.json(createSuccessResponse(null, 'User update webhook processed'));
  })
);

// =============================================================================
// HEALTH CHECK ROUTES
// =============================================================================

/**
 * @route   GET /api/auth/health
 * @desc    Auth service health check
 * @access  Public
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const healthCheck = await authService.healthCheck();

    res.json(createSuccessResponse(healthCheck, 'Auth service health check'));
  })
);

export { router as enhancedAuthRoutes };
