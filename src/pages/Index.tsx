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
  
  // Track which bad habits have been triggered today
  const [triggeredBadHabitsToday, setTriggeredBadHabitsToday] = useState<Set<string>>(new Set());
  
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

  // Helper function to check if it's actually a new day since last reset
  const isNewDay = (lastResetDate: string | null): boolean => {
    if (!lastResetDate) return true; // First time user or no reset date
    
    const today = startOfDay(new Date());
    const lastReset = startOfDay(parseISO(lastResetDate));
    
    return !isSameDay(today, lastReset);
  };

  // Helper function to perform daily reset
  const performDailyReset = (savedData: any) => {
    console.log('Performing daily reset...');
    
    // Reset triggered bad habits tracking
    setTriggeredBadHabitsToday(new Set());
    
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
    
    // Initialize only today's counters to 0 (don't modify existing streak calendar here)
    setTodayPoints(0);
    setTodayTasksCompleted(0);
    
    // Only add today's entry to streak calendar if it doesn't exist
    const today = startOfDay(new Date());
    setDailyStreaks(prevStreaks => {
      const existingTodayIndex = prevStreaks.findIndex(s => {
        const streakDate = s.date instanceof Date ? s.date : parseISO(s.date as string);
        return streakDate && isSameDay(streakDate, today);
      });
      
      if (existingTodayIndex >= 0) {
        // Today already exists - only reset if it has non-zero values from previous session
        const updated = [...prevStreaks];
        updated[existingTodayIndex] = {
          ...updated[existingTodayIndex],
          points: 0,
          tasksCompleted: 0
        };
        return updated;
      } else {
        // Add new today entry with 0 values
        return [
          ...prevStreaks,
          {
            date: today,
            points: 0,
            tasksCompleted: 0
          }
        ];
      }
    });
    
    // Show notification
    toast.success("Your habits have been reset for a new day! 🌅", {
      duration: 4000,
    });
    
    // Update last reset date to today and clear triggered habits for localStorage users
    const todayString = startOfDay(new Date()).toISOString();
    if (!user) {
      localStorage.setItem('lastDailyReset', todayString);
      localStorage.setItem('triggeredBadHabitsToday', JSON.stringify([]));
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
          
          // Check if it's a new day for authenticated users using cloud data
          const lastResetFromStorage = localStorage.getItem('lastDailyReset');
          const lastResetDate = lastResetFromStorage || new Date().toISOString();
          
          if (isNewDay(lastResetDate)) {
            console.log('New day detected for authenticated user, performing reset...');
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
            
            const todayString = startOfDay(new Date()).toISOString();
            localStorage.setItem('lastDailyReset', todayString);
          } else {
            console.log('Same day for authenticated user, loading normally...');
            // Not a new day, load normally
            setTasks(cloudProgress.tasks || INITIAL_TASKS);
            setBadHabits(cloudProgress.bad_habits || INITIAL_BAD_HABITS);
            setGoodHabits(cloudProgress.good_habits || INITIAL_GOOD_HABITS);
            setRewards(cloudProgress.rewards || INITIAL_REWARDS);
            setPoints(cloudProgress.points || 50);
            setSpendablePoints(cloudProgress.points || 50);
            setDailyXPEarned(cloudProgress.daily_xp_earned || 0);
            
            // Set bad habits avoided count
            setBadHabitsAvoided((cloudProgress.bad_habits || INITIAL_BAD_HABITS).length);
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
        const savedTriggeredBadHabits = localStorage.getItem('triggeredBadHabitsToday');
        const lastResetDate = localStorage.getItem('lastDailyReset');
        
        console.log('Last reset date from localStorage:', lastResetDate);
        console.log('Is new day?', isNewDay(lastResetDate));
        
        // Load triggered bad habits FIRST before checking for new day
        if (savedTriggeredBadHabits) {
          try {
            const parsed = JSON.parse(savedTriggeredBadHabits);
            console.log('Loading triggered bad habits from localStorage:', parsed);
            setTriggeredBadHabitsToday(new Set(parsed));
          } catch (e) {
            console.error("Error parsing triggered bad habits:", e);
          }
        }
        
        // Check if it's a new day for local users - be more specific about this check
        const actuallyNewDay = isNewDay(lastResetDate);
        console.log('Actually new day check result:', actuallyNewDay);
        
        if (actuallyNewDay) {
          console.log('New day detected for local user, performing reset...');
          // New day - perform daily reset
          performDailyReset({
            badHabits: savedBadHabits,
            goodHabits: savedGoodHabits,
            rewards: savedRewards,
            points: savedPoints ? JSON.parse(savedPoints) : 50
          });
          
          // Load basic data after reset
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
          
          // Load streaks but don't modify today's entry since reset already handled it
          if (savedStreaks) {
            try {
              const parsedStreaks = JSON.parse(savedStreaks);
              const streaks = parsedStreaks.map((streak: any) => parseDates(streak));
              setDailyStreaks(streaks);
            } catch (e) {
              console.error("Error parsing streaks:", e);
              setDailyStreaks([]);
            }
          }
        } else {
          console.log('Same day for local user, loading normally...');
          // Same day - load normally without resetting
          
          // Load basic data first
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
          
          // Load bad habits first so we have the right count for badHabitsAvoided
          if (savedBadHabits) {
            try {
              const parsedBadHabits = JSON.parse(savedBadHabits);
              setBadHabits(parsedBadHabits);
              console.log('Loaded bad habits from localStorage:', parsedBadHabits);
              
              // Load stats after bad habits are loaded - this is critical for avoiding reset
              if (savedStats) {
                try {
                  const stats = JSON.parse(savedStats);
                  setRewardsClaimed(stats.rewardsClaimed || 0);
                  // Use the saved avoided count, fallback to current bad habits length
                  setBadHabitsAvoided(stats.badHabitsAvoided !== undefined ? stats.badHabitsAvoided : parsedBadHabits.length);
                  console.log('Loaded badHabitsAvoided from stats:', stats.badHabitsAvoided);
                } catch (e) {
                  console.error("Error parsing stats:", e);
                  setBadHabitsAvoided(parsedBadHabits.length);
                }
              } else {
                setBadHabitsAvoided(parsedBadHabits.length);
              }
            } catch (e) {
              console.error("Error parsing bad habits:", e);
              setBadHabits(INITIAL_BAD_HABITS);
              setBadHabitsAvoided(INITIAL_BAD_HABITS.length);
            }
          } else {
            // No saved bad habits, use defaults
            setBadHabits(INITIAL_BAD_HABITS);
            if (savedStats) {
              try {
                const stats = JSON.parse(savedStats);
                setRewardsClaimed(stats.rewardsClaimed || 0);
                setBadHabitsAvoided(stats.badHabitsAvoided !== undefined ? stats.badHabitsAvoided : INITIAL_BAD_HABITS.length);
              } catch (e) {
                console.error("Error parsing stats:", e);
                setBadHabitsAvoided(INITIAL_BAD_HABITS.length);
              }
            } else {
              setBadHabitsAvoided(INITIAL_BAD_HABITS.length);
            }
          }
          
          if (savedGoodHabits) {
            try {
              const parsedGoodHabits = JSON.parse(savedGoodHabits);
              setGoodHabits(parsedGoodHabits);
            } catch (e) {
              console.error("Error parsing good habits:", e);
              setGoodHabits(INITIAL_GOOD_HABITS);
            }
          }
          
          if (savedRewards) {
            try {
              const parsedRewards = JSON.parse(savedRewards);
              setRewards(parsedRewards);
            } catch (e) {
              console.error("Error parsing rewards:", e);
              setRewards(INITIAL_REWARDS);
            }
          }
          
          if (savedStartOfDayLevel) setStartOfDayLevel(JSON.parse(savedStartOfDayLevel));
          if (savedDailyXPEarned) setDailyXPEarned(JSON.parse(savedDailyXPEarned));
          
          // Load streaks - this is crucial for showing past days' XP
          if (savedStreaks) {
            try {
              const parsedStreaks = JSON.parse(savedStreaks);
              const streaks = parsedStreaks.map((streak: any) => parseDates(streak));
              setDailyStreaks(streaks);
              console.log('Loaded daily streaks:', streaks);
              
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
                console.log('Set today points and tasks from streak:', todayStreak);
              }
            } catch (e) {
              console.error("Error parsing streaks:", e);
              setDailyStreaks([]);
            }
          }
        }
        
        setProgressLoaded(true);
      }
    };

    initializeProgress();
  }, [user, authLoading, progressLoaded]);
  
  // Save triggered bad habits to localStorage
  useEffect(() => {
    if (!user && progressLoaded) {
      const triggeredArray = Array.from(triggeredBadHabitsToday);
      console.log('Saving triggered bad habits to localStorage:', triggeredArray);
      localStorage.setItem('triggeredBadHabitsToday', JSON.stringify(triggeredArray));
    }
  }, [user, progressLoaded, triggeredBadHabitsToday]);
  
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
        console.log('Updated existing streak for date:', targetDate, 'new values:', updated[idx]);
        return updated;
      } else {
        // Add new streak
        const newStreak = {
          date: targetDate,
          points: Math.max(0, addPoints),
          tasksCompleted: Math.max(0, addTasksCompleted)
        };
        console.log('Added new streak for date:', targetDate, 'values:', newStreak);
        return [
          ...prevStreaks,
          newStreak
        ];
      }
    });
    
    // Update today's counters if this is for today
    const isToday = isSameDay(targetDate, startOfDay(new Date()));
    if (isToday) {
      setTodayPoints(prev => Math.max(0, prev + addPoints));
      if (addTasksCompleted !== 0) {
        setTodayTasksCompleted(prev => Math.max(0, prev + addTasksCompleted));
      }
    }
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
    
    // Subtract points for triggering a bad habit (always deduct points)
    const lostPoints = -badHabit.points; // Negative points
    addPoints(lostPoints);
    
    // Only affect the "avoided" count if this is the first time today
    if (!triggeredBadHabitsToday.has(id)) {
      setBadHabitsAvoided(prev => Math.max(0, prev - 1));
      console.log(`Bad habit triggered for first time today: ${badHabit.title} - Lost ${Math.abs(lostPoints)} points and decreased avoided count`);
    } else {
      console.log(`Bad habit triggered again: ${badHabit.title} - Lost ${Math.abs(lostPoints)} points but avoided count unchanged`);
    }
    
    // Add to triggered habits set
    setTriggeredBadHabitsToday(prev => new Set([...prev, id]));
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
          triggeredBadHabitsToday={triggeredBadHabitsToday}
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
