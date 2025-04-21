
import { createClient } from '@supabase/supabase-js';

// Default values for local development (these will be overridden by real env vars when available)
const FALLBACK_URL = 'https://supabase.co';  // Using a real domain as fallback to avoid DNS errors
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key';

// Get Supabase URL and anonymous key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

// Log warning if using fallback values
if (supabaseUrl === FALLBACK_URL || supabaseAnonKey === FALLBACK_KEY) {
  console.warn(
    'Using fallback Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables or connect to Supabase via the Lovable integration.'
  );
}

// Initialize Supabase client with more robust error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

// Helper to check if we have valid Supabase credentials
export const hasValidSupabaseCredentials = () => {
  return supabaseUrl !== FALLBACK_URL && supabaseAnonKey !== FALLBACK_KEY;
};
