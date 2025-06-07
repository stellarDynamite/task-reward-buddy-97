
import { Gamepad, Trophy, Zap, Target, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export type TabValue = 'dashboard' | 'tasks' | 'good-habits' | 'bad-habits' | 'rewards';

interface HeaderProps {
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
  points: number;
}

const Header = ({ activeTab, setActiveTab, points }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gamepad className="h-8 w-8 text-theme-purple" />
          <h1 className="text-3xl font-bold">Life Gamification</h1>
        </div>
        <div className="flex items-center gap-4">
          <Card>
            <CardContent className="flex items-center gap-2 p-3">
              <Trophy className="h-5 w-5 text-theme-purple" />
              <span className="font-semibold">{points} XP</span>
            </CardContent>
          </Card>
          {user && (
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTab === 'dashboard' ? 'default' : 'outline'}
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2"
        >
          <Gamepad className="h-4 w-4" />
          Dashboard
        </Button>
        <Button
          variant={activeTab === 'tasks' ? 'default' : 'outline'}
          onClick={() => setActiveTab('tasks')}
          className="flex items-center gap-2"
        >
          <Target className="h-4 w-4" />
          Tasks
        </Button>
        <Button
          variant={activeTab === 'good-habits' ? 'default' : 'outline'}
          onClick={() => setActiveTab('good-habits')}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Good Habits
        </Button>
        <Button
          variant={activeTab === 'bad-habits' ? 'default' : 'outline'}
          onClick={() => setActiveTab('bad-habits')}
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          Bad Habits
        </Button>
        <Button
          variant={activeTab === 'rewards' ? 'default' : 'outline'}
          onClick={() => setActiveTab('rewards')}
          className="flex items-center gap-2"
        >
          <Trophy className="h-4 w-4" />
          Rewards
        </Button>
      </div>
    </div>
  );
};

export default Header;
