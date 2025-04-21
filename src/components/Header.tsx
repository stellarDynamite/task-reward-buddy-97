
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, CheckCheck, Ban, Star, Info, Mail, Github } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export type TabValue = 'dashboard' | 'tasks' | 'bad-habits' | 'rewards';

interface HeaderProps {
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
  points: number;
}

const Header = ({ activeTab, setActiveTab, points }: HeaderProps) => {
  // Info icon click handler
  const handleInfoClick = () => {
    toast({
      title: "Important!",
      description: (
        <span>
          If you clear your browser's cache/history, your progress will be reset.<br />
          <strong>To prevent this, please link your email or GitHub account!</strong>
        </span>
      ),
    });
  };

  // Email/GitHub button click handlers
  const handleEmailClick = () => {
    toast({
      title: "Coming soon!",
      description: (
        <span>
          Linking your email will let you save your progress even if your browser data is cleared.<br />
          Feature coming soon!
        </span>
      ),
    });
  };

  const handleGithubClick = () => {
    toast({
      title: "Coming soon!",
      description: (
        <span>
          Linking your GitHub will let you save your progress even if your browser data is cleared.<br />
          Feature coming soon!
        </span>
      ),
    });
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
          <button
            onClick={handleEmailClick}
            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
            aria-label="Link Email"
          >
            <Mail size={18} className="mr-1" />
            Link Email
          </button>
          <button
            onClick={handleGithubClick}
            className="flex items-center gap-1 bg-[#333333] hover:bg-[#24292e] text-white px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ml-2"
            aria-label="Link GitHub"
          >
            <Github size={18} className="mr-1" />
            Link GitHub
          </button>
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
