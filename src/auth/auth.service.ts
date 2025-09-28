import { supabaseAdmin, supabaseAnon } from './supabase.client';
import {
  AuthenticationError,
  ValidationError,
  ExternalServiceError,
  BusinessLogicError,
  createValidationError
} from '../utils/errors';
import { ErrorCode } from '../types/errors';
import {
  AuthResponse,
  TokenValidationResult,
  LoginRequest,
  RegisterRequest,
  PasswordResetRequest,
  PasswordUpdateRequest,
  OAuthRequest,
  LogoutResult,
  PasswordResetResult
} from '../modules/auth/auth.types';

export class AuthService {

  // Enhanced user registration with comprehensive error handling
  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      // Validate input
      this.validateRegistrationInput(request);

      // Check if user already exists
      const existingUser = await this.checkUserExists(request.email);
      if (existingUser) {
        throw new BusinessLogicError(
          'User with this email already exists',
          ErrorCode.RESOURCE_ALREADY_EXISTS,
          409
        );
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: request.email,
        password: request.password,
        email_confirm: false,
        user_metadata: {
          company: request.company,
          firstName: request.firstName,
          lastName: request.lastName,
          createdAt: new Date().toISOString()
        },
      });

      if (error) {
        throw this.handleSupabaseError(error, 'registration');
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: null
        },
        message: 'User registered successfully. Please verify your email and log in.'
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof BusinessLogicError) {
        throw error;
      }
      throw new ExternalServiceError('Supabase', 'Registration failed', error as Error);
    }
  }

  // Enhanced secure login with detailed error messages
  async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      // Validate input
      this.validateLoginInput(request);

      const { data, error } = await supabaseAnon.auth.signInWithPassword({
        email: request.email,
        password: request.password,
      });

      if (error) {
        throw this.handleSupabaseError(error, 'login');
      }

      if (!data.user || !data.session) {
        throw new AuthenticationError(
          'Login failed: Invalid response from authentication service',
          ErrorCode.AUTHENTICATION_ERROR
        );
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        },
        message: 'Login successful'
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new ExternalServiceError('Supabase', 'Login failed', error as Error);
    }
  }

  // Enhanced JWT token validation with comprehensive error checking
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      if (!token || token.trim() === '') {
        return {
          isValid: false,
          error: {
            code: 'TOKEN_MISSING',
            message: 'Authentication token is required'
          }
        };
      }

      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (error) {
        if (error.message.includes('expired')) {
          return {
            isValid: false,
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Authentication token has expired',
              shouldRefresh: true
            }
          };
        }

        if (error.message.includes('invalid') || error.message.includes('malformed')) {
          return {
            isValid: false,
            error: {
              code: 'TOKEN_INVALID',
              message: 'Authentication token is invalid'
            }
          };
        }

        return {
          isValid: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Token validation failed'
          }
        };
      }

      if (!user) {
        return {
          isValid: false,
          error: {
            code: 'TOKEN_INVALID',
            message: 'No user found for this token'
          }
        };
      }

      return {
        isValid: true,
        user
      };
    } catch (error) {
      return {
        isValid: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Token validation failed due to unexpected error'
        }
      };
    }
  }

  // Enhanced password reset functionality
  async resetPassword(request: PasswordResetRequest): Promise<PasswordResetResult> {
    try {
      this.validateEmail(request.email);

      const { error } = await supabaseAnon.auth.resetPasswordForEmail(request.email, {
        redirectTo: request.redirectTo || `${process.env.FRONTEND_URL}/auth/reset-password`,
      });

      if (error) {
        throw this.handleSupabaseError(error, 'password reset');
      }

      return {
        success: true,
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ExternalServiceError('Supabase', 'Password reset failed', error as Error);
    }
  }

  // Update password with token
  async updatePassword(request: PasswordUpdateRequest): Promise<AuthResponse> {
    try {
      this.validatePassword(request.newPassword);

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        request.accessToken,
        { password: request.newPassword }
      );

      if (error) {
        throw this.handleSupabaseError(error, 'password update');
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: null
        },
        message: 'Password updated successfully'
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new ExternalServiceError('Supabase', 'Password update failed', error as Error);
    }
  }

  // Enhanced OAuth URL generation
  async getOAuthUrl(request: OAuthRequest): Promise<string> {
    try {
      if (!['google', 'github', 'azure', 'slack'].includes(request.provider)) {
        throw createValidationError(
          'provider',
          request.provider,
          'Invalid OAuth provider. Supported providers: google, github, azure, slack'
        );
      }

      const { data, error } = await supabaseAnon.auth.signInWithOAuth({
        provider: request.provider as any,
        options: {
          redirectTo: request.redirectTo || `${process.env.FRONTEND_URL}/auth/callback`,
          ...(request.scopes && { scopes: request.scopes.join(' ') })
        },
      });

      if (error) {
        throw this.handleSupabaseError(error, 'OAuth URL generation');
      }

      if (!data.url) {
        throw new ExternalServiceError('Supabase', 'Failed to generate OAuth URL');
      }

      return data.url;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ExternalServiceError('Supabase', 'OAuth URL generation failed', error as Error);
    }
  }

  // Enhanced OAuth callback handling
  async handleOAuthCallback(code: string): Promise<AuthResponse> {
    try {
      if (!code || code.trim() === '') {
        throw createValidationError('code', code, 'OAuth authorization code is required');
      }

      const { data, error } = await supabaseAnon.auth.exchangeCodeForSession(code);

      if (error) {
        throw this.handleSupabaseError(error, 'OAuth callback');
      }

      if (!data.user || !data.session) {
        throw new AuthenticationError(
          'OAuth authentication failed: Invalid response',
          ErrorCode.AUTHENTICATION_ERROR
        );
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        },
        message: 'OAuth authentication successful'
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new ExternalServiceError('Supabase', 'OAuth callback failed', error as Error);
    }
  }

  // Enhanced logout with proper cleanup
  async logout(token: string): Promise<LogoutResult> {
    try {
      if (!token || token.trim() === '') {
        return {
          success: true,
          message: 'No active session to logout'
        };
      }

      const { error } = await supabaseAdmin.auth.admin.signOut(token);

      if (error && !error.message.includes('not found')) {
        throw this.handleSupabaseError(error, 'logout');
      }

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      throw new ExternalServiceError('Supabase', 'Logout failed', error as Error);
    }
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      if (!refreshToken || refreshToken.trim() === '') {
        throw createValidationError('refreshToken', refreshToken, 'Refresh token is required');
      }

      const { data, error } = await supabaseAnon.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        throw this.handleSupabaseError(error, 'token refresh');
      }

      if (!data.session) {
        throw new AuthenticationError(
          'Token refresh failed: No session returned',
          ErrorCode.TOKEN_EXPIRED
        );
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        },
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new ExternalServiceError('Supabase', 'Token refresh failed', error as Error);
    }
  }

  // Private helper methods
  private validateRegistrationInput(request: RegisterRequest): void {
    const errors: any[] = [];

    if (!request.email || !this.isValidEmail(request.email)) {
      errors.push({ field: 'email', message: 'Valid email is required' });
    }

    if (!request.password || request.password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
    }

    if (request.confirmPassword && request.password !== request.confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Registration validation failed', errors);
    }
  }

  private validateLoginInput(request: LoginRequest): void {
    const errors: any[] = [];

    if (!request.email || !this.isValidEmail(request.email)) {
      errors.push({ field: 'email', message: 'Valid email is required' });
    }

    if (!request.password || request.password.trim() === '') {
      errors.push({ field: 'password', message: 'Password is required' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Login validation failed', errors);
    }
  }

  private validateEmail(email: string): void {
    if (!email || !this.isValidEmail(email)) {
      throw createValidationError('email', email, 'Valid email is required');
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw createValidationError(
        'password',
        password,
        'Password must be at least 8 characters long'
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async checkUserExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      if (error) return false;

      // Since Supabase doesn't support email filtering directly in listUsers,
      // we'll do a simple check by trying to invite the user
      return data?.users?.some(user => user.email === email) || false;
    } catch {
      return false;
    }
  }

  private handleSupabaseError(error: any, operation: string): never {
    const message = error.message || 'Unknown error';

    if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
      throw new AuthenticationError(
        'Invalid email or password',
        ErrorCode.INVALID_CREDENTIALS
      );
    }

    if (message.includes('Email not confirmed')) {
      throw new AuthenticationError(
        'Please verify your email before logging in',
        ErrorCode.AUTHENTICATION_ERROR
      );
    }

    if (message.includes('User already registered')) {
      throw new BusinessLogicError(
        'A user with this email already exists',
        ErrorCode.RESOURCE_ALREADY_EXISTS,
        409
      );
    }

    if (message.includes('expired') || message.includes('JWT expired')) {
      throw new AuthenticationError(
        'Authentication token has expired',
        ErrorCode.TOKEN_EXPIRED
      );
    }

    if (message.includes('invalid') && message.includes('token')) {
      throw new AuthenticationError(
        'Invalid authentication token',
        ErrorCode.TOKEN_INVALID
      );
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      throw new BusinessLogicError(
        'Too many attempts. Please try again later',
        ErrorCode.RATE_LIMIT_EXCEEDED,
        429
      );
    }

    throw new ExternalServiceError('Supabase', `${operation} failed: ${message}`, error);
  }
}
