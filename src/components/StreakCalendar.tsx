
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Star, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DailyStreak } from '@/types/streak';
import WeekView from './streak/WeekView';
import MonthView from './streak/MonthView';

interface StreakCalendarProps {
  dailyStreaks: DailyStreak[];
}

const StreakCalendar = ({ dailyStreaks }: StreakCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedDay, setSelectedDay] = useState<DailyStreak | null>(null);

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

  const goToCurrent = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (day: Date) => {
    const streak = dailyStreaks.find(s => {
      const streakDate = s.date instanceof Date ? s.date : new Date(s.date);
      return streakDate && streakDate.getTime() === day.getTime();
    });
    if (streak) {
      setSelectedDay(streak);
    }
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
            <WeekView
              currentDate={currentDate}
              dailyStreaks={dailyStreaks}
              onPrevious={goToPrevious}
              onNext={goToNext}
              onCurrent={goToCurrent}
              onDayClick={handleDayClick}
            />
          </TabsContent>
          <TabsContent value="monthly" className="mt-0">
            <MonthView
              currentDate={currentDate}
              dailyStreaks={dailyStreaks}
              onPrevious={goToPrevious}
              onNext={goToNext}
              onCurrent={goToCurrent}
              onDayClick={handleDayClick}
            />
          </TabsContent>
        </Tabs>

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
