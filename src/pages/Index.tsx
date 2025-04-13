
import { useState, useEffect } from 'react';
import { Task } from '@/components/TaskList';
import { BadHabit } from '@/components/BadHabitList';
import { Reward } from '@/components/RewardList';
import TaskList from '@/components/TaskList';
import BadHabitList from '@/components/BadHabitList';
import RewardList from '@/components/RewardList';
import Dashboard from '@/components/Dashboard';
import Header, { TabValue } from '@/components/Header';
import StreakCalendar from '@/components/StreakCalendar';
import { toast } from 'sonner';
import { format, startOfDay, isSameDay, parseISO } from 'date-fns';

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Complete project assignment', completed: false, points: 20 },
  { id: '2', title: 'Exercise for 30 minutes', completed: false, points: 10 },
];

const INITIAL_BAD_HABITS: BadHabit[] = [
  { id: '1', title: 'Procrastinating', points: 10 },
  { id: '2', title: 'Skipping meals', points: 20 },
];

const INITIAL_REWARDS: Reward[] = [
  { id: '1', title: 'Watch a movie', points: 50, claimed: false },
  { id: '2', title: 'Order takeout', points: 100, claimed: false },
  { id: '3', title: 'Buy a new book', points: 200, claimed: false },
];

// Define interface for daily streak data
interface DailyStreak {
  date: Date | string;
  points: number;
  tasksCompleted: number;
}

// Helper function to parse dates
const parseDates = <T extends { [key: string]: any }>(obj: T): T => {
  const result = { ...obj };
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (key === 'date' || key === 'deadline') {
      if (typeof value === 'string') {
        try {
          result[key] = parseISO(value);
        } catch (e) {
          console.error(`Error parsing date for key ${key}:`, e);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = parseDates(value);
    }
  });
  return result;
};

// Calculate points needed for each level
const getPointsNeededForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

