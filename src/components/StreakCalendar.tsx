import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfWeek, addDays, startOfMonth, getDaysInMonth, isSameDay, parseISO } from 'date-fns';
import { Award, Calendar, ChevronLeft, ChevronRight, Star, Trophy, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface DailyStreak {
  date: Date | string;
  points: number;
  tasksCompleted: number;
}

interface StreakCalendarProps {
  dailyStreaks: DailyStreak[];
}

const StreakCalendar = ({ dailyStreaks }: StreakCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedDay, setSelectedDay] = useState<DailyStreak | null>(null);

  // Helper function to safely compare dates regardless of type
  const compareDate = (streakDate: Date | string, targetDate: Date): boolean => {
    if (!streakDate) return false;
    const dateObj = streakDate instanceof Date ? streakDate : parseISO(streakDate as string);
    return isSameDay(dateObj, targetDate);
  };

  // Helper function to find streak for a specific day
  const findStreakForDay = (day: Date): DailyStreak | undefined => {
    return dailyStreaks.find(streak => compareDate(streak.date, day));
  };

  // Navigate to previous week/month
  const goToPrevious = () => {
    if (view === 'weekly') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(currentDate.getMonth() - 1);
      setCurrentDate(prevMonth);
    }
  };

  // Navigate to next week/month
  const goToNext = () => {
    if (view === 'weekly') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(currentDate.getMonth() + 1);
      setCurrentDate(nextMonth);
    }
  };

  // Reset to current date
  const goToCurrent = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (day: Date) => {
    const streak = findStreakForDay(day);
    if (streak) {
      setSelectedDay(streak);
    }
  };

  // Calculate weekly stats
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday as first day
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Get best day of the week
    const weekStreaks = weekDays.map(day => {
      const streak = findStreakForDay(day);
      return { day, points: streak?.points || 0, tasksCompleted: streak?.tasksCompleted || 0 };
    });
    
    const bestDay = [...weekStreaks].sort((a, b) => b.points - a.points)[0];
    const totalWeeklyPoints = weekStreaks.reduce((sum, day) => sum + day.points, 0);
    const totalWeeklyTasks = weekStreaks.reduce((sum, day) => sum + day.tasksCompleted, 0);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">
            Week of {format(weekStart, 'MMM d, yyyy')}
          </h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToCurrent}>
              <Calendar className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const streak = findStreakForDay(day);
            const hasStreak = streak !== undefined;
            const isToday = isSameDay(day, new Date());
            
            return (
              <button 
                key={index}
                onClick={() => handleDayClick(day)}
                className={`
                  flex flex-col items-center p-3 rounded-md border transition-colors
                  ${hasStreak ? 'bg-primary/10 border-primary/30 hover:bg-primary/20' : 'bg-background border-muted hover:bg-muted/10'}
                  ${isToday ? 'ring-2 ring-primary/50' : ''}
                `}
              >
                <div className="text-xs font-medium">{format(day, 'EEE')}</div>
                <div className={`text-xs ${isToday ? 'font-bold' : ''}`}>{format(day, 'd')}</div>
                {hasStreak ? (
                  <>
                    <div className="mt-1 text-sm font-bold">{streak.points}</div>
                    <div className="flex">
                      {Array.from({ length: Math.min(3, Math.ceil(streak.points / 10)) }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-yellow-500" fill="currentColor" />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">0</div>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-2">
          <Card className="bg-primary/5">
            <CardContent className="p-4 flex flex-col items-center">
              <Trophy className="h-5 w-5 text-primary mb-2" />
              <div className="text-sm font-medium">Best Day</div>
              <div className="text-lg font-bold">{bestDay.points > 0 ? format(bestDay.day, 'EEE') : 'None'}</div>
              <div className="text-xs text-muted-foreground">{bestDay.points} points</div>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5">
            <CardContent className="p-4 flex flex-col items-center">
              <Star className="h-5 w-5 text-yellow-500 mb-2" fill="currentColor" />
              <div className="text-sm font-medium">Weekly Total</div>
              <div className="text-lg font-bold">{totalWeeklyPoints}</div>
              <div className="text-xs text-muted-foreground">points</div>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5">
            <CardContent className="p-4 flex flex-col items-center">
              <Award className="h-5 w-5 text-green-500 mb-2" />
              <div className="text-sm font-medium">Tasks Done</div>
              <div className="text-lg font-bold">{totalWeeklyTasks}</div>
              <div className="text-xs text-muted-foreground">completed</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Calculate monthly stats
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const daysInMonth = getDaysInMonth(currentDate);
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));

    // Get top 3 days and monthly totals
    const monthStreaks = monthDays.map(day => {
      const streak = findStreakForDay(day);
      return { day, points: streak?.points || 0, tasksCompleted: streak?.tasksCompleted || 0 };
    });
    
    const topDays = [...monthStreaks].sort((a, b) => b.points - a.points).slice(0, 3);
    const totalMonthlyPoints = monthStreaks.reduce((sum, day) => sum + day.points, 0);
    const totalMonthlyTasks = monthStreaks.reduce((sum, day) => sum + day.tasksCompleted, 0);
    const avgPointsPerDay = totalMonthlyPoints / daysInMonth;
    
    // Calculate consistency (days with > 0 points / total days)
    const activeDays = monthStreaks.filter(day => day.points > 0).length;
    const consistency = (activeDays / daysInMonth) * 100;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToCurrent}>
              <Calendar className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-xs font-medium py-1">{day}</div>
          ))}
          
          {/* Empty cells for days before month starts */}
          {Array.from({ length: (monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1) }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1"></div>
          ))}
          
          {/* Month days */}
          {monthDays.map((day, i) => {
            const streak = findStreakForDay(day);
            const hasStreak = streak !== undefined;
            const isToday = isSameDay(day, new Date());
            const intensity = hasStreak ? Math.min(100, streak.points * 2) : 0;
            
            return (
              <button
                key={i}
                onClick={() => handleDayClick(day)}
                className={`
                  p-1 aspect-square flex flex-col items-center justify-center rounded-md border text-xs transition-colors
                  ${hasStreak ? `bg-primary/10 border-primary/30 hover:bg-primary/20` : 'bg-background border-muted hover:bg-muted/10'}
                  ${isToday ? 'ring-2 ring-primary/50' : ''}
                `}
                style={{ 
                  opacity: hasStreak ? Math.max(0.5, Math.min(1, streak.points / 50)) : 0.5
                }}
              >
                <div>{format(day, 'd')}</div>
                {hasStreak && <div className="font-bold">{streak.points}</div>}
              </button>
            );
          })}
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Card className="bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top 3 Days</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {topDays.map((day, i) => (
                  day.points > 0 ? (
                    <li key={i} className="flex justify-between items-center text-sm">
                      <span>{format(day.day, 'MMM d')}</span>
                      <span className="font-bold">{day.points} pts</span>
                    </li>
                  ) : null
                ))}
                {topDays.filter(d => d.points > 0).length === 0 && (
                  <li className="text-sm text-muted-foreground">No activity yet</li>
                )}
              </ul>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Stats</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                <li className="flex justify-between items-center text-sm">
                  <span>Total Points</span>
                  <span className="font-bold">{totalMonthlyPoints}</span>
                </li>
                <li className="flex justify-between items-center text-sm">
                  <span>Tasks Completed</span>
                  <span className="font-bold">{totalMonthlyTasks}</span>
                </li>
                <li className="flex justify-between items-center text-sm">
                  <span>Avg. Per Day</span>
                  <span className="font-bold">{avgPointsPerDay.toFixed(1)}</span>
                </li>
                <li className="flex justify-between items-center text-sm">
                  <span>Consistency</span>
                  <span className="font-bold">{consistency.toFixed(0)}%</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
          Streak Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as 'weekly' | 'monthly')} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly" className="mt-0">
            {renderWeekView()}
          </TabsContent>
          <TabsContent value="monthly" className="mt-0">
            {renderMonthView()}
          </TabsContent>
        </Tabs>

        {/* Day Details Dialog */}
        <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedDay ? format(
                  selectedDay.date instanceof Date ? selectedDay.date : parseISO(selectedDay.date as string),
                  'MMMM d, yyyy'
                ) : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                <span className="font-medium">XP Earned:</span>
                <span>{selectedDay?.points || 0} points</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">Tasks Completed:</span>
                <span>{selectedDay?.tasksCompleted || 0} tasks</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default StreakCalendar;
