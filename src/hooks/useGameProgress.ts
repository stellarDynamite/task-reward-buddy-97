import { useState, useEffect } from 'react';
import { startOfDay, isSameDay } from 'date-fns';
import { Task } from '@/components/TaskList';
import { BadHabit } from '@/components/BadHabitList';
import { GoodHabit } from '@/components/GoodHabitList';
import { Reward } from '@/components/RewardList';
import { DailyStreak } from '@/types/streak';
import { useUserProgress } from '@/hooks/useUserProgress';
import { toast } from 'sonner';

// Constants for game balance
const MAX_DAILY_LEVELS = 3;
const MAX_DAILY_XP = 400;

// FIXED: Simple date parsing that handles both Date objects and strings properly
const parseDates = <T extends Record<string, any>>(obj: T): T => {
  const result = { ...obj };
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if ((key === 'date' || key === 'deadline') && typeof value === 'string') {
      try {
        (result as any)[key] = new Date(value);
      } catch (e) {
        console.error(`Error parsing date for key ${key}:`, e);
        (result as any)[key] = value;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (result as any)[key] = parseDates(value);
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
  let level = 1;
  let totalPointsNeeded = getPointsNeededForLevel(level);
  let previousLevelPoints = 0;
  
  while (points >= totalPointsNeeded) {
    level++;
    previousLevelPoints = totalPointsNeeded;
    totalPointsNeeded = getPointsNeededForLevel(level);
  }
  
  level = Math.max(level, startOfDayLevel);
  
  const pointsInCurrentLevel = Math.max(0, points - previousLevelPoints);
  const pointsNeededForNextLevel = getPointsNeededForLevel(level + 1) - previousLevelPoints;
  
  return [level, pointsInCurrentLevel, pointsNeededForNextLevel];
};

export function useGameProgress({
  INITIAL_TASKS,
  INITIAL_BAD_HABITS,
  INITIAL_GOOD_HABITS,
  INITIAL_REWARDS,
}: {
  INITIAL_TASKS: Task[],
  INITIAL_BAD_HABITS: BadHabit[],
  INITIAL_GOOD_HABITS: GoodHabit[],
  INITIAL_REWARDS: Reward[]
}) {
  const { user, loading: authLoading, loadProgress, saveProgress } = useUserProgress();
  
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [badHabits, setBadHabits] = useState<BadHabit[]>(INITIAL_BAD_HABITS);
  const [goodHabits, setGoodHabits] = useState<GoodHabit[]>(INITIAL_GOOD_HABITS);
  const [rewards, setRewards] = useState<Reward[]>(INITIAL_REWARDS);
  const [points, setPoints] = useState(50);
  const [spendablePoints, setSpendablePoints] = useState(50);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'good-habits' | 'bad-habits' | 'rewards'>('dashboard');
  
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
    if (!lastResetDate) return true;
    
    const today = startOfDay(new Date());
    const lastReset = startOfDay(new Date(lastResetDate));
    
    return !isSameDay(today, lastReset);
  };

  // Helper function to perform daily reset
  const performDailyReset = (savedData: any) => {
    console.log('Performing daily reset...');
    
    setTriggeredBadHabitsToday(new Set());
    
    if (savedData.badHabits) {
      const parsedBadHabits = Array.isArray(savedData.badHabits) ? savedData.badHabits : JSON.parse(savedData.badHabits);
      setBadHabits(parsedBadHabits);
      setBadHabitsAvoided(parsedBadHabits.length);
      console.log('Bad habits reset for new day:', parsedBadHabits);
    } else {
      setBadHabits(INITIAL_BAD_HABITS);
      setBadHabitsAvoided(INITIAL_BAD_HABITS.length);
    }
    
    if (savedData.goodHabits) {
      const parsedGoodHabits = Array.isArray(savedData.goodHabits) ? savedData.goodHabits : JSON.parse(savedData.goodHabits);
      const renewedGoodHabits = parsedGoodHabits.map((habit: GoodHabit) => ({
        ...habit,
        completed: false
      }));
      setGoodHabits(renewedGoodHabits);
      console.log('Good habits reset for new day:', renewedGoodHabits);
      
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
      
      if (!user) {
        localStorage.setItem('goodHabits', JSON.stringify(resetInitialGoodHabits));
      }
    }
    
    if (savedData.rewards) {
      try {
        const parsedRewards = Array.isArray(savedData.rewards) ? savedData.rewards : JSON.parse(savedData.rewards);
        const renewedRewards = parsedRewards.map((reward: Reward) => {
          return { ...reward, claimed: false };
        });
        setRewards(renewedRewards);
        setRewardsClaimed(0);
        
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
    
    const currentLevel = calculateLevel(savedData.points || 50, startOfDayLevel)[0];
    setStartOfDayLevel(currentLevel);
    setDailyXPEarned(0);
    
    setTodayPoints(0);
    setTodayTasksCompleted(0);
    
    const today = startOfDay(new Date());
    setDailyStreaks(prevStreaks => {
      const existingTodayIndex = prevStreaks.findIndex(s => {
        const streakDate = s.date instanceof Date ? s.date : new Date(s.date);
        return streakDate && isSameDay(streakDate, today);
      });
      
      if (existingTodayIndex >= 0) {
        const updated = [...prevStreaks];
        updated[existingTodayIndex] = {
          ...updated[existingTodayIndex],
          points: 0,
          tasksCompleted: 0
        };
        console.log('Reset today streak entry for new day:', updated[existingTodayIndex]);
        return updated;
      } else {
        const newTodayEntry = {
          date: today,
          points: 0,
          tasksCompleted: 0
        };
        console.log('Added new today streak entry:', newTodayEntry);
        return [...prevStreaks, newTodayEntry];
      }
    });
    
    toast.success("Your habits have been reset for a new day! 🌅", {
      duration: 4000,
    });
    
    const todayString = today.toISOString();
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
          
          const lastResetFromStorage = localStorage.getItem('lastDailyReset');
          const lastResetDate = lastResetFromStorage || new Date().toISOString();
          
          if (isNewDay(lastResetDate)) {
            console.log('New day detected for authenticated user, performing reset...');
            performDailyReset({
              badHabits: cloudProgress.bad_habits,
              goodHabits: cloudProgress.good_habits,
              rewards: cloudProgress.rewards,
              points: cloudProgress.points
            });
            
            setTasks(cloudProgress.tasks || INITIAL_TASKS);
            setPoints(cloudProgress.points || 50);
            setSpendablePoints(cloudProgress.points || 50);
            setDailyXPEarned(0);
            
            const todayString = startOfDay(new Date()).toISOString();
            localStorage.setItem('lastDailyReset', todayString);
          } else {
            console.log('Same day for authenticated user, loading normally...');
            setTasks(cloudProgress.tasks || INITIAL_TASKS);
            setBadHabits(cloudProgress.bad_habits || INITIAL_BAD_HABITS);
            setGoodHabits(cloudProgress.good_habits || INITIAL_GOOD_HABITS);
            setRewards(cloudProgress.rewards || INITIAL_REWARDS);
            setPoints(cloudProgress.points || 50);
            setSpendablePoints(cloudProgress.points || 50);
            setDailyXPEarned(cloudProgress.daily_xp_earned || 0);
            
            setBadHabitsAvoided((cloudProgress.bad_habits || INITIAL_BAD_HABITS).length);
          }
          
          toast.success("Progress loaded from your account!", { duration: 3000 });
        } else {
          console.log('No cloud progress found, using local data');
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
        
        // Load streaks FIRST with proper date parsing
        if (savedStreaks) {
          try {
            const parsedStreaks = JSON.parse(savedStreaks);
            const streaksWithDates = parsedStreaks.map((streak: any) => ({
              ...streak,
              date: streak.date instanceof Date ? streak.date : new Date(streak.date)
            }));
            setDailyStreaks(streaksWithDates);
            console.log('LOADED STREAK DATA WITH PROPER DATES:', streaksWithDates);
            
            // Set today's counters from existing streak data
            const today = startOfDay(new Date());
            const todayStreak = streaksWithDates.find((s: DailyStreak) => {
              const streakDate = s.date instanceof Date ? s.date : new Date(s.date);
              return streakDate && isSameDay(streakDate, today);
            });
            
            if (todayStreak) {
              setTodayPoints(todayStreak.points);
              setTodayTasksCompleted(todayStreak.tasksCompleted);
              console.log('Set today points and tasks from existing streak:', todayStreak);
            }
          } catch (e) {
            console.error("Error parsing streaks:", e);
            setDailyStreaks([]);
          }
        }
        
        if (savedTriggeredBadHabits) {
          try {
            const parsed = JSON.parse(savedTriggeredBadHabits);
            console.log('Loading triggered bad habits from localStorage:', parsed);
            setTriggeredBadHabitsToday(new Set(parsed));
          } catch (e) {
            console.error("Error parsing triggered bad habits:", e);
          }
        }
        
        if (isNewDay(lastResetDate)) {
          console.log('New day detected for local user, performing reset...');
          performDailyReset({
            badHabits: savedBadHabits,
            goodHabits: savedGoodHabits,
            rewards: savedRewards,
            points: savedPoints ? JSON.parse(savedPoints) : 50
          });
          
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
        } else {
          console.log('Same day for local user, loading normally...');
          
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
          
          if (savedBadHabits) {
            try {
              const parsedBadHabits = JSON.parse(savedBadHabits);
              setBadHabits(parsedBadHabits);
              console.log('Loaded bad habits from localStorage:', parsedBadHabits);
              
              if (savedStats) {
                try {
                  const stats = JSON.parse(savedStats);
                  setRewardsClaimed(stats.rewardsClaimed || 0);
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
      
      const streaksToSave = dailyStreaks.map(streak => ({
        ...streak,
        date: streak.date instanceof Date ? streak.date.toISOString() : streak.date
      }));
      localStorage.setItem('dailyStreaks', JSON.stringify(streaksToSave));
      console.log('SAVED STREAK DATA:', streaksToSave);
      
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
    console.log(`Updating streak for date: ${targetDate}, points: ${addPoints}, tasks: ${addTasksCompleted}`);
    
    setDailyStreaks(prevStreaks => {
      const targetDateString = startOfDay(targetDate);
      
      const idx = prevStreaks.findIndex(s => {
        if (!s.date) return false;
        
        const streakDate = s.date instanceof Date 
          ? startOfDay(s.date)
          : startOfDay(new Date(s.date));
        
        return isSameDay(streakDate, targetDateString);
      });
      
      if (idx >= 0) {
        const updated = [...prevStreaks];
        updated[idx] = {
          ...updated[idx],
          points: Math.max(0, updated[idx].points + addPoints),
          tasksCompleted: Math.max(0, updated[idx].tasksCompleted + addTasksCompleted)
        };
        console.log('Updated existing streak:', updated[idx]);
        return updated;
      } else {
        const newStreak = {
          date: targetDateString,
          points: Math.max(0, addPoints),
          tasksCompleted: Math.max(0, addTasksCompleted)
        };
        console.log('Added new streak:', newStreak);
        return [...prevStreaks, newStreak];
      }
    });
    
    const isToday = isSameDay(targetDate, startOfDay(new Date()));
    if (isToday) {
      setTodayPoints(prev => Math.max(0, prev + addPoints));
      if (addTasksCompleted !== 0) {
        setTodayTasksCompleted(prev => Math.max(0, prev + addTasksCompleted));
      }
    }
  };

  // Add points for a given date - ALWAYS record in streak calendar
  const addPoints = (pointsToAdd: number, forDate: Date = startOfDay(new Date())) => {
    const isToday = isSameDay(forDate, startOfDay(new Date()));
    let actualPointsToAdd = pointsToAdd;

    if (isToday) {
      let remainingDailyXP = MAX_DAILY_XP - dailyXPEarned;
      
      if (remainingDailyXP <= 0 && pointsToAdd > 0) {
        toast.warning(`You've reached the daily XP limit (${MAX_DAILY_XP} XP)`, { duration: 5000 });
        return 0;
      }
      
      if (pointsToAdd > 0) {
        actualPointsToAdd = Math.min(pointsToAdd, remainingDailyXP);
        if (actualPointsToAdd < pointsToAdd) {
          toast.warning(`Only added ${actualPointsToAdd} XP (daily limit: ${MAX_DAILY_XP} XP)`, { duration: 5000 });
        }
      }
      
      setPoints(prev => prev + actualPointsToAdd);
      setSpendablePoints(prev => prev + actualPointsToAdd);
      setDailyXPEarned(prev => prev + actualPointsToAdd);
    }
    
    updateDailyStreakForDate(forDate, actualPointsToAdd, 0);
    
    console.log(`Added ${actualPointsToAdd} points for date: ${forDate}`);
    return actualPointsToAdd;
  };

  // --- Task Completion ---
  const handleCompleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.completed) return;
    
    // Mark the task as completed first
    setTasks(tasks.map(t => (t.id === id ? { ...t, completed: true } : t)));
    
    // Add points for completing the task (for today)
    const earnedPoints = addPoints(task.points);
    
    // Update task count in streak calendar for today
    const today = startOfDay(new Date());
    updateDailyStreakForDate(today, 0, 1); // Add 1 to the task count
    
    console.log(`Task completed: ${task.title} - Added ${earnedPoints} points and updated task count`);
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
  
  return {
    tasks, badHabits, goodHabits, rewards, points, spendablePoints, activeTab,
    setTasks, setBadHabits, setGoodHabits, setRewards, setPoints, setSpendablePoints, setActiveTab,
    tasksCompleted, goodHabitsCompleted, badHabitsAvoided, rewardsClaimed,
    dailyStreaks, todayPoints, todayTasksCompleted, startOfDayLevel, dailyXPEarned,
    level, pointsToNextLevel, pointsNeededForNextLevel,
    handleAddTask, handleDeleteTask, handleEditTask, handleCompleteTask,
    handleAddGoodHabit, handleDeleteGoodHabit, handleCompleteGoodHabit,
    handleAddBadHabit, handleDeleteBadHabit, handleTriggerBadHabit,
    handleAddReward, handleDeleteReward, handleClaimReward,
    progressLoaded
  };
}
