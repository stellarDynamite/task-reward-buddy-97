
import React from 'react';
import { CircleUser, Trophy, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DashboardProps {
  points: number;
  level: number;
  pointsToNextLevel: number;
  pointsNeededForNextLevel: number;
  tasksCompleted: number;
  badHabitsAvoided: number;
  rewardsClaimed: number;
}

const Dashboard = ({
  points,
  level,
  pointsToNextLevel,
  pointsNeededForNextLevel,
  tasksCompleted,
  badHabitsAvoided,
  rewardsClaimed,
}: DashboardProps) => {
  const progress = (pointsToNextLevel / pointsNeededForNextLevel) * 100;
  
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
            <span>{pointsToNextLevel} / {pointsNeededForNextLevel} points</span>
            <span>Next Level: {level + 1}</span>
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
            <div className="text-3xl font-bold">{tasksCompleted}</div>
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
            <div className="text-3xl font-bold">{badHabitsAvoided}</div>
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
