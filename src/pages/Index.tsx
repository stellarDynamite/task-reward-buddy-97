import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '@/components/TaskList';
import { BadHabit } from '@/components/BadHabitList';
import { GoodHabit } from '@/components/GoodHabitList';
import { Reward } from '@/components/RewardList';
import TaskList from '@/components/TaskList';
import BadHabitList from '@/components/BadHabitList';
import GoodHabitList from '@/components/GoodHabitList';
import RewardList from '@/components/RewardList';
import Dashboard from '@/components/Dashboard';
import Header, { TabValue } from '@/components/Header';
import StreakCalendar from '@/components/StreakCalendar';
import { toast } from 'sonner';
import { format, startOfDay, isSameDay, parseISO } from 'date-fns';
import { useUserProgress } from '@/hooks/useUserProgress';

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

const INITIAL_GOOD_HABITS: GoodHabit[] = [
  { id: '1', title: 'Drink 8 glasses of water', points: 10, completed: false },
  { id: '2', title: 'Read for 30 minutes', points: 15, completed: false },
];

const INITIAL_REWARDS: Reward[] = [
  { id: '1', title: 'Watch a movie', points: 50, claimed: false },
  { id: '2', title: 'Order takeout', points: 100, claimed: false },
  { id: '3', title: 'Buy a new book', points: 200, claimed: false },
];

