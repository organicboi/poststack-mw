import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from the package root to avoid cwd issues
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  server: {
    port: process.env.PORT || 3002,
    environment: process.env.NODE_ENV || 'development',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
  },
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:3000',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  serviceRole: {
    key: process.env.SERVICE_ROLE_KEY,
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};
