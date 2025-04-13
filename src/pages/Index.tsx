
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

// Constants for game balance
const MAX_DAILY_LEVELS = 3;
const MAX_DAILY_XP = 400;

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
export interface DailyStreak {
  date: Date;
  points: number;
  tasksCompleted: number;
}

// Helper function to parse dates
const parseDates = <T extends { [key: string]: any }>(obj: T): T => {
  const result = { ...obj } as T;
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (key === 'date' || key === 'deadline') {
      if (typeof value === 'string') {
        try {
          result[key as keyof T] = parseISO(value) as unknown as T[keyof T];
        } catch (e) {
          console.error(`Error parsing date for key ${key}:`, e);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key as keyof T] = parseDates(value) as T[keyof T];
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
  
  // Game balance tracking - add these new state variables
  const [startOfDayLevel, setStartOfDayLevel] = useState(1);
  const [dailyXPEarned, setDailyXPEarned] = useState(0);
  
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
    const savedStartOfDayLevel = localStorage.getItem('startOfDayLevel');
    const savedDailyXPEarned = localStorage.getItem('dailyXPEarned');
    const lastLoginDate = localStorage.getItem('lastLoginDate');
    
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
          return s.date instanceof Date && isSameDay(s.date, today);
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
    
    // Check if this is a new day and reset daily limits if needed
    const today = startOfDay(new Date()).toISOString();
    if (lastLoginDate !== today) {
      // It's a new day, reset daily limits
      const currentLevel = calculateLevel(savedPoints ? JSON.parse(savedPoints) : 50)[0];
      setStartOfDayLevel(currentLevel);
      setDailyXPEarned(0);
      
      // Update last login date
      localStorage.setItem('lastLoginDate', today);
    } else {
      // Same day, load saved limits
      if (savedStartOfDayLevel) setStartOfDayLevel(JSON.parse(savedStartOfDayLevel));
      if (savedDailyXPEarned) setDailyXPEarned(JSON.parse(savedDailyXPEarned));
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
    
    // Save game balance tracking
    localStorage.setItem('startOfDayLevel', JSON.stringify(startOfDayLevel));
    localStorage.setItem('dailyXPEarned', JSON.stringify(dailyXPEarned));
  }, [tasks, badHabits, rewards, points, tasksCompleted, badHabitsAvoided, rewardsClaimed, dailyStreaks, startOfDayLevel, dailyXPEarned]);
  
  // Update today's streak on points change
  useEffect(() => {
    const updateTodayStreak = () => {
      const today = startOfDay(new Date());
      const todayStreakIndex = dailyStreaks.findIndex(streak => 
        streak.date instanceof Date && isSameDay(streak.date, today)
      );
      
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
      // Check if we've exceeded max daily levels
      if (newLevel - startOfDayLevel > MAX_DAILY_LEVELS) {
        toast.warning(`You've reached the daily level limit (${MAX_DAILY_LEVELS} levels per day)`, {
          duration: 5000,
        });
        
        // Calculate the max points allowed for today's level limit
        let maxPointsForLevel = 0;
        let tempLevel = startOfDayLevel;
        for (let i = 0; i < MAX_DAILY_LEVELS; i++) {
          maxPointsForLevel += getPointsNeededForLevel(tempLevel);
          tempLevel++;
        }
        
        // Adjust points to not exceed max level
        const prevLevelPoints = JSON.parse(prevLevel || '1');
        setPoints(maxPointsForLevel);
      } else {
        toast.success(`Level Up! You've reached level ${newLevel}! 🎉`, {
          duration: 5000,
        });
      }
    }
    
    localStorage.setItem('userLevel', newLevel.toString());
  }, [points, startOfDayLevel]);
  
  // Function to add points with daily XP limit
  const addPoints = (pointsToAdd: number) => {
    // Calculate how much XP we can still add today
    const remainingDailyXP = MAX_DAILY_XP - dailyXPEarned;
    
    if (remainingDailyXP <= 0) {
      // Already reached daily XP limit
      toast.warning(`You've reached the daily XP limit (${MAX_DAILY_XP} XP)`, {
        duration: 5000,
      });
      return;
    }
    
    // Determine how many points we can actually add
    const actualPointsToAdd = Math.min(pointsToAdd, remainingDailyXP);
    
    if (actualPointsToAdd < pointsToAdd) {
      toast.warning(`Only added ${actualPointsToAdd} XP (daily limit: ${MAX_DAILY_XP} XP)`, {
        duration: 5000,
      });
    }
    
    // Update points and daily XP tracking
    setPoints(prev => prev + actualPointsToAdd);
    setDailyXPEarned(prev => prev + actualPointsToAdd);
    
    return actualPointsToAdd;
  };
  
  // Task handlers
  const handleAddTask = (task: Task) => {
    setTasks([...tasks, task]);
  };
  
  const handleCompleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    // Add points when task is completed (with daily limit)
    const pointsAdded = addPoints(task.points);
    
    if (pointsAdded) {
      // Increment completed tasks count
      setTasksCompleted((prev) => prev + 1);
      // Update today's streak
      setTodayPoints((prev) => prev + pointsAdded);
      setTodayTasksCompleted((prev) => prev + 1);
      
      // Mark task as completed
      setTasks(tasks.map((t) => {
        if (t.id === id) {
          return { ...t, completed: true };
        }
        return t;
      }));
      
      // Schedule deadline notification reminder if needed
      if (task.deadline) {
        // Clear any scheduled notifications for this task
        // (Implementation would depend on how you track scheduled notifications)
      }
    }
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
