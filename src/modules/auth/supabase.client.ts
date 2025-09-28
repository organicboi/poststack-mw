import { createClient } from '@supabase/supabase-js';
import { config } from '../../common/config';

export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const supabaseAnon = createClient(
  config.supabase.url,
  config.supabase.anonKey
);
