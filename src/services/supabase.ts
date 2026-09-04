import { createClient } from '@supabase/supabase-js';

// Fallback to staging project provided by user if not specified in environment
const DEFAULT_SUPABASE_URL = 'https://sxeuswrawrzsxiqczzgx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZXVzd3Jhd3J6c3hpcWN6emd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzQyMjYsImV4cCI6MjEwNDExMDIyNn0.kPHN8l6yJjktWWY3YVKN8sBYggLgexmd3AY4w_zJLck';

export const SUPABASE_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
