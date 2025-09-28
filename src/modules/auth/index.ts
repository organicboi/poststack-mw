import authController from './auth.controller';
import { AuthService } from './auth.service';
import { supabaseAdmin } from './supabase.client';

export { authController, AuthService, supabaseAdmin };

export default authController;
