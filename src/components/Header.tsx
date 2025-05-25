
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, CheckCheck, Ban, Star, Info, Mail, Github, LogOut, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const navigate = useNavigate();

  // Info icon click handler
  const handleInfoClick = () => {
    if (user) {
      toast({
        title: "Progress Saved!",
        description: "Your progress is automatically saved to your account and synced across all devices.",
      });
    } else {
      toast({
        title: "Important!",
        description: (
          <span>
            If you clear your browser's cache/history, your progress will be reset.<br />
            <strong>To prevent this, please create an account!</strong>
          </span>
        ),
      });
    }
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You've been logged out successfully.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

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
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          ) : !user ? (
            <Button 
              onClick={handleLogin}
              className="flex items-center gap-1 bg-[#E5DEFF] hover:bg-[#d0c5ff] text-[#6E41E2] px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
              size="sm"
              variant="outline"
            >
              <User size={18} className="mr-1" />
              Sign In
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <Button
                onClick={handleLogout}
                className="flex items-center gap-1 bg-[#FFDEE2] hover:bg-[#ffc5cc] text-[#E54666] px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
                size="sm"
                variant="outline"
              >
                <LogOut size={18} className="mr-1" />
                Sign Out
              </Button>
            </div>
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