// Define interface for daily streak data
export interface DailyStreak {
  date: Date | string;
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

// Calculate current level based on total points, but never decrease
const calculateLevel = (points: number, startOfDayLevel: number): [number, number, number] => {
  let level = 1; // Start at level 1
  let totalPointsNeeded = getPointsNeededForLevel(level);
  let previousLevelPoints = 0;
  
  // Increase level if points exceed the threshold
  while (points >= totalPointsNeeded) {
    level++;
    previousLevelPoints = totalPointsNeeded;
    totalPointsNeeded = getPointsNeededForLevel(level);
  }
  
  // Ensure level never goes below startOfDayLevel or previously reached levels
  level = Math.max(level, startOfDayLevel);
  
  // Points progress within current level
  const pointsInCurrentLevel = Math.max(0, points - previousLevelPoints);
  const pointsNeededForNextLevel = getPointsNeededForLevel(level + 1) - previousLevelPoints;
  
  return [level, pointsInCurrentLevel, pointsNeededForNextLevel];
};

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, loadProgress, saveProgress } = useUserProgress();
  
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [badHabits, setBadHabits] = useState<BadHabit[]>(INITIAL_BAD_HABITS);
  const [goodHabits, setGoodHabits] = useState<GoodHabit[]>(INITIAL_GOOD_HABITS);
  const [rewards, setRewards] = useState<Reward[]>(INITIAL_REWARDS);
  const [points, setPoints] = useState(50);
  const [spendablePoints, setSpendablePoints] = useState(50);
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');
  
  // Stats - explicitly track these separately
  const tasksCompleted = tasks.filter(task => task.completed).length;
  const goodHabitsCompleted = goodHabits.filter(habit => habit.completed).length;
  const [badHabitsAvoided, setBadHabitsAvoided] = useState(badHabits.length);
  const [rewardsClaimed, setRewardsClaimed] = useState(0);
  
  // Daily Streak tracking
  const [dailyStreaks, setDailyStreaks] = useState<DailyStreak[]>([]);
  const [todayPoints, setTodayPoints] = useState(0);
  const [todayTasksCompleted, setTodayTasksCompleted] = useState(0);
  
  // Game balance tracking
  const [startOfDayLevel, setStartOfDayLevel] = useState(1);
  const [dailyXPEarned, setDailyXPEarned] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  
  // Calculate level information with floor at startOfDayLevel
  const [level, pointsToNextLevel, pointsNeededForNextLevel] = calculateLevel(points, startOfDayLevel);

  // Helper function to perform daily reset
  const performDailyReset = (savedData: any) => {
    console.log('Performing daily reset...');
    
    // Reset bad habits - they get a fresh start each day
    if (savedData.badHabits) {
      const parsedBadHabits = Array.isArray(savedData.badHabits) ? savedData.badHabits : JSON.parse(savedData.badHabits);
      setBadHabits(parsedBadHabits);
      setBadHabitsAvoided(parsedBadHabits.length); // Reset to full count each day
      console.log('Bad habits reset for new day:', parsedBadHabits);
    } else {
      setBadHabits(INITIAL_BAD_HABITS);
      setBadHabitsAvoided(INITIAL_BAD_HABITS.length);
    }
    
    // Reset good habits - ENSURE they are reset to completed: false
    if (savedData.goodHabits) {
      const parsedGoodHabits = Array.isArray(savedData.goodHabits) ? savedData.goodHabits : JSON.parse(savedData.goodHabits);
      const renewedGoodHabits = parsedGoodHabits.map((habit: GoodHabit) => ({
        ...habit,
        completed: false
      }));
      setGoodHabits(renewedGoodHabits);
      console.log('Good habits reset for new day:', renewedGoodHabits);
      
      // Save to localStorage for non-authenticated users
      if (!user) {
        localStorage.setItem('goodHabits', JSON.stringify(renewedGoodHabits));
      }
    } else {
      const resetInitialGoodHabits = INITIAL_GOOD_HABITS.map(habit => ({
        ...habit,
        completed: false
      }));
      setGoodHabits(resetInitialGoodHabits);
      console.log('Initial good habits set with completed: false');
      
      // Save to localStorage for non-authenticated users
      if (!user) {
        localStorage.setItem('goodHabits', JSON.stringify(resetInitialGoodHabits));
      }
    }
    
    // Reset rewards
    if (savedData.rewards) {
      try {
        const parsedRewards = Array.isArray(savedData.rewards) ? savedData.rewards : JSON.parse(savedData.rewards);
        const renewedRewards = parsedRewards.map((reward: Reward) => {
          return { ...reward, claimed: false };
        });
        setRewards(renewedRewards);
        setRewardsClaimed(0);
        
        // Save to localStorage for non-authenticated users
        if (!user) {
          localStorage.setItem('rewards', JSON.stringify(renewedRewards));
          const updatedStats = { 
            rewardsClaimed: 0,
            badHabitsAvoided: savedData.badHabits ? (Array.isArray(savedData.badHabits) ? savedData.badHabits : JSON.parse(savedData.badHabits)).length : INITIAL_BAD_HABITS.length
          };
          localStorage.setItem('stats', JSON.stringify(updatedStats));
        }
      } catch (e) {
        console.error("Error renewing rewards:", e);
      }
    }
    
    // Reset daily XP and level tracking
    const currentLevel = calculateLevel(savedData.points || 50, startOfDayLevel)[0];
    setStartOfDayLevel(currentLevel);
    setDailyXPEarned(0);
    
    // Show notification
    toast.success("Your habits have been reset for a new day! 🌅", {
      duration: 4000,
    });
    
    // Update last login date
    const today = startOfDay(new Date()).toISOString();
    if (!user) {
      localStorage.setItem('lastLoginDate', today);
    }
  };
  
  // Load progress when user logs in
  useEffect(() => {
    const initializeProgress = async () => {
      if (authLoading) return;
      
      if (user && !progressLoaded) {
        console.log('Loading user progress from Supabase...');
        const cloudProgress = await loadProgress();
        
        if (cloudProgress) {
          console.log('Loaded cloud progress:', cloudProgress);
          
          // Check if it's a new day for authenticated users
          const today = startOfDay(new Date()).toISOString().split('T')[0];
          const lastResetDate = localStorage.getItem('lastLoginDate');
          
          if (lastResetDate !== today) {
            // Perform daily reset for authenticated users
            performDailyReset({
              badHabits: cloudProgress.bad_habits,
              goodHabits: cloudProgress.good_habits,
              rewards: cloudProgress.rewards,
              points: cloudProgress.points
            });
            
            // Set other data normally
            setTasks(cloudProgress.tasks || INITIAL_TASKS);
            setPoints(cloudProgress.points || 50);
            setSpendablePoints(cloudProgress.points || 50);
            setDailyXPEarned(0); // Reset daily XP
            
            localStorage.setItem('lastLoginDate', today);
          } else {
            // Not a new day, load normally
            setTasks(cloudProgress.tasks || INITIAL_TASKS);
            setBadHabits(cloudProgress.bad_habits || INITIAL_BAD_HABITS);
            setGoodHabits(cloudProgress.good_habits || INITIAL_GOOD_HABITS);
            setRewards(cloudProgress.rewards || INITIAL_REWARDS);
            setPoints(cloudProgress.points || 50);
            setSpendablePoints(cloudProgress.points || 50);
            setDailyXPEarned(cloudProgress.daily_xp_earned || 0);
          }
          
          toast.success("Progress loaded from your account!", { duration: 3000 });
        } else {
          console.log('No cloud progress found, using local data');
          // Save current local progress to cloud
          await saveProgress({
            tasks,
            bad_habits: badHabits,
            good_habits: goodHabits,
            rewards,
            points,
            daily_xp_earned: dailyXPEarned
          });
        }
        setProgressLoaded(true);
      } else if (!user) {
        // Load from localStorage if not authenticated
        console.log('Loading progress from localStorage...');
        
        const savedTasks = localStorage.getItem('tasks');
        const savedBadHabits = localStorage.getItem('badHabits');
        const savedGoodHabits = localStorage.getItem('goodHabits');
        const savedRewards = localStorage.getItem('rewards');
        const savedPoints = localStorage.getItem('points');
        const savedSpendablePoints = localStorage.getItem('spendablePoints');
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
        
        if (savedPoints) setPoints(JSON.parse(savedPoints));
        if (savedSpendablePoints) {
          setSpendablePoints(JSON.parse(savedSpendablePoints));
        } else if (savedPoints) {
          setSpendablePoints(JSON.parse(savedPoints));
        }
        
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
              const streakDate = s.date instanceof Date 
                ? s.date 
                : (typeof s.date === 'string' ? parseISO(s.date) : null);
              return streakDate && isSameDay(streakDate, today);
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
          // New day - perform daily reset
          performDailyReset({
            badHabits: savedBadHabits,
            goodHabits: savedGoodHabits,
            rewards: savedRewards,
            points: savedPoints ? JSON.parse(savedPoints) : 50
          });
        } else {
          // Same day - load normally
          if (savedBadHabits) {
            const parsedBadHabits = JSON.parse(savedBadHabits);
            setBadHabits(parsedBadHabits);
          }
          
          if (savedGoodHabits) {
            const parsedGoodHabits = JSON.parse(savedGoodHabits);
            setGoodHabits(parsedGoodHabits);
          }
          
          if (savedRewards) setRewards(JSON.parse(savedRewards));
          
          if (savedStartOfDayLevel) setStartOfDayLevel(JSON.parse(savedStartOfDayLevel));
          if (savedDailyXPEarned) setDailyXPEarned(JSON.parse(savedDailyXPEarned));
        }
        
        setProgressLoaded(true);
      }
    };

    initializeProgress();
  }, [user, authLoading, progressLoaded]);
  
  // Auto-save progress to cloud when user is authenticated
  useEffect(() => {
    if (user && progressLoaded) {
      const saveToCloud = async () => {
        await saveProgress({
          tasks,
          bad_habits: badHabits,
          good_habits: goodHabits,
          rewards,
          points,
          daily_xp_earned: dailyXPEarned
        });
      };
      
      // Debounce saves to avoid too many requests
      const timeoutId = setTimeout(saveToCloud, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [user, progressLoaded, tasks, badHabits, goodHabits, rewards, points, dailyXPEarned]);
  
  // Save to localStorage if not authenticated
  useEffect(() => {
    if (!user && progressLoaded) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
      localStorage.setItem('badHabits', JSON.stringify(badHabits));
      localStorage.setItem('goodHabits', JSON.stringify(goodHabits));
      localStorage.setItem('rewards', JSON.stringify(rewards));
      localStorage.setItem('points', JSON.stringify(points));
      localStorage.setItem('spendablePoints', JSON.stringify(spendablePoints));
      
      localStorage.setItem('stats', JSON.stringify({
        rewardsClaimed,
        badHabitsAvoided
      }));
      
      localStorage.setItem('dailyStreaks', JSON.stringify(dailyStreaks));
      localStorage.setItem('startOfDayLevel', JSON.stringify(startOfDayLevel));
      localStorage.setItem('dailyXPEarned', JSON.stringify(dailyXPEarned));
    }
  }, [user, progressLoaded, tasks, badHabits, goodHabits, rewards, points, spendablePoints, dailyStreaks, startOfDayLevel, dailyXPEarned, rewardsClaimed, badHabitsAvoided]);
  
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  // Utility function: Update or add points/tasks for a specific date in streaks
  const updateDailyStreakForDate = (targetDate: Date, addPoints: number, addTasksCompleted: number = 0) => {
    setDailyStreaks(prevStreaks => {
      // Improved date comparison that works with both Date objects and strings
      const idx = prevStreaks.findIndex(s => {
        if (!s.date) return false;
        
        const streakDate = s.date instanceof Date 
          ? s.date 
          : (typeof s.date === 'string' ? parseISO(s.date) : null);
        
        return streakDate && isSameDay(streakDate, targetDate);
      });
      
      if (idx >= 0) {
        // Update existing streak
        const updated = [...prevStreaks];
        updated[idx] = {
          ...updated[idx],
          points: Math.max(0, updated[idx].points + addPoints),
          tasksCompleted: Math.max(0, updated[idx].tasksCompleted + addTasksCompleted)
        };
        return updated;
      } else {
        // Add new streak
        return [
          ...prevStreaks,
          {
            date: targetDate,
            points: Math.max(0, addPoints),
            tasksCompleted: Math.max(0, addTasksCompleted)
          }
        ];
      }
    });
  };

  // Add points for a given date
  // - "forDate" should be the date points were earned; defaults to today.
  const addPoints = (pointsToAdd: number, forDate: Date = startOfDay(new Date())) => {
    // Only apply daily XP and level restrictions if affecting today!
    const isToday = isSameDay(forDate, startOfDay(new Date()));
    let remainingDailyXP = MAX_DAILY_XP - dailyXPEarned;
    let actualPointsToAdd = pointsToAdd;

    if (isToday) {
      if (remainingDailyXP <= 0) {
        toast.warning(`You've reached the daily XP limit (${MAX_DAILY_XP} XP)`, { duration: 5000 });
        return 0;
      }
      actualPointsToAdd = Math.min(pointsToAdd, remainingDailyXP);
      if (actualPointsToAdd < pointsToAdd) {
        toast.warning(`Only added ${actualPointsToAdd} XP (daily limit: ${MAX_DAILY_XP} XP)`, { duration: 5000 });
      }
      setPoints(prev => prev + actualPointsToAdd);
      setSpendablePoints(prev => prev + actualPointsToAdd); // Add to spendable points as well
      setDailyXPEarned(prev => prev + actualPointsToAdd);
    } else {
      // For non-today, just add the points to streak—don't update main XP/levels
      // Optionally, comment out below if you want points to retroactively update total XP as well
      // setPoints(prev => prev + actualPointsToAdd);
      // Do not update dailyXPEarned for past dates
    }
    updateDailyStreakForDate(forDate, actualPointsToAdd, 0);
    return actualPointsToAdd;
  };

  // --- Task Completion ---
  const handleCompleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.completed) return;
    
    // Add points for completing the task
    const earnedPoints = addPoints(task.points);
    
    // Mark the task as completed
    setTasks(tasks.map(t => (t.id === id ? { ...t, completed: true } : t)));
    
    // Update today's tasks completed count
    const today = startOfDay(new Date());
    updateDailyStreakForDate(today, 0, 1); // Add 1 to the task count, 0 additional points
    setTodayTasksCompleted(prev => prev + 1);
    
    console.log(`Task completed: ${task.title} - Added ${earnedPoints} points and updated streak`);
  };
  
  // --- Good Habit Completion ---
  const handleCompleteGoodHabit = (id: string) => {
    const goodHabit = goodHabits.find(h => h.id === id);
    if (!goodHabit || goodHabit.completed) return;
    
    const earnedPoints = addPoints(goodHabit.points);
    setGoodHabits(goodHabits.map(h => (h.id === id ? { ...h, completed: true } : h)));
    
    console.log(`Good habit completed: ${goodHabit.title} - Added ${earnedPoints} points`);
  };
  
  // --- Bad Habit Tracking ---
  const handleTriggerBadHabit = (id: string) => {
    const badHabit = badHabits.find(h => h.id === id);
    if (!badHabit) return;
    
    // Subtract points for triggering a bad habit
    const lostPoints = -badHabit.points; // Negative points
    
    // Update both total XP and spendable points when bad habits are triggered
    addPoints(lostPoints);
    
    // Decrement the "avoided" count
    setBadHabitsAvoided(prev => Math.max(0, prev - 1));
    
    console.log(`Bad habit triggered: ${badHabit.title} - Lost ${Math.abs(lostPoints)} points`);
  };

  // --- Reward Claiming ---
  const handleClaimReward = (id: string) => {
    const reward = rewards.find(r => r.id === id);
    if (!reward || reward.claimed) return;
    
    // Check if user has enough SPENDABLE points
    if (spendablePoints < reward.points) {
      toast.error(`Not enough points to claim "${reward.title}"`);
      return;
    }
    
    // Subtract points ONLY from spendable points, not from the total XP
    setSpendablePoints(prev => prev - reward.points);
    
    // Mark the reward as claimed
    setRewards(rewards.map(r => r.id === id ? { ...r, claimed: true, lastClaimed: new Date().toISOString() } : r));
    
    // Increment rewards claimed count
    setRewardsClaimed(prev => prev + 1);
    
    toast.success(`Reward claimed: ${reward.title}`);
  };
  
  // --- Task Management ---
  const handleAddTask = (task: Task) => {
    setTasks([...tasks, task]);
  };
  
  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };
  
  const handleEditTask = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  
  // --- Good Habit Management ---
  const handleAddGoodHabit = (goodHabit: GoodHabit) => {
    setGoodHabits([...goodHabits, goodHabit]);
  };
  
  const handleDeleteGoodHabit = (id: string) => {
    setGoodHabits(goodHabits.filter(h => h.id !== id));
  };
  
  // --- Bad Habit Management ---
  const handleAddBadHabit = (badHabit: BadHabit) => {
    setBadHabits([...badHabits, badHabit]);
    setBadHabitsAvoided(prev => prev + 1);
  };
  
  const handleDeleteBadHabit = (id: string) => {
    const isAvoided = badHabitsAvoided > 0 && badHabitsAvoided === badHabits.length;
    setBadHabits(badHabits.filter(h => h.id !== id));
    if (isAvoided) {
      setBadHabitsAvoided(prev => Math.max(0, prev - 1));
    }
  };
  
  // --- Reward Management ---
  const handleAddReward = (reward: Reward) => {
    setRewards([...rewards, reward]);
  };
  
  const handleDeleteReward = (id: string) => {
    const reward = rewards.find(r => r.id === id);
    const wasClaimed = reward?.claimed || false;
    
    setRewards(rewards.filter(r => r.id !== id));
    
    if (wasClaimed) {
      setRewardsClaimed(prev => Math.max(0, prev - 1));
    }
  };
  
  // Show loading state
  if (authLoading || !progressLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-theme-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        points={points} 
      />
      
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
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
      )}
      
      {activeTab === 'tasks' && (
        <TaskList 
          tasks={tasks} 
          onAddTask={handleAddTask}
          onCompleteTask={handleCompleteTask}
          onDeleteTask={handleDeleteTask}
          onEditTask={handleEditTask}
        />
      )}
      
      {activeTab === 'good-habits' && (
        <GoodHabitList
          goodHabits={goodHabits}
          onAddGoodHabit={handleAddGoodHabit}
          onCompleteGoodHabit={handleCompleteGoodHabit}
          onDeleteGoodHabit={handleDeleteGoodHabit}
        />
      )}
      
      {activeTab === 'bad-habits' && (
        <BadHabitList
          badHabits={badHabits}
          onAddBadHabit={handleAddBadHabit}
          onTriggerBadHabit={handleTriggerBadHabit}
          onDeleteBadHabit={handleDeleteBadHabit}
        />
      )}
      
      {activeTab === 'rewards' && (
        <RewardList
          rewards={rewards}
          userPoints={spendablePoints}
          onAddReward={handleAddReward}
          onClaimReward={handleClaimReward}
          onDeleteReward={handleDeleteReward}
        />
      )}
    </div>
  );
};

export default Index;
