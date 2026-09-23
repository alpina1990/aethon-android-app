// Supabase configuration for the mobile app
// Values come from EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY,
// which Expo loads from .env automatically. See .env.example.

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// API base URL for Next.js API routes (if needed for server-side operations)
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://aethon-amber.vercel.app';
