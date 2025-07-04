
import { format, startOfMonth, getDaysInMonth, addDays, subDays, startOfDay } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CalendarDay from './CalendarDay';
import { DailyStreak } from '@/types/streak';

interface MonthViewProps {
  currentDate: Date;
  dailyStreaks: DailyStreak[];
  onPrevious: () => void;
  onNext: () => void;
  onCurrent: () => void;
  onDayClick: (day: Date) => void;
}

const MonthView = ({ currentDate, dailyStreaks, onPrevious, onNext, onCurrent, onDayClick }: MonthViewProps) => {
  const monthStart = startOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));

  // Get top 3 days and monthly totals
  const monthStreaks = monthDays.map(day => {
    const streak = dailyStreaks.find(s => {
      const streakDate = s.date instanceof Date ? s.date : new Date(s.date);
      return streakDate && streakDate.getTime() === day.getTime();
    });
    return { day, points: streak?.points || 0, tasksCompleted: streak?.tasksCompleted || 0 };
  });
  
  const topDays = [...monthStreaks].sort((a, b) => b.points - a.points).slice(0, 3);
  const totalMonthlyPoints = monthStreaks.reduce((sum, day) => sum + day.points, 0);
  const totalMonthlyTasks = monthStreaks.reduce((sum, day) => sum + day.tasksCompleted, 0);
  const avgPointsPerDay = totalMonthlyPoints / daysInMonth;
  
  // Calculate consistency based on last 30 days (not calendar month)
  const today = startOfDay(new Date());
  const thirtyDaysAgo = subDays(today, 29); // 29 days ago + today = 30 days total
  const last30Days = Array.from({ length: 30 }, (_, i) => addDays(thirtyDaysAgo, i));
  
  const last30DaysStreaks = last30Days.map(day => {
    const streak = dailyStreaks.find(s => {
      const streakDate = s.date instanceof Date ? startOfDay(s.date) : startOfDay(new Date(s.date));
      return streakDate && streakDate.getTime() === day.getTime();
    });
    return { day, points: streak?.points || 0 };
  });
  
  const activeDaysLast30 = last30DaysStreaks.filter(day => day.points > 0).length;
  const consistency = (activeDaysLast30 / 30) * 100;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onCurrent}>
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center text-xs font-medium py-1">{day}</div>
        ))}
        
        {Array.from({ length: (monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1) }).map((_, i) => (
          <div key={`empty-${i}`} className="p-1"></div>
        ))}
        
        {monthDays.map((day, i) => {
          const streak = dailyStreaks.find(s => {
            const streakDate = s.date instanceof Date ? s.date : new Date(s.date);
            return streakDate && streakDate.getTime() === day.getTime();
          });
          
          return (
            <CalendarDay
              key={i}
              day={day}
              streak={streak}
              isToday={day.getTime() === new Date().setHours(0, 0, 0, 0)}
              onClick={onDayClick}
              variant="month"
              showWeekDay={false}
            />
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

export default MonthView;
