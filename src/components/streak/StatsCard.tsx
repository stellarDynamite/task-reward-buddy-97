
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

const StatsCard = ({ icon, title, value, subtitle, className = '' }: StatsCardProps) => {
  return (
    <Card className={`bg-primary/5 ${className}`}>
      <CardContent className="p-4 flex flex-col items-center">
        <div className="mb-2">{icon}</div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-lg font-bold">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
