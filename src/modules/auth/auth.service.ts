import { supabaseAdmin, supabaseAnon } from './supabase.client';
import { AuthResult, LogoutResult, PasswordResetResult } from './auth.types';
import { config } from '../../common/config';

export class AuthService {
  // Handle user registration
  async register(
    email: string,
    password: string,
    company: string
  ): Promise<AuthResult> {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Auto-confirm for simplicity
      user_metadata: { company },
    });

    if (error) {
      throw new Error(error.message);
    }

    // For registration, we'll return the user and let login handle the session
    return {
      user: data.user,
      message: 'User created successfully. Please log in.',
    };
  }

  // Handle user login
  async login(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Validate JWT token
  async validateToken(token: string) {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      throw new Error(error.message);
    }

    return user;
  }

  // Handle OAuth
  async getOAuthUrl(provider: string, redirectTo?: string) {
    const { data, error } = await supabaseAnon.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: redirectTo || `${config.frontend.url}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.url;
  }

  // Handle OAuth callback
  async handleOAuthCallback(code: string): Promise<AuthResult> {
    const { data, error } = await supabaseAnon.auth.exchangeCodeForSession(
      code
    );

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Password reset
  async resetPassword(email: string): Promise<PasswordResetResult> {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${config.frontend.url}/auth/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  // Handle logout
  async logout(token: string): Promise<LogoutResult> {
    const { error } = await supabaseAdmin.auth.admin.signOut(token);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }
}
