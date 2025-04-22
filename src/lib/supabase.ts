
import { createClient } from '@supabase/supabase-js';

// Default to empty strings if environment variables are not available
// This will prevent immediate crashes but the client won't work without proper values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase environment variables are properly configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase environment variables are missing. Make sure you have set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

// Create a mock Supabase client if no URL is provided
// This allows the app to load even without Supabase config
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabaseClient();

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Create a mock Supabase client that doesn't throw errors
function createMockSupabaseClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: async () => ({ error: new Error('Supabase not configured') }),
      signOut: async () => ({ error: null })
    }
  };
}
