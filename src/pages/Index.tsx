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
  
  // Stats - explicitly track these separately
  const tasksCompleted = tasks.filter(task => task.completed).length;
  const [badHabitsAvoided, setBadHabitsAvoided] = useState(badHabits.length); // Track this directly
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
    
    if (savedBadHabits) {
      const parsedBadHabits = JSON.parse(savedBadHabits);
      setBadHabits(parsedBadHabits);
    }
    
    if (savedRewards) setRewards(JSON.parse(savedRewards));
    if (savedPoints) setPoints(JSON.parse(savedPoints));
    
    if (savedStats) {
      try {
        const stats = JSON.parse(savedStats);
        setRewardsClaimed(stats.rewardsClaimed || 0);
        setBadHabitsAvoided(stats.badHabitsAvoided || badHabits.length);
      } catch (e) {
        console.error("Error parsing stats:", e);
      }
    }
    
    if (savedStreaks) {
      try {
        const parsedStreaks = JSON.parse(savedStreaks);
        const streaks = parsedStreaks.map((streak: any) => parseDates(streak));
        setDailyStreaks(streaks);
        
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
    
    const today = startOfDay(new Date()).toISOString();
    if (lastLoginDate !== today) {
      // Reset for a new day
      const currentLevel = calculateLevel(savedPoints ? JSON.parse(savedPoints) : 50)[0];
      setStartOfDayLevel(currentLevel);
      setDailyXPEarned(0);
      
      localStorage.setItem('lastLoginDate', today);
      
      // Reset all "avoided" count to total bad habits
      if (savedBadHabits) {
        const parsedBadHabits = JSON.parse(savedBadHabits);
        // Reset bad habits avoided to the total count of bad habits
        setBadHabits(parsedBadHabits);
        setBadHabitsAvoided(parsedBadHabits.length); // Reset the avoided count to full
      } else {
        setBadHabits(INITIAL_BAD_HABITS);
        setBadHabitsAvoided(INITIAL_BAD_HABITS.length);
      }
      
      // Reset rewards to unclaimed
      if (savedRewards) {
        try {
          const parsedRewards = JSON.parse(savedRewards);
          const renewedRewards = parsedRewards.map((reward: Reward) => {
            return { ...reward, claimed: false };
          });
          setRewards(renewedRewards);
          setRewardsClaimed(0); // Reset claimed rewards counter
          
          // Update local storage with the reset rewards
          localStorage.setItem('rewards', JSON.stringify(renewedRewards));
          
          // Update stats in localStorage to reflect reset reward count
          const updatedStats = { 
            rewardsClaimed: 0,
            badHabitsAvoided: savedBadHabits ? JSON.parse(savedBadHabits).length : INITIAL_BAD_HABITS.length
          };
          localStorage.setItem('stats', JSON.stringify(updatedStats));
          
          toast.success("Your rewards have been renewed for a new day!", {
            duration: 3000,
          });
        } catch (e) {
          console.error("Error renewing rewards:", e);
        }
      }
    } else {
      if (savedStartOfDayLevel) setStartOfDayLevel(JSON.parse(savedStartOfDayLevel));
      if (savedDailyXPEarned) setDailyXPEarned(JSON.parse(savedDailyXPEarned));
    }
  }, []);
  
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('badHabits', JSON.stringify(badHabits));
    localStorage.setItem('rewards', JSON.stringify(rewards));
    localStorage.setItem('points', JSON.stringify(points));
    
    localStorage.setItem('stats', JSON.stringify({
      rewardsClaimed,
      badHabitsAvoided
    }));
    
    localStorage.setItem('dailyStreaks', JSON.stringify(dailyStreaks));
    
    localStorage.setItem('startOfDayLevel', JSON.stringify(startOfDayLevel));
    localStorage.setItem('dailyXPEarned', JSON.stringify(dailyXPEarned));
  }, [tasks, badHabits, rewards, points, dailyStreaks, startOfDayLevel, dailyXPEarned, rewardsClaimed, badHabitsAvoided]);
  
  useEffect(() => {
    const updateTodayStreak = () => {
      const today = startOfDay(new Date());
      
      // Find today's streak if it exists
      const todayStreakIndex = dailyStreaks.findIndex(streak => 
        streak.date instanceof Date && isSameDay(streak.date, today)
      );

      // Calculate points earned today (dailyXPEarned)
      if (todayStreakIndex >= 0) {
        const updatedStreaks = [...dailyStreaks];
        updatedStreaks[todayStreakIndex] = {
          date: today,
          points: dailyXPEarned, // Use dailyXPEarned instead of todayPoints
          tasksCompleted: todayTasksCompleted
        };
        setDailyStreaks(updatedStreaks);
      } else {
        setDailyStreaks([...dailyStreaks, {
          date: today,
          points: dailyXPEarned, // Use dailyXPEarned for new day
          tasksCompleted: todayTasksCompleted
        }]);
      }
    };
    
    updateTodayStreak();
  }, [dailyXPEarned, todayTasksCompleted]); // Update when dailyXPEarned changes
  
  useEffect(() => {
    const [newLevel] = calculateLevel(points);
    const prevLevel = localStorage.getItem('userLevel');
    
    if (prevLevel && parseInt(prevLevel) < newLevel) {
      if (newLevel - startOfDayLevel > MAX_DAILY_LEVELS) {
        toast.warning(`You've reached the daily level limit (${MAX_DAILY_LEVELS} levels per day)`, {
          duration: 5000,
        });
        
        let maxPointsForLevel = 0;
        let tempLevel = startOfDayLevel;
        for (let i = 0; i < MAX_DAILY_LEVELS; i++) {
          maxPointsForLevel += getPointsNeededForLevel(tempLevel);
          tempLevel++;
        }
        
        setPoints(maxPointsForLevel);
      } else {
        toast.success(`Level Up! You've reached level ${newLevel}! 🎉`, {
          duration: 5000,
        });
      }
    }
    
    localStorage.setItem('userLevel', newLevel.toString());
  }, [points, startOfDayLevel]);
  
  const addPoints = (pointsToAdd: number) => {
    const remainingDailyXP = MAX_DAILY_XP - dailyXPEarned;
    
    if (remainingDailyXP <= 0) {
      toast.warning(`You've reached the daily XP limit (${MAX_DAILY_XP} XP)`, {
        duration: 5000,
      });
      return;
    }
    
    const actualPointsToAdd = Math.min(pointsToAdd, remainingDailyXP);
    
    if (actualPointsToAdd < pointsToAdd) {
      toast.warning(`Only added ${actualPointsToAdd} XP (daily limit: ${MAX_DAILY_XP} XP)`, {
        duration: 5000,
      });
    }
    
    setPoints(prev => prev + actualPointsToAdd);
    setDailyXPEarned(prev => prev + actualPointsToAdd);
    
    return actualPointsToAdd;
  };
  
  const handleAddTask = (task: Task) => {
    setTasks([...tasks, task]);
  };
  
  const handleCompleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const pointsAdded = addPoints(task.points);
    
    if (pointsAdded) {
      setTodayPoints((prev) => prev + pointsAdded);
      setTodayTasksCompleted((prev) => prev + 1);
      
      setTasks(tasks.map((t) => {
        if (t.id === id) {
          return { ...t, completed: true };
        }
        return t;
      }));
    }
  };
  
  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };
  
  const handleEditTask = (editedTask: Task) => {
    setTasks(tasks.map(task => 
      task.id === editedTask.id ? editedTask : task
    ));
  };
  
  const handleAddBadHabit = (badHabit: BadHabit) => {
    setBadHabits([...badHabits, badHabit]);
    setBadHabitsAvoided(prev => prev + 1); // Increment avoided count when adding a new bad habit
  };
  
  const handleTriggerBadHabit = (id: string) => {
    const badHabit = badHabits.find((habit) => habit.id === id);
    if (!badHabit) return;
    
    setPoints((prev) => Math.max(0, prev - badHabit.points));
    setTodayPoints((prev) => Math.max(0, prev - badHabit.points));
    setBadHabitsAvoided(prev => Math.max(0, prev - 1)); // Decrement avoided count when triggered
  };
  
  const handleDeleteBadHabit = (id: string) => {
    setBadHabits(badHabits.filter((habit) => habit.id !== id));
    setBadHabitsAvoided(prev => Math.max(0, prev - 1)); // Decrement avoided count when deleted
  };
  
  const handleAddReward = (reward: Reward) => {
    setRewards([...rewards, reward]);
  };
  
  const handleClaimReward = (id: string) => {
    const reward = rewards.find((r) => r.id === id);
    if (!reward || points < reward.points || reward.claimed) return;
    
    setPoints((prev) => prev - reward.points);
    setRewardsClaimed((prev) => prev + 1); // This was working but we need to update the rewards list
    
    setRewards(rewards.map((r) => {
      if (r.id === id) {
        return { 
          ...r, 
          claimed: true,
          lastClaimed: new Date().toISOString()
        };
      }
      return r;
    }));
  };
  
  const handleDeleteReward = (id: string) => {
    const reward = rewards.find(r => r.id === id);
    setRewards(rewards.filter((reward) => reward.id !== id));
    
    // If we're deleting a claimed reward, decrement the counter
    if (reward && reward.claimed) {
      setRewardsClaimed(prev => Math.max(0, prev - 1));
    }
  };
  
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
              totalTasks={tasks.length}
              badHabitsAvoided={badHabitsAvoided}
              totalBadHabits={badHabits.length}
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
            onEditTask={handleEditTask}
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
