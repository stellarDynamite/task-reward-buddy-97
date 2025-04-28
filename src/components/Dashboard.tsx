
import React from 'react';
import { CircleUser, Trophy, Star, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface DashboardProps {
  points: number;
  level: number;
  pointsToNextLevel: number;
  pointsNeededForNextLevel: number;
  tasksCompleted: number;
  totalTasks: number;
  badHabitsAvoided: number;
  totalBadHabits: number;
  rewardsClaimed: number;
}

const Dashboard = ({
  points,
  level,
  pointsToNextLevel,
  pointsNeededForNextLevel,
  tasksCompleted,
  totalTasks,
  badHabitsAvoided,
  totalBadHabits,
  rewardsClaimed,
}: DashboardProps) => {
  // Store the highest points value seen to ensure progress never decreases
  const [highestPointsToNextLevel, setHighestPointsToNextLevel] = React.useState(pointsToNextLevel);
  
  React.useEffect(() => {
    if (pointsToNextLevel > highestPointsToNextLevel) {
      setHighestPointsToNextLevel(pointsToNextLevel);
    }
  }, [pointsToNextLevel, highestPointsToNextLevel]);
  
  // Calculate progress using the highest value, so it never decreases
  const displayPointsToNextLevel = Math.max(highestPointsToNextLevel, pointsToNextLevel);
  const progress = (displayPointsToNextLevel / pointsNeededForNextLevel) * 100;
  
  // Get daily XP limit info from localStorage
  const dailyXPEarned = Number(localStorage.getItem('dailyXPEarned') || '0');
  const MAX_DAILY_XP = 400; // Should match the constant in Index.tsx
  const dailyXPProgress = Math.min((dailyXPEarned / MAX_DAILY_XP) * 100, 100);
  
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-theme-purple-light to-theme-purple border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <CircleUser className="h-6 w-6" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="text-white">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-2xl font-bold">Level {level}</h3>
            <div className="text-2xl font-bold">{points} pts</div>
          </div>
          <Progress value={progress} className="h-3 bg-white/20" />
          <div className="text-xs mt-1 text-white/80 flex justify-between">
            <span>{displayPointsToNextLevel} / {pointsNeededForNextLevel} points</span>
            <div className="flex items-center gap-1">
              <span>Next Level: {level + 1}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Max 3 levels per day</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Daily XP Limit Progress */}
          <div className="mt-4">
            <div className="flex justify-between items-center text-xs text-white/80 mb-1">
              <span>Daily XP: {dailyXPEarned} / {MAX_DAILY_XP}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum XP per day: {MAX_DAILY_XP}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Progress 
              value={dailyXPProgress} 
              className={cn("h-2 bg-white/20", dailyXPEarned >= MAX_DAILY_XP ? "bg-amber-400" : "")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-theme-green-soft">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              Tasks Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasksCompleted} / {totalTasks}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-theme-yellow-soft">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              Bad Habits Avoided
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{badHabitsAvoided} / {totalBadHabits}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-theme-orange-soft">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Rewards Claimed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rewardsClaimed}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
