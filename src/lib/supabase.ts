
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://pcqrdimdzuzpqbfzkzrn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcXJkaW1kenV6cHFiZnprenJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxODg1NTksImV4cCI6MjA2Mzc2NDU1OX0.RfZaPaEBeBLhOFq9UVgxuA9GcKEPTBG-lU8-YFgbo9I";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};
