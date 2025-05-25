
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface UserProgressData {
  points: number;
  level: number;
  tasks: any[];
  bad_habits: any[];
  rewards: any[];
  daily_xp_earned: number;
}

export function useUserProgress() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load user progress from Supabase
  const loadProgress = async (): Promise<UserProgressData | null> => {
    if (!user) return null;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error loading progress:', error);
        return null;
      }

      if (!data) return null;

      // Convert Json types to arrays and ensure proper structure
      return {
        points: data.points || 0,
        level: data.level || 1,
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        bad_habits: Array.isArray(data.bad_habits) ? data.bad_habits : [],
        rewards: Array.isArray(data.rewards) ? data.rewards : [],
        daily_xp_earned: data.daily_xp_earned || 0
      };
    } catch (error) {
      console.error('Error loading progress:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Save user progress to Supabase
  const saveProgress = async (progressData: Partial<UserProgressData>) => {
    if (!user || syncing) return;

    try {
      setSyncing(true);
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          ...progressData,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving progress:', error);
        toast({
          title: "Sync Error",
          description: "Failed to save progress to cloud. Your local progress is still safe.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setSyncing(false);
    }
  };

  return {
    user,
    loading: authLoading || loading,
    syncing,
    loadProgress,
    saveProgress
  };
}
