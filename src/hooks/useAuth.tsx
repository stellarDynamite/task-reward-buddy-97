
import { useState, useEffect } from 'react';
import { supabase, hasValidSupabaseCredentials } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Skip authentication if Supabase is not properly configured
    if (!hasValidSupabaseCredentials()) {
      setLoading(false);
      return;
    }
    
    // Get current session and user
    const getInitialSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setSession(session);
        setUser(session?.user || null);
      } catch (err) {
        console.error('Error getting initial session:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };
    
    getInitialSession();
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setSession(session);
          setUser(session?.user || null);
          setLoading(false);
        } catch (err) {
          console.error('Error in auth state change:', err);
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  return { user, session, loading, error };
}
