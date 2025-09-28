import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { AuthService } from './auth.service';
import { supabaseAdmin } from './supabase.client';

// Create default export for consistency with other modules
const authController = authRoutes;

export { authRoutes, AuthService, supabaseAdmin };

export default authController;