// Calculate current level based on total points
const calculateLevel = (points: number): [number, number, number] => {
  let level = 1;
  let totalPointsNeeded = getPointsNeededForLevel(level);
  
  while (points >= totalPointsNeeded) {
    level++;
    totalPointsNeeded += getPointsNeededForLevel(level);
  }
  
  const previousLevelPoints = totalPointsNeeded - getPointsNeededForLevel(level);
  const pointsInCurrentLevel = points - previousLevelPoints;
  const pointsNeededForNextLevel = getPointsNeededForLevel(level);
  
  return [level, pointsInCurrentLevel, pointsNeededForNextLevel];
};

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [badHabits, setBadHabits] = useState<BadHabit[]>(INITIAL_BAD_HABITS);
  const [rewards, setRewards] = useState<Reward[]>(INITIAL_REWARDS);
  const [points, setPoints] = useState(50);
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');
  
  // Stats
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [badHabitsAvoided, setBadHabitsAvoided] = useState(0);
  const [rewardsClaimed, setRewardsClaimed] = useState(0);
  
  // Daily Streak tracking
  const [dailyStreaks, setDailyStreaks] = useState<DailyStreak[]>([]);
  const [todayPoints, setTodayPoints] = useState(0);
  const [todayTasksCompleted, setTodayTasksCompleted] = useState(0);
  
  // Calculate level information
  const [level, pointsToNextLevel, pointsNeededForNextLevel] = calculateLevel(points);
  
  // Load data from localStorage on initial render
  useEffect(() => {
    const savedTasks = localStorage.getItem('tasks');
    const savedBadHabits = localStorage.getItem('badHabits');
    const savedRewards = localStorage.getItem('rewards');
    const savedPoints = localStorage.getItem('points');
    const savedStats = localStorage.getItem('stats');
    const savedStreaks = localStorage.getItem('dailyStreaks');
    
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks.map((task: Task) => parseDates(task)));
      } catch (e) {
        console.error("Error parsing tasks:", e);
        setTasks(INITIAL_TASKS);
      }
    }
    
    if (savedBadHabits) setBadHabits(JSON.parse(savedBadHabits));
    if (savedRewards) setRewards(JSON.parse(savedRewards));
    if (savedPoints) setPoints(JSON.parse(savedPoints));
    
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setTasksCompleted(stats.tasksCompleted || 0);
      setBadHabitsAvoided(stats.badHabitsAvoided || 0);
      setRewardsClaimed(stats.rewardsClaimed || 0);
    }
    
    if (savedStreaks) {
      try {
        const parsedStreaks = JSON.parse(savedStreaks);
        const streaks = parsedStreaks.map((streak: any) => parseDates(streak));
        setDailyStreaks(streaks);
        
        // Find today's streak if it exists
        const today = startOfDay(new Date());
        const todayStreak = streaks.find((s: DailyStreak) => {
          const streakDate = s.date instanceof Date ? s.date : parseISO(s.date as string);
          return isSameDay(streakDate, today);
        });
        
        if (todayStreak) {
          setTodayPoints(todayStreak.points);
          setTodayTasksCompleted(todayStreak.tasksCompleted);
        }
      } catch (e) {
        console.error("Error parsing streaks:", e);
        setDailyStreaks([]);
      }
    }
  }, []);
  
  // Request notification permission on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('badHabits', JSON.stringify(badHabits));
    localStorage.setItem('rewards', JSON.stringify(rewards));
    localStorage.setItem('points', JSON.stringify(points));
    
    localStorage.setItem('stats', JSON.stringify({
      tasksCompleted,
      badHabitsAvoided,
      rewardsClaimed
    }));
    
    localStorage.setItem('dailyStreaks', JSON.stringify(dailyStreaks));
  }, [tasks, badHabits, rewards, points, tasksCompleted, badHabitsAvoided, rewardsClaimed, dailyStreaks]);
  
  // Update today's streak on points change
  useEffect(() => {
    const updateTodayStreak = () => {
      const today = startOfDay(new Date());
      const todayStreakIndex = dailyStreaks.findIndex(streak => isSameDay(new Date(streak.date), today));
      
      if (todayStreakIndex >= 0) {
        // Update existing streak for today
        const updatedStreaks = [...dailyStreaks];
        updatedStreaks[todayStreakIndex] = {
          date: today,
          points: todayPoints,
          tasksCompleted: todayTasksCompleted
        };
        setDailyStreaks(updatedStreaks);
      } else {
        // Create new streak for today
        setDailyStreaks([...dailyStreaks, {
          date: today,
          points: todayPoints,
          tasksCompleted: todayTasksCompleted
        }]);
      }
    };
    
    updateTodayStreak();
  }, [todayPoints, todayTasksCompleted]);
  
  // Check for level up
  useEffect(() => {
    const [newLevel] = calculateLevel(points);
    const prevLevel = localStorage.getItem('userLevel');
    
    if (prevLevel && parseInt(prevLevel) < newLevel) {
      toast.success(`Level Up! You've reached level ${newLevel}! 🎉`, {
        duration: 5000,
      });
    }
    
    localStorage.setItem('userLevel', newLevel.toString());
  }, [points]);
  
  // Task handlers
  const handleAddTask = (task: Task) => {
    setTasks([...tasks, task]);
  };
  
  const handleCompleteTask = (id: string) => {
    setTasks(tasks.map((task) => {
      if (task.id === id) {
        // Add points when task is completed
        setPoints((prev) => prev + task.points);
        // Increment completed tasks count
        setTasksCompleted((prev) => prev + 1);
        // Update today's streak
        setTodayPoints((prev) => prev + task.points);
        setTodayTasksCompleted((prev) => prev + 1);
        
        // Schedule deadline notification reminder if needed
        if (task.deadline) {
          // Clear any scheduled notifications for this task
          // (Implementation would depend on how you track scheduled notifications)
        }
        
        return { ...task, completed: true };
      }
      return task;
    }));
  };
  
  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };
  
  // Bad habit handlers
  const handleAddBadHabit = (badHabit: BadHabit) => {
    setBadHabits([...badHabits, badHabit]);
  };
  
  const handleTriggerBadHabit = (id: string) => {
    const badHabit = badHabits.find((habit) => habit.id === id);
    if (!badHabit) return;
    
    // Subtract points when bad habit is triggered
    setPoints((prev) => Math.max(0, prev - badHabit.points));
    
    // Update today's streak - reduce points for bad habits
    setTodayPoints((prev) => Math.max(0, prev - badHabit.points));
  };
  
  const handleDeleteBadHabit = (id: string) => {
    setBadHabits(badHabits.filter((habit) => habit.id !== id));
    // Increment avoided bad habits count
    setBadHabitsAvoided((prev) => prev + 1);
  };
  
  // Reward handlers
  const handleAddReward = (reward: Reward) => {
    setRewards([...rewards, reward]);
  };
  
  const handleClaimReward = (id: string) => {
    const reward = rewards.find((r) => r.id === id);
    if (!reward || points < reward.points) return;
    
    // Subtract points when reward is claimed
    setPoints((prev) => prev - reward.points);
    
    // Mark reward as claimed
    setRewards(rewards.map((r) => {
      if (r.id === id) {
        // Increment claimed rewards count
        setRewardsClaimed((prev) => prev + 1);
        return { ...r, claimed: true };
      }
      return r;
    }));
  };
  
  const handleDeleteReward = (id: string) => {
    setRewards(rewards.filter((reward) => reward.id !== id));
  };
  
  // Render appropriate component based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <Dashboard
              points={points}
              level={level}
              pointsToNextLevel={pointsToNextLevel}
              pointsNeededForNextLevel={pointsNeededForNextLevel}
              tasksCompleted={tasksCompleted}
              badHabitsAvoided={badHabitsAvoided}
              rewardsClaimed={rewardsClaimed}
            />
            <StreakCalendar dailyStreaks={dailyStreaks} />
          </div>
        );
      case 'tasks':
        return (
          <TaskList
            tasks={tasks}
            onAddTask={handleAddTask}
            onCompleteTask={handleCompleteTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case 'bad-habits':
        return (
          <BadHabitList
            badHabits={badHabits}
            onAddBadHabit={handleAddBadHabit}
            onTriggerBadHabit={handleTriggerBadHabit}
            onDeleteBadHabit={handleDeleteBadHabit}
          />
        );
      case 'rewards':
        return (
          <RewardList
            rewards={rewards}
            userPoints={points}
            onAddReward={handleAddReward}
            onClaimReward={handleClaimReward}
            onDeleteReward={handleDeleteReward}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        points={points}
      />
      <main>
        {renderTabContent()}
      </main>
    </div>
  );
};

export default Index;
