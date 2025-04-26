
import { format, startOfWeek, addDays } from 'date-fns';
import { Award, Calendar, ChevronLeft, ChevronRight, Star, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CalendarDay from './CalendarDay';
import StatsCard from './StatsCard';
import { DailyStreak } from '@/types/streak';

interface WeekViewProps {
  currentDate: Date;
  dailyStreaks: DailyStreak[];
  onPrevious: () => void;
  onNext: () => void;
  onCurrent: () => void;
  onDayClick: (day: Date) => void;
}

const WeekView = ({ currentDate, dailyStreaks, onPrevious, onNext, onCurrent, onDayClick }: WeekViewProps) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get best day of the week
  const weekStreaks = weekDays.map(day => {
    const streak = dailyStreaks.find(s => {
      const streakDate = s.date instanceof Date ? s.date : new Date(s.date);
      return streakDate && streakDate.getTime() === day.getTime();
    });
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
      
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const streak = dailyStreaks.find(s => {
            const streakDate = s.date instanceof Date ? s.date : new Date(s.date);
            return streakDate && streakDate.getTime() === day.getTime();
          });
          
          return (
            <CalendarDay
              key={index}
              day={day}
              streak={streak}
              isToday={day.getTime() === new Date().setHours(0, 0, 0, 0)}
              onClick={onDayClick}
              variant="week"
            />
          );
        })}
      </div>
      
      <div className="grid grid-cols-3 gap-4 pt-2">
        <StatsCard
          icon={<Trophy className="h-5 w-5 text-primary" />}
          title="Best Day"
          value={bestDay.points > 0 ? format(bestDay.day, 'EEE') : 'None'}
          subtitle={`${bestDay.points} points`}
        />
        
        <StatsCard
          icon={<Star className="h-5 w-5 text-yellow-500" fill="currentColor" />}
          title="Weekly Total"
          value={totalWeeklyPoints}
          subtitle="points"
        />
        
        <StatsCard
          icon={<Award className="h-5 w-5 text-green-500" />}
          title="Tasks Done"
          value={totalWeeklyTasks}
          subtitle="completed"
        />
      </div>
    </div>
  );
};

export default WeekView;
