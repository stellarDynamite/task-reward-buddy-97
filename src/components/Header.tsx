
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, CheckCheck, Ban, Star, Info, Mail, Github, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase, hasValidSupabaseCredentials } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export type TabValue = 'dashboard' | 'tasks' | 'bad-habits' | 'rewards';

interface HeaderProps {
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
  points: number;
}

const Header = ({ activeTab, setActiveTab, points }: HeaderProps) => {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Info icon click handler
  const handleInfoClick = () => {
    toast({
      title: "Important!",
      description: (
        <span>
          If you clear your browser's cache/history, your progress will be reset.<br />
          <strong>To prevent this, please link your Google or Discord account!</strong>
        </span>
      ),
    });
  };

  // Auth button click handlers
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      
      if (!hasValidSupabaseCredentials()) {
        toast({
          title: "Supabase Configuration Required",
          description: "Please connect to Supabase via the Lovable integration using the green Supabase button on the top right.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setAuthError(error instanceof Error ? error.message : 'Failed to sign in with Google');
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to sign in with Google. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      
      if (!hasValidSupabaseCredentials()) {
        toast({
          title: "Supabase Configuration Required",
          description: "Please connect to Supabase via the Lovable integration using the green Supabase button on the top right.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Discord:', error);
      setAuthError(error instanceof Error ? error.message : 'Failed to sign in with Discord');
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to sign in with Discord. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setAuthError('Failed to sign out');
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to show toast if there's an auth error
  useEffect(() => {
    if (authError) {
      toast({
        title: "Authentication Error",
        description: authError,
        variant: "destructive"
      });
    }
  }, [authError]);

  return (
    <header className="w-full mb-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 relative">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-theme-purple to-theme-purple-light bg-clip-text text-transparent">
          Task Reward Buddy
        </h1>
        <div className="flex items-center gap-2 absolute right-0 top-0 md:static md:mr-0 md:top-auto">
          <button
            aria-label="Important info"
            onClick={handleInfoClick}
            className="hover:bg-theme-purple/10 p-1 rounded-full transition-colors focus:outline-none"
            style={{ marginRight: 8 }}
          >
            <Info size={22} className="text-theme-purple" />
          </button>
          
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : !user ? (
            <>
              <Button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                type="button"
                className="flex items-center gap-1 bg-[#E5DEFF] hover:bg-[#d0c5ff] text-[#6E41E2] px-3 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer"
                size="sm"
                variant="outline"
              >
                <Mail size={18} className="mr-1" />
                {!hasValidSupabaseCredentials() ? 'Configure Supabase' : 'Sign in with Google'}
              </Button>
              <Button
                onClick={handleDiscordLogin}
                disabled={isLoading}
                type="button"
                className="flex items-center gap-1 bg-[#D3E4FD] hover:bg-[#b9d4f8] text-[#3E63DD] px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ml-2 cursor-pointer"
                size="sm"
                variant="outline"
              >
                <Github size={18} className="mr-1" />
                {!hasValidSupabaseCredentials() ? 'Configure Supabase' : 'Sign in with Discord'}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleLogout}
              disabled={isLoading}
              type="button"
              className="flex items-center gap-1 bg-[#FFDEE2] hover:bg-[#ffc5cc] text-[#E54666] px-3 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer"
              size="sm"
              variant="outline"
            >
              <LogOut size={18} className="mr-1" />
              Sign Out
            </Button>
          )}
        </div>
        <div className="bg-gradient-to-r from-theme-purple to-theme-purple-light text-white px-4 py-2 rounded-full font-medium flex items-center md:ml-auto md:static absolute top-12 right-0 md:top-auto md:right-auto">
          <Star className="mr-2 h-4 w-4" fill="currentColor" />
          <span>{points} Points</span>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="bad-habits" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            <span className="hidden sm:inline">Bad Habits</span>
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Rewards</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </header>
  );
};

export default Header;
