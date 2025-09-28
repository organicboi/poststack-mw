import { User, Session } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session?: Session | null;
  message?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User | null;
    session?: Session | null;
    accessToken?: string;
    refreshToken?: string;
  };
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface TokenValidationResult {
  isValid: boolean;
  user?: User;
  error?: {
    code: 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'TOKEN_MISSING' | 'UNKNOWN_ERROR';
    message: string;
    shouldRefresh?: boolean;
  };
}

export interface AuthUser extends User {
  role?: string;
  permissions?: string[];
  company?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  company?: string;
  firstName?: string;
  lastName?: string;
}

export interface PasswordResetRequest {
  email: string;
  redirectTo?: string;
}

export interface PasswordUpdateRequest {
  newPassword: string;
  accessToken: string;
}

export interface OAuthRequest {
  provider: 'google' | 'github' | 'azure' | 'slack';
  redirectTo?: string;
  scopes?: string[];
}

export interface OAuthResult {
  url: string;
}

export interface PasswordResetResult {
  success: boolean;
  message?: string;
}

export interface LogoutResult {
  success: boolean;
  message?: string;
}

export interface AuthConfig {
  jwtSecret?: string;
  tokenExpiry?: number;
  refreshTokenExpiry?: number;
  maxLoginAttempts?: number;
  lockoutDuration?: number;
}

export interface AuthContext {
  user?: AuthUser;
  session?: Session;
  isAuthenticated: boolean;
  permissions?: string[];
  role?: string;
}
