
import { useState } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
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

export interface BadHabit {
  id: string;
  title: string;
  points: number;
}

interface BadHabitListProps {
  badHabits: BadHabit[];
  onAddBadHabit: (badHabit: BadHabit) => void;
  onTriggerBadHabit: (id: string) => void;
  onDeleteBadHabit: (id: string) => void;
}

const BadHabitList = ({ badHabits, onAddBadHabit, onTriggerBadHabit, onDeleteBadHabit }: BadHabitListProps) => {
  const [newBadHabitTitle, setNewBadHabitTitle] = useState('');
  const [badHabitPoints, setBadHabitPoints] = useState('10');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleAddBadHabit = () => {
    if (newBadHabitTitle.trim() === '') {
      toast.error('Please enter a bad habit title');
      return;
    }
    
    const newBadHabit: BadHabit = {
      id: Date.now().toString(),
      title: newBadHabitTitle,
      points: parseInt(badHabitPoints),
    };
    
    onAddBadHabit(newBadHabit);
    setNewBadHabitTitle('');
    setBadHabitPoints('10');
    setIsDialogOpen(false);
    toast.success('New bad habit added!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bad Habits</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Bad Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bad Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="badHabitTitle">Bad Habit Title</Label>
                <Input
                  id="badHabitTitle"
                  placeholder="Enter bad habit title..."
                  value={newBadHabitTitle}
                  onChange={(e) => setNewBadHabitTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="badHabitPoints">Points Lost</Label>
                <Select
                  value={badHabitPoints}
                  onValueChange={setBadHabitPoints}
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
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddBadHabit}>Add Bad Habit</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {badHabits.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>No bad habits tracked yet. Add some to monitor your progress!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {badHabits.map((badHabit) => (
            <Card key={badHabit.id} className="task-card border-destructive/20">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-destructive/10 p-1">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <span>{badHabit.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded-full">
                    -{badHabit.points} pts
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onTriggerBadHabit(badHabit.id);
                      toast.error(`Bad habit triggered: -${badHabit.points} points`);
                    }}
                    className="text-sm h-8 border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    I did this
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteBadHabit(badHabit.id)}
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

export default BadHabitList;
