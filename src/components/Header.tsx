
import { useState } from 'react';
import { Trophy, ClipboardCheck, AlertCircle, Gift, Menu, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-mobile';

export type TabValue = 'dashboard' | 'tasks' | 'bad-habits' | 'rewards';

interface HeaderProps {
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
  points: number;
  rewardPoints?: number;
}

const Header = ({ activeTab, setActiveTab, points, rewardPoints }: HeaderProps) => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const handleTabClick = (tab: TabValue) => {
    setActiveTab(tab);
    setSheetOpen(false);
  };
  
  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Trophy className="h-4 w-4" />,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      id: 'bad-habits',
      label: 'Bad Habits',
      icon: <AlertCircle className="h-4 w-4" />,
    },
    {
      id: 'rewards',
      label: 'Rewards',
      icon: <Gift className="h-4 w-4" />,
    },
  ];
  
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Level Up Life</h1>
        
        <div className="flex items-center gap-2">
          {/* Display XP/level points */}
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1 mr-2">
            <Star className="h-4 w-4" />
            <span className="font-medium">{points} XP</span>
          </div>
          
          {/* Display reward points if they exist and are different from XP */}
          {rewardPoints !== undefined && rewardPoints !== points && (
            <div className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full flex items-center gap-1 mr-2">
              <Gift className="h-4 w-4" />
              <span className="font-medium">{rewardPoints}</span>
            </div>
          )}
          
          {isMobile && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-1">
                  {tabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id as TabValue ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => handleTabClick(tab.id as TabValue)}
                    >
                      {tab.icon}
                      <span className="ml-2">{tab.label}</span>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
      
      {!isMobile && (
        <nav className="mt-6">
          <div className="flex space-x-1 border-b">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={cn(
                  'rounded-none border-b-2 border-transparent',
                  activeTab === tab.id as TabValue && 'border-primary text-primary'
                )}
                onClick={() => setActiveTab(tab.id as TabValue)}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </Button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
