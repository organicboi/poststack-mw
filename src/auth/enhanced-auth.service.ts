import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabaseService } from '../services/supabase.service';
import {
  EnhancedUser,
  AuthRequest,
  AuthResponse,
  RegisterRequest,
  PlanTier,
} from '../types/enhanced.types';
import {
  AppError,
  ErrorCode,
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from '../utils/error-handler';

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not set in environment variables');
    }
  }

  /**
   * Register a new user with JWT authentication
   */
  async registerWithJWT(data: RegisterRequest): Promise<AuthResponse> {
    const { email, password, first_name, last_name } = data;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Check if user already exists
    const existingUser = await supabaseService.getUserByEmail(email);
    if (existingUser) {
      throw new AppError(
        'User already exists',
        409,
        ErrorCode.DUPLICATE_RESOURCE
      );
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user in Supabase
    const user = await supabaseService.createUser({
      email,
      password_hash,
      first_name,
      last_name,
      plan_tier: 'FREE' as PlanTier,
      is_active: true,
    });

    // Create initial billing info
    await supabaseService.upsertBillingInfo({
      user_id: user.id,
      current_plan: 'FREE' as PlanTier,
      posts_used_this_month: 0,
      teams_used: 0,
      social_accounts_used: 0,
    });

    // Generate tokens
    const token = this.generateAccessToken(user);
    const refresh_token = this.generateRefreshToken(user);

    return {
      user,
      token,
      expires_in: this.getTokenExpirationTime(),
      refresh_token,
    };
  }

  /**
   * Authenticate user with email/password
   */
  async loginWithJWT(data: AuthRequest): Promise<AuthResponse> {
    const { email, password } = data;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email
    const user = await supabaseService.getUserByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (!user.is_active) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    if (!user.password_hash) {
      throw new AuthenticationError(
        'Password authentication not available for this account'
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate tokens
    const token = this.generateAccessToken(user);
    const refresh_token = this.generateRefreshToken(user);

    return {
      user,
      token,
      expires_in: this.getTokenExpirationTime(),
      refresh_token,
    };
  }

  /**
   * Authenticate with Supabase session
   */
  async authenticateWithSupabase(accessToken: string): Promise<EnhancedUser> {
    try {
      // Set the session in Supabase client
      await supabaseService.setUserSession(accessToken);

      // Get user from Supabase auth
      const {
        data: { user: supabaseUser },
        error,
      } = await supabaseService.getClient().auth.getUser(accessToken);

      if (error || !supabaseUser) {
        throw new AuthenticationError('Invalid Supabase session');
      }

      // Get enhanced user data
      let enhancedUser = await supabaseService.getUser(supabaseUser.id);

      if (!enhancedUser) {
        // Create user if doesn't exist (first-time Supabase user)
        enhancedUser = await supabaseService.createUser({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          first_name: supabaseUser.user_metadata?.first_name,
          last_name: supabaseUser.user_metadata?.last_name,
          avatar: supabaseUser.user_metadata?.avatar_url,
          plan_tier: 'FREE' as PlanTier,
          is_active: true,
        });

        // Create initial billing info
        await supabaseService.upsertBillingInfo({
          user_id: enhancedUser.id,
          current_plan: 'FREE' as PlanTier,
          posts_used_this_month: 0,
          teams_used: 0,
          social_accounts_used: 0,
        });
      }

      if (!enhancedUser.is_active) {
        throw new AuthenticationError('Account is deactivated');
      }

      return enhancedUser;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AuthenticationError('Failed to authenticate with Supabase');
    }
  }

  /**
   * Verify JWT token and get user
   */
  async verifyToken(token: string): Promise<EnhancedUser> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;

      if (!decoded.userId) {
        throw new AuthenticationError('Invalid token payload');
      }

      const user = await supabaseService.getUser(decoded.userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      if (!user.is_active) {
        throw new AuthenticationError('Account is deactivated');
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      }
      if (error instanceof AppError) throw error;
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;

      if (!decoded.userId || decoded.type !== 'refresh') {
        throw new AuthenticationError('Invalid refresh token');
      }

      const user = await supabaseService.getUser(decoded.userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      if (!user.is_active) {
        throw new AuthenticationError('Account is deactivated');
      }

      // Generate new tokens
      const token = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        user,
        token,
        expires_in: this.getTokenExpirationTime(),
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid refresh token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Refresh token expired');
      }
      if (error instanceof AppError) throw error;
      throw new AuthenticationError('Token refresh failed');
    }
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await supabaseService.getUser(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // For JWT auth, verify current password
    if (user.password_hash) {
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }
    }

    // Hash new password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await supabaseService.updateUser(userId, { password_hash });
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string): Promise<void> {
    await supabaseService.updateUser(userId, { is_active: false });
  }

  /**
   * Reactivate user account
   */
  async reactivateAccount(userId: string): Promise<void> {
    await supabaseService.updateUser(userId, { is_active: true });
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<EnhancedUser> {
    const user = await supabaseService.getUser(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<EnhancedUser>
  ): Promise<EnhancedUser> {
    // Remove sensitive fields that shouldn't be updated via profile update
    const { password_hash, is_active, plan_tier, ...safeUpdates } = updates;

    return await supabaseService.updateUser(userId, safeUpdates);
  }

  /**
   * Generate access token
   */
  private generateAccessToken(user: EnhancedUser): string {
    const payload = {
      userId: user.id,
      email: user.email,
      plan_tier: user.plan_tier,
      type: 'access',
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'middleware-app',
      subject: user.id,
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: EnhancedUser): string {
    const payload = {
      userId: user.id,
      type: 'refresh',
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiresIn,
      issuer: 'middleware-app',
      subject: user.id,
    });
  }

  /**
   * Get token expiration time in seconds
   */
  private getTokenExpirationTime(): number {
    const timeString = this.jwtExpiresIn;
    const timeValue = parseInt(timeString.slice(0, -1));
    const timeUnit = timeString.slice(-1);

    switch (timeUnit) {
      case 's':
        return timeValue;
      case 'm':
        return timeValue * 60;
      case 'h':
        return timeValue * 3600;
      case 'd':
        return timeValue * 86400;
      default:
        return 86400; // 24 hours default
    }
  }

  /**
   * Hybrid authentication - tries both JWT and Supabase
   */
  async authenticateHybrid(token: string): Promise<EnhancedUser> {
    try {
      // First, try JWT authentication
      return await this.verifyToken(token);
    } catch (jwtError) {
      try {
        // If JWT fails, try Supabase authentication
        return await this.authenticateWithSupabase(token);
      } catch (supabaseError) {
        // If both fail, throw the JWT error (likely more informative)
        throw jwtError;
      }
    }
  }

  /**
   * Check if user has required plan tier
   */
  checkPlanAccess(user: EnhancedUser, requiredPlan: PlanTier): boolean {
    const planHierarchy: Record<PlanTier, number> = {
      FREE: 0,
      STARTER: 1,
      PROFESSIONAL: 2,
      ENTERPRISE: 3,
    };

    return planHierarchy[user.plan_tier] >= planHierarchy[requiredPlan];
  }

  /**
   * Health check for auth service
   */
  async healthCheck(): Promise<{
    status: string;
    checks: Record<string, boolean>;
  }> {
    const checks: Record<string, boolean> = {};

    try {
      // Check Supabase connection
      await supabaseService.healthCheck();
      checks.supabase = true;
    } catch {
      checks.supabase = false;
    }

    // Check JWT configuration
    checks.jwt_secret = !!this.jwtSecret;

    const allChecksPass = Object.values(checks).every(check => check);

    return {
      status: allChecksPass ? 'healthy' : 'degraded',
      checks,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
