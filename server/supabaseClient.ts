import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseUrl = (): string | undefined => {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
};

export const getSupabaseKey = (): string | undefined => {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY
  );
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return Boolean(url && key && url.startsWith('https://') && key.length > 20);
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (isSupabaseConfigured() && url && key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('[SUPABASE] Connected to cloud PostgreSQL database at:', url);
      return supabaseInstance;
    } catch (err) {
      console.warn('[SUPABASE] Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
};
