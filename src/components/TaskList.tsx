import { useState } from 'react';
import { Check, Plus, Trash2, Clock, Calendar, Edit } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, setHours, setMinutes, parseISO, startOfDay, isSameDay, isToday, addHours, differenceInHours, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import CelebrationEffects from './CelebrationEffects';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  points: number;
  deadline?: Date | string;
}

interface TaskListProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onCompleteTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask?: (task: Task) => void;
}

const formatDeadline = (deadline?: Date | string): string => {
  if (!deadline) return '';
  
  const dateObj = deadline instanceof Date ? deadline : parseISO(deadline);
  
  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'h:mm a')}`;
  }
  return format(dateObj, 'MMM d, h:mm a');
};

const isDeadlineSoon = (deadline?: Date | string): boolean => {
  if (!deadline) return false;
  
  const dateObj = deadline instanceof Date ? deadline : parseISO(deadline);
  const hoursDiff = differenceInHours(dateObj, new Date());
  
  return hoursDiff > 0 && hoursDiff <= 24;
};

const isDeadlinePassed = (deadline?: Date | string): boolean => {
  if (!deadline) return false;
  
  const dateObj = deadline instanceof Date ? deadline : parseISO(deadline);
  return isPast(dateObj);
};

const TaskList = ({ 
  tasks, 
  onAddTask, 
  onCompleteTask, 
  onDeleteTask,
  onEditTask 
}: TaskListProps) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskPoints, setTaskPoints] = useState('10');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskDeadline, setTaskDeadline] = useState<Date | undefined>(undefined);
  const [deadlineHour, setDeadlineHour] = useState('12');
  const [deadlineMinute, setDeadlineMinute] = useState('00');
  const [deadlinePeriod, setDeadlinePeriod] = useState('PM');
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [showBalloons, setShowBalloons] = useState(false);
  const [showRainbow, setShowRainbow] = useState(false);
  
  const todayTasksCompletedCount = (() => {
    const today = startOfDay(new Date());
    try {
      const savedStreaks = localStorage.getItem('dailyStreaks');
      if (savedStreaks) {
        const streaks = JSON.parse(savedStreaks);
        const todayStreak = streaks.find((s: any) => {
          return s.date && (
            (s.date instanceof Date && isSameDay(s.date, today)) || 
            (typeof s.date === 'string' && isSameDay(parseISO(s.date), today))
          );
        });
        
        if (todayStreak) {
          return todayStreak.tasksCompleted || 0;
        }
      }
    } catch (e) {
      console.error("Error checking today's tasks:", e);
    }
    return 0;
  })();
  
  const ensureDate = (deadline?: Date | string): Date | undefined => {
    if (!deadline) return undefined;
    
    if (deadline instanceof Date) {
      return deadline;
    }
    
    try {
      if (typeof deadline === 'string') {
        return parseISO(deadline);
      }
      return undefined;
    } catch (error) {
      console.error("Error parsing date:", error);
      return undefined;
    }
  };
  
  const handleAddTask = () => {
    if (newTaskTitle.trim() === '') {
      toast.error('Please enter a task title');
      return;
    }
    
    let finalDeadline = taskDeadline;
    
    if (taskDeadline) {
      const hour = parseInt(deadlineHour);
      const minute = parseInt(deadlineMinute);
      
      const hour24 = deadlinePeriod === 'PM' && hour !== 12 
        ? hour + 12 
        : (deadlinePeriod === 'AM' && hour === 12 ? 0 : hour);
      
      finalDeadline = setMinutes(setHours(taskDeadline, hour24), minute);
    }
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
      points: parseInt(taskPoints),
      deadline: finalDeadline,
    };
    
    onAddTask(newTask);
    setNewTaskTitle('');
    setTaskPoints('10');
    setTaskDeadline(undefined);
    setDeadlineHour('12');
    setDeadlineMinute('00');
    setDeadlinePeriod('PM');
    setIsDialogOpen(false);
    
    if (finalDeadline) {
      scheduleNotification(newTaskTitle, finalDeadline);
      toast.success('New task added with deadline!');
    } else {
      toast.success('New task added!');
    }
  };

  const handleEditTask = () => {
    if (!editingTask) return;
    if (editingTask.title.trim() === '') {
      toast.error('Please enter a task title');
      return;
    }
    
    let finalDeadline = taskDeadline;
    
    if (taskDeadline) {
      const hour = parseInt(deadlineHour);
      const minute = parseInt(deadlineMinute);
      
      const hour24 = deadlinePeriod === 'PM' && hour !== 12 
        ? hour + 12 
        : (deadlinePeriod === 'AM' && hour === 12 ? 0 : hour);
      
      finalDeadline = setMinutes(setHours(taskDeadline, hour24), minute);
    }
    
    const updatedTask: Task = {
      ...editingTask,
      title: editingTask.title,
      points: editingTask.points,
      deadline: finalDeadline,
    };
    
    if (onEditTask) {
      onEditTask(updatedTask);
    }
    
    setIsEditDialogOpen(false);
    setEditingTask(null);
    setTaskDeadline(undefined);
    setDeadlineHour('12');
    setDeadlineMinute('00');
    setDeadlinePeriod('PM');
    
    toast.success('Task updated successfully!');
  };

  const startEditTask = (task: Task) => {
    setEditingTask(task);
    
    const dateObj = ensureDate(task.deadline);
    setTaskDeadline(dateObj);
    
    if (dateObj) {
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      
      setDeadlineHour(hour12.toString());
      setDeadlineMinute(minutes === 0 ? '00' : minutes.toString());
      setDeadlinePeriod(period);
    } else {
      setDeadlineHour('12');
      setDeadlineMinute('00');
      setDeadlinePeriod('PM');
    }
    
    setIsEditDialogOpen(true);
  };

  const handleClearAllCompleted = () => {
    const completedTasks = tasks.filter(task => task.completed);
    
    if (completedTasks.length === 0) {
      toast.error('No completed tasks to clear');
      return;
    }
    
    // Clear all completed tasks at once
    completedTasks.forEach(task => {
      onDeleteTask(task.id);
    });
    
    toast.success(`Cleared ${completedTasks.length} completed task${completedTasks.length === 1 ? '' : 's'}`);
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return { value: hour.toString(), label: hour.toString().padStart(2, '0') };
  });

  const minuteOptions = [
    { value: '00', label: '00' },
    { value: '15', label: '15' },
    { value: '30', label: '30' },
    { value: '45', label: '45' },
  ];

  const scheduleNotification = (title: string, deadline: Date) => {
    if (!(deadline instanceof Date)) return;
    
    const timeUntilDeadline = deadline.getTime() - Date.now();
    
    if (timeUntilDeadline > 0) {
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('Task Deadline Reminder', {
            body: `Reminder: "${title}" is due now!`,
            icon: '/favicon.ico'
          });
          toast.warning(`Reminder: "${title}" is due now!`, {
            duration: 10000,
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Task Deadline Reminder', {
                body: `Reminder: "${title}" is due now!`,
                icon: '/favicon.ico'
              });
            }
          });
          toast.warning(`Reminder: "${title}" is due now!`, {
            duration: 10000,
          });
        } else {
          toast.warning(`Reminder: "${title}" is due now!`, {
            duration: 10000,
          });
        }
      }, timeUntilDeadline);
    }
  };

  const handleCompleteTask = (id: string) => {
    onCompleteTask(id);
    const task = tasks.find(t => t.id === id);
    if (task) {
      toast.success(`Task completed! +${task.points} points`);
      
      setConfettiTrigger(prev => prev + 1);
      
      const newTaskCount = todayTasksCompletedCount + 1;
      
      if (newTaskCount >= 3) {
        setShowBalloons(true);
        
        if (newTaskCount >= 4) {
          setShowRainbow(true);
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <CelebrationEffects 
        confettiCount={confettiTrigger} 
        showBalloons={showBalloons} 
        showRainbow={showRainbow} 
      />
      
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
              
              <div className="space-y-2">
                <Label>Deadline</Label>
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !taskDeadline && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {taskDeadline ? format(taskDeadline, "PPP") : <span>Set a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={taskDeadline}
                        onSelect={setTaskDeadline}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {taskDeadline && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="hour">Hour</Label>
                        <Select value={deadlineHour} onValueChange={setDeadlineHour}>
                          <SelectTrigger id="hour">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {hourOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="minute">Minute</Label>
                        <Select value={deadlineMinute} onValueChange={setDeadlineMinute}>
                          <SelectTrigger id="minute">
                            <SelectValue placeholder="Minute" />
                          </SelectTrigger>
                          <SelectContent>
                            {minuteOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="period">AM/PM</Label>
                        <Select value={deadlinePeriod} onValueChange={setDeadlinePeriod}>
                          <SelectTrigger id="period">
                            <SelectValue placeholder="AM/PM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setNewTaskTitle('');
                  setTaskPoints('10');
                  setTaskDeadline(undefined);
                  setDeadlineHour('12');
                  setDeadlineMinute('00');
                  setDeadlinePeriod('PM');
                }}>
                  Cancel
                </Button>
                <Button onClick={() => handleAddTask()}>Add Task</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="editTaskTitle">Task Title</Label>
                <Input
                  id="editTaskTitle"
                  placeholder="Enter task title..."
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editTaskPoints">Points</Label>
                <Select
                  value={editingTask.points.toString()}
                  onValueChange={(value) => setEditingTask({...editingTask, points: parseInt(value)})}
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
              
              <div className="space-y-2">
                <Label>Deadline</Label>
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !taskDeadline && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {taskDeadline ? format(taskDeadline, "PPP") : <span>Set a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={taskDeadline}
                        onSelect={setTaskDeadline}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {taskDeadline && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="editHour">Hour</Label>
                        <Select value={deadlineHour} onValueChange={setDeadlineHour}>
                          <SelectTrigger id="editHour">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {hourOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="editMinute">Minute</Label>
                        <Select value={deadlineMinute} onValueChange={setDeadlineMinute}>
                          <SelectTrigger id="editMinute">
                            <SelectValue placeholder="Minute" />
                          </SelectTrigger>
                          <SelectContent>
                            {minuteOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="editPeriod">AM/PM</Label>
                        <Select value={deadlinePeriod} onValueChange={setDeadlinePeriod}>
                          <SelectTrigger id="editPeriod">
                            <SelectValue placeholder="AM/PM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingTask(null);
                  setTaskDeadline(undefined);
                }}>
                  Cancel
                </Button>
                <Button onClick={() => handleEditTask()}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {tasks.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>No tasks yet. Add some tasks to start earning points!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.filter(task => !task.completed).map((task) => (
            <Card 
              key={task.id} 
              className={`task-card ${task.completed ? 'bg-muted' : ''} 
                ${isDeadlineSoon(task.deadline) ? 'border-amber-500' : ''} 
                ${isDeadlinePassed(task.deadline) ? 'border-red-500' : ''}`}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => !task.completed && handleCompleteTask(task.id)}
                    className={task.completed ? 'bg-green-500' : ''}
                  />
                  <div className={`${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    <div>{task.title}</div>
                    {task.deadline && (
                      <div className={`text-xs flex items-center gap-1 mt-1 
                        ${isDeadlinePassed(task.deadline) ? 'text-red-500' : 
                          isDeadlineSoon(task.deadline) ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        <Clock className="h-3 w-3" />
                        Due: {formatDeadline(task.deadline)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-secondary text-xs font-medium rounded-full">
                    +{task.points} pts
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditTask(task)}
                    title="Edit task"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-muted-foreground">Completed Tasks</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllCompleted}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="space-y-2 opacity-70">
            {tasks.filter(task => task.completed).map((task) => (
              <Card key={task.id} className="bg-muted">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-sm bg-green-500 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <span className="line-through text-muted-foreground">{task.title}</span>
                      {task.deadline && (
                        <div className="text-xs flex items-center gap-1 mt-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Due: {formatDeadline(task.deadline)}
                        </div>
                      )}
                    </div>
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
