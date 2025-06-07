
import { useState } from 'react';
import { CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { validateTaskTitle, validatePoints } from '@/utils/validation';

export interface GoodHabit {
  id: string;
  title: string;
  points: number;
  completed: boolean;
}

interface GoodHabitListProps {
  goodHabits: GoodHabit[];
  onAddGoodHabit: (goodHabit: GoodHabit) => void;
  onCompleteGoodHabit: (id: string) => void;
  onDeleteGoodHabit: (id: string) => void;
}

const GoodHabitList = ({ goodHabits, onAddGoodHabit, onCompleteGoodHabit, onDeleteGoodHabit }: GoodHabitListProps) => {
  const [newGoodHabitTitle, setNewGoodHabitTitle] = useState('');
  const [goodHabitPoints, setGoodHabitPoints] = useState('10');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [titleError, setTitleError] = useState('');
  
  const handleAddGoodHabit = () => {
    // Validate title
    const titleValidation = validateTaskTitle(newGoodHabitTitle);
    if (!titleValidation.isValid) {
      setTitleError(titleValidation.message || '');
      return;
    }

    // Validate points
    const pointsValidation = validatePoints(goodHabitPoints);
    if (!pointsValidation.isValid) {
      toast.error(pointsValidation.message || 'Invalid points value');
      return;
    }
    
    const newGoodHabit: GoodHabit = {
      id: Date.now().toString(),
      title: titleValidation.sanitized || newGoodHabitTitle,
      points: pointsValidation.value || parseInt(goodHabitPoints),
      completed: false,
    };
    
    onAddGoodHabit(newGoodHabit);
    setNewGoodHabitTitle('');
    setGoodHabitPoints('10');
    setTitleError('');
    setIsDialogOpen(false);
    toast.success('New good habit added!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Good Habits</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Good Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Good Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="goodHabitTitle">Good Habit Title</Label>
                <Input
                  id="goodHabitTitle"
                  placeholder="Enter good habit title (max 100 characters)..."
                  value={newGoodHabitTitle}
                  onChange={(e) => {
                    setNewGoodHabitTitle(e.target.value);
                    setTitleError('');
                  }}
                  maxLength={100}
                  className={titleError ? "border-destructive" : ""}
                />
                {titleError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <CheckCircle className="h-4 w-4" />
                    {titleError}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goodHabitPoints">Points Earned</Label>
                <Select
                  value={goodHabitPoints}
                  onValueChange={setGoodHabitPoints}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select points" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 points</SelectItem>
                    <SelectItem value="10">10 points</SelectItem>
                    <SelectItem value="20">20 points</SelectItem>
                    <SelectItem value="50">50 points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setTitleError('');
                  setNewGoodHabitTitle('');
                }}>Cancel</Button>
                <Button onClick={handleAddGoodHabit}>Add Good Habit</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {goodHabits.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>No good habits tracked yet. Add some to build positive routines!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goodHabits.map((goodHabit) => (
            <Card key={goodHabit.id} className="task-card border-primary/20">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-1 ${goodHabit.completed ? 'bg-primary/20' : 'bg-primary/10'}`}>
                    <CheckCircle className={`h-4 w-4 ${goodHabit.completed ? 'text-primary' : 'text-primary/60'}`} />
                  </div>
                  <span className={`break-words max-w-[200px] ${goodHabit.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {goodHabit.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    +{goodHabit.points} pts
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onCompleteGoodHabit(goodHabit.id);
                      toast.success(`Good habit completed: +${goodHabit.points} points`);
                    }}
                    disabled={goodHabit.completed}
                    className="text-sm h-8 border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {goodHabit.completed ? 'Completed' : 'Mark Done'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteGoodHabit(goodHabit.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoodHabitList;
