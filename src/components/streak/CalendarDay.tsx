
import { format, isSameDay } from 'date-fns';
import { Star } from 'lucide-react';
import { DailyStreak } from '@/types/streak';

interface CalendarDayProps {
  day: Date;
  streak?: DailyStreak;
  isToday: boolean;
  showWeekDay?: boolean;
  onClick: (day: Date) => void;
  variant?: 'week' | 'month';
}

const CalendarDay = ({ day, streak, isToday, showWeekDay = true, onClick, variant = 'week' }: CalendarDayProps) => {
  const hasStreak = streak !== undefined;

  if (variant === 'week') {
    return (
      <button 
        onClick={() => onClick(day)}
        className={`
          flex flex-col items-center p-3 rounded-md border transition-colors cursor-pointer
          hover:ring-2 hover:ring-primary/50
          ${hasStreak ? 'bg-primary/10 border-primary/30 hover:bg-primary/20' : 'bg-background border-muted hover:bg-muted/10'}
          ${isToday ? 'ring-2 ring-primary/50' : ''}
        `}
        title={`Click to view details for ${format(day, 'MMM d, yyyy')}`}
      >
        {showWeekDay && <div className="text-xs font-medium">{format(day, 'EEE')}</div>}
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
  }

  return (
    <button
      onClick={() => onClick(day)}
      className={`
        p-1 aspect-square flex flex-col items-center justify-center rounded-md border text-xs 
        transition-colors cursor-pointer hover:ring-2 hover:ring-primary/30
        ${hasStreak ? `bg-primary/10 border-primary/30 hover:bg-primary/20` : 'bg-background border-muted hover:bg-muted/10'}
        ${isToday ? 'ring-2 ring-primary/50' : ''}
      `}
      style={{ 
        opacity: hasStreak ? Math.max(0.5, Math.min(1, streak.points / 50)) : 0.5
      }}
      title={`Click to view details for ${format(day, 'MMM d, yyyy')}`}
    >
      <div>{format(day, 'd')}</div>
      {hasStreak && <div className="font-bold">{streak.points}</div>}
    </button>
  );
};

export default CalendarDay;
