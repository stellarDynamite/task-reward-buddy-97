
import { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
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

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  points: number;
}

interface TaskListProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onCompleteTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

const TaskList = ({ tasks, onAddTask, onCompleteTask, onDeleteTask }: TaskListProps) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskPoints, setTaskPoints] = useState('10');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleAddTask = () => {
    if (newTaskTitle.trim() === '') {
      toast.error('Please enter a task title');
      return;
    }
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
      points: parseInt(taskPoints),
    };
    
    onAddTask(newTask);
    setNewTaskTitle('');
    setTaskPoints('10');
    setIsDialogOpen(false);
    toast.success('New task added!');
  };

  const handleCompleteTask = (id: string) => {
    onCompleteTask(id);
    const task = tasks.find(t => t.id === id);
    if (task) {
      toast.success(`Task completed! +${task.points} points`);
      
      // Create confetti effect
      for (let i = 0; i < 20; i++) {
        createConfetti();
      }
    }
  };
  
  const createConfetti = () => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-pink-500', 'bg-purple-500'];
    const confetti = document.createElement('div');
    confetti.classList.add('confetti', colors[Math.floor(Math.random() * colors.length)]);
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.animationDuration = Math.random() * 3 + 2 + 's';
    document.body.appendChild(confetti);
    
    setTimeout(() => {
      confetti.remove();
    }, 5000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Task Title</Label>
                <Input
                  id="taskTitle"
                  placeholder="Enter task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="taskPoints">Points</Label>
                <Select
                  value={taskPoints}
                  onValueChange={setTaskPoints}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select points" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 points - Easy</SelectItem>
                    <SelectItem value="10">10 points - Medium</SelectItem>
                    <SelectItem value="20">20 points - Hard</SelectItem>
                    <SelectItem value="50">50 points - Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddTask}>Add Task</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {tasks.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>No tasks yet. Add some tasks to start earning points!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.filter(task => !task.completed).map((task) => (
            <Card key={task.id} className={`task-card ${task.completed ? 'bg-muted' : ''}`}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => !task.completed && handleCompleteTask(task.id)}
                    className={task.completed ? 'bg-green-500' : ''}
                  />
                  <span className={`${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-secondary text-xs font-medium rounded-full">
                    +{task.points} pts
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteTask(task.id)}
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
      
      {tasks.some(task => task.completed) && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-muted-foreground mb-3">Completed Tasks</h3>
          <div className="space-y-2 opacity-70">
            {tasks.filter(task => task.completed).map((task) => (
              <Card key={task.id} className="bg-muted">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-sm bg-green-500 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="line-through text-muted-foreground">{task.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteTask(task.id)}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
