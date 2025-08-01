
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

// Calculate points needed for each level: 100, 150, 200, 250, etc.
const getPointsNeededForLevel = (level: number): number => {
  return 100 + (level - 1) * 50;
};

// Calculate current level based on total points, but never decrease
const calculateLevel = (points: number, startOfDayLevel: number): [number, number, number] => {
  let level = 1;
  let totalPointsUsed = 0;
  
  // Keep leveling up while we have enough points
  while (true) {
    const pointsNeededForThisLevel = getPointsNeededForLevel(level);
    if (points < totalPointsUsed + pointsNeededForThisLevel) {
      break;
    }
    totalPointsUsed += pointsNeededForThisLevel;
    level++;
  }
  
  // Never decrease level from start of day
  level = Math.max(level, startOfDayLevel);
  
  // Calculate points in current level and points needed for next level
  const pointsInCurrentLevel = Math.max(0, points - totalPointsUsed);
  const pointsNeededForNextLevel = getPointsNeededForLevel(level);
  
  console.log(`Level calc: ${points} points -> Level ${level}, ${pointsInCurrentLevel}/${pointsNeededForNextLevel} to next`);
  
  return [level, pointsInCurrentLevel, pointsNeededForNextLevel];
};

// FIXED: Handle when lastResetDateIso is null/undefined - should trigger reset
function isNewDay(lastResetDateIso?: string | null): boolean {
  if (!lastResetDateIso) return true; // FIXED: No previous reset = trigger reset
  const last = new Date(lastResetDateIso);
  const now = new Date();
  // Compare at day granularity
  return (
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth() !== now.getUTCMonth() ||
    last.getUTCDate() !== now.getUTCDate()
  );
}

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

  const [highestLevel, setHighestLevel] = useState(1); // <-- New state for max level ever reached

  // Calculate level using startOfDayLevel to prevent decreasing within the same day
  const [level, pointsToNextLevel, pointsNeededForNextLevel] = calculateLevel(points, startOfDayLevel);

  // Helper function to perform daily reset - FIXED: Only reset daily values, not persistent stats
  const performDailyReset = (loadedTasks: Task[], loadedBadHabits: BadHabit[], loadedGoodHabits: GoodHabit[], loadedRewards: Reward[]) => {
    console.log('Performing daily reset...');
    
    // Reset tasks completion status for new day
    const resetTasks = loadedTasks.map(task => ({ ...task, completed: false }));
    setTasks(resetTasks);
    
    // Reset good habits completion status for new day
    const resetGoodHabits = loadedGoodHabits.map(habit => ({ ...habit, completed: false }));
    setGoodHabits(resetGoodHabits);
    
    // Reset rewards claimed status
    const resetRewards = loadedRewards.map(reward => ({ ...reward, claimed: false }));
    setRewards(resetRewards);
    
    // Reset bad habits tracking for today
    setTriggeredBadHabitsToday(new Set());
    
    // Reset badHabitsAvoided count to total bad habits (all avoided at start of day)
    setBadHabitsAvoided(loadedBadHabits.length);
    
    // Reset daily XP earned
    setDailyXPEarned(0);
    
    // Store the new reset date
    const todayString = startOfDay(new Date()).toISOString();
    localStorage.setItem('lastDailyReset', todayString);
    
    console.log('Daily reset completed - all habits, tasks, and rewards reset for new day');
  };

  // Helper: Update highestLevel when a new level is gained, including cloud sync.
  const maybeUpdateHighestLevel = (newPoints: number) => {
    const [calcLevel] = calculateLevel(newPoints, startOfDayLevel);
    if (calcLevel > highestLevel) {
      setHighestLevel(calcLevel);
      if (user) {
        saveProgress({ highestLevel: calcLevel });
      } else {
        localStorage.setItem("highestLevel", JSON.stringify(calcLevel));
      }
    }
  };
  
  // Patch addPoints to update highestLevel when needed
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
      
      setPoints(prev => {
        const newPts = prev + actualPointsToAdd;
        maybeUpdateHighestLevel(newPts); // Patch: update highestLevel here
        return newPts;
      });
      setSpendablePoints(prev => prev + actualPointsToAdd);
      setDailyXPEarned(prev => prev + actualPointsToAdd);
    }
    
    updateDailyStreakForDate(forDate, actualPointsToAdd, 0);
    
    console.log(`Added ${actualPointsToAdd} points for date: ${forDate}`);
    return actualPointsToAdd;
  };

  // On load: try to load highestLevel from Supabase/localStorage
  useEffect(() => {
    const initializeProgress = async () => {
      if (authLoading) return;
      if (user && !progressLoaded) {
        const cloudProgress = await loadProgress();
        if (cloudProgress) {
          // Highest level (cloud): fallback logic for legacy users
          setHighestLevel(
            typeof cloudProgress.highestLevel === "number"
              ? cloudProgress.highestLevel
              : (typeof cloudProgress.level === "number" ? cloudProgress.level : 1)
          );
          // --- SUPABASE: Always prefer cloud streak data if present ---
          if (Array.isArray(cloudProgress.daily_streaks)) {
            setDailyStreaks(
              cloudProgress.daily_streaks.map((streak: any) => ({
                ...streak,
                date: streak.date instanceof Date ? streak.date : new Date(streak.date)
              }))
            );
            console.log('[StreakCal] Loaded streaks from Supabase:', cloudProgress.daily_streaks);
          } else {
            setDailyStreaks([]);
          }

          // Load streaks FIRST with proper date parsing
          const lastResetFromStorage = localStorage.getItem('lastDailyReset');
          const lastResetDate = lastResetFromStorage || new Date().toISOString();
          
          // Get current bad habits from localStorage as fallback
          let localBadHabits = INITIAL_BAD_HABITS;
          const savedBadHabits = localStorage.getItem('badHabits');
          if (savedBadHabits) {
            try {
              localBadHabits = JSON.parse(savedBadHabits);
            } catch (e) {
              console.error("Error parsing local bad habits:", e);
            }
          }
          
          // Use cloud data if valid, otherwise use localStorage data
          const finalBadHabits = Array.isArray(cloudProgress.bad_habits) && cloudProgress.bad_habits.length > 0 
            ? cloudProgress.bad_habits 
            : localBadHabits;
          
          if (isNewDay(lastResetDate)) {
            console.log('New day detected for authenticated user, performing reset...');
            performDailyReset(
              cloudProgress.tasks || INITIAL_TASKS,
              finalBadHabits,
              cloudProgress.good_habits || INITIAL_GOOD_HABITS,
              cloudProgress.rewards || INITIAL_REWARDS
            );

            setPoints(cloudProgress.points || 50);
            setSpendablePoints(cloudProgress.points || 50);

            // DO NOT wipe dailyStreaks!
            // Today's entry will be appended by updateDailyStreakForDate if user acts today
          } else {
            setTasks(cloudProgress.tasks || INITIAL_TASKS);
            setBadHabits(finalBadHabits);
            setGoodHabits(cloudProgress.good_habits || INITIAL_GOOD_HABITS);
            setRewards(cloudProgress.rewards || INITIAL_REWARDS);
            setPoints(cloudProgress.points || 50);
            setSpendablePoints(cloudProgress.points || 50);
            setDailyXPEarned(cloudProgress.daily_xp_earned || 0);
            
            // FIXED: Load badHabitsAvoided from saved data instead of always resetting
            // Calculate badHabitsAvoided based on triggered habits
            const triggeredHabits = new Set(JSON.parse(localStorage.getItem('triggeredBadHabitsToday') || '[]'));
            setBadHabitsAvoided(finalBadHabits.length - triggeredHabits.size);
          }
          toast.success("Progress loaded from your account!", { duration: 3000 });
        } else {
          // No cloud progress found, push current local state (now includes highestLevel!)
          await saveProgress({
            tasks,
            bad_habits: badHabits,
            good_habits: goodHabits,
            rewards,
            points,
            daily_xp_earned: dailyXPEarned,
            daily_streaks: dailyStreaks.map(s => ({
              ...s,
              date: s.date instanceof Date ? s.date.toISOString() : s.date // Always store as ISO
            })),
            highestLevel,
          });
        }
        setProgressLoaded(true);
      } else if (!user) {
        // Guests: localStorage
        const savedHighest = localStorage.getItem("highestLevel");
        if (savedHighest) {
          setHighestLevel(JSON.parse(savedHighest));
        }
        // Load progress from localStorage...
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
        
        // Parse saved data first
        let parsedTasks = INITIAL_TASKS;
        let parsedBadHabits = INITIAL_BAD_HABITS;
        let parsedGoodHabits = INITIAL_GOOD_HABITS;
        let parsedRewards = INITIAL_REWARDS;
        
        if (savedTasks) {
          try {
            parsedTasks = JSON.parse(savedTasks).map((task: Task) => parseDates(task));
          } catch (e) {
            console.error("Error parsing tasks:", e);
          }
        }
        
        if (savedBadHabits) {
          try {
            parsedBadHabits = JSON.parse(savedBadHabits);
          } catch (e) {
            console.error("Error parsing bad habits:", e);
          }
        }
        
        if (savedGoodHabits) {
          try {
            parsedGoodHabits = JSON.parse(savedGoodHabits);
          } catch (e) {
            console.error("Error parsing good habits:", e);
          }
        }
        
        if (savedRewards) {
          try {
            parsedRewards = JSON.parse(savedRewards);
          } catch (e) {
            console.error("Error parsing rewards:", e);
          }
        }
        
        // Load streaks FIRST with proper date parsing
        if (savedStreaks) {
          try {
            const parsedStreaks = JSON.parse(savedStreaks);
            setDailyStreaks(
              parsedStreaks.map((streak: any) => ({
                ...streak,
                date: streak.date instanceof Date ? streak.date : new Date(streak.date)
              }))
            );
            console.log('[StreakCal][Local] Loaded streaks:', parsedStreaks);
            
            // Set today's counters from existing streak data
            const today = startOfDay(new Date());
            const todayStreak = parsedStreaks.find((s: DailyStreak) => {
              const streakDate = s.date instanceof Date ? s.date : new Date(s.date);
              return streakDate && isSameDay(streakDate, today);
            });
            
            if (todayStreak) {
              setTodayPoints(todayStreak.points);
              setTodayTasksCompleted(todayStreak.tasksCompleted);
              console.log('[StreakCal][Local] Set today points/tasks from streak:', todayStreak);
            }
          } catch (e) {
            console.error("Error parsing streaks:", e);
            setDailyStreaks([]);
          }
        }
        
        let triggeredHabitsSet = new Set<string>();
        if (savedTriggeredBadHabits) {
          try {
            const parsed = JSON.parse(savedTriggeredBadHabits);
            console.log('Loading triggered bad habits from localStorage:', parsed);
            triggeredHabitsSet = new Set(parsed);
            setTriggeredBadHabitsToday(triggeredHabitsSet);
          } catch (e) {
            console.error("Error parsing triggered bad habits:", e);
          }
        }
        
        if (isNewDay(lastResetDate)) {
          console.log('New day detected for local user, performing reset...');
          performDailyReset(parsedTasks, parsedBadHabits, parsedGoodHabits, parsedRewards);
          
          if (savedPoints) setPoints(JSON.parse(savedPoints));
          if (savedSpendablePoints) {
            setSpendablePoints(JSON.parse(savedSpendablePoints));
          } else if (savedPoints) {
            setSpendablePoints(JSON.parse(savedPoints));
          }
        } else {
          console.log('Same day for local user, loading normally...');
          
          setTasks(parsedTasks);
          setBadHabits(parsedBadHabits);
          setGoodHabits(parsedGoodHabits);
          setRewards(parsedRewards);
          
          if (savedPoints) setPoints(JSON.parse(savedPoints));
          if (savedSpendablePoints) {
            setSpendablePoints(JSON.parse(savedSpendablePoints));
          } else if (savedPoints) {
            setSpendablePoints(JSON.parse(savedPoints));
          }
          
          // FIXED: Calculate badHabitsAvoided correctly based on triggered habits
          if (savedStats) {
            try {
              const stats = JSON.parse(savedStats);
              setRewardsClaimed(stats.rewardsClaimed || 0);
              
              // Calculate correctly: total bad habits minus triggered habits
              const calculatedAvoided = parsedBadHabits.length - triggeredHabitsSet.size;
              setBadHabitsAvoided(calculatedAvoided);
              console.log('Calculated badHabitsAvoided:', calculatedAvoided, 'from total:', parsedBadHabits.length, 'triggered:', triggeredHabitsSet.size);
            } catch (e) {
              console.error("Error parsing stats:", e);
              setBadHabitsAvoided(parsedBadHabits.length - triggeredHabitsSet.size);
            }
          } else {
            setBadHabitsAvoided(parsedBadHabits.length - triggeredHabitsSet.size);
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
          daily_xp_earned: dailyXPEarned,
          daily_streaks: dailyStreaks.map(s => ({
            ...s,
            date: s.date instanceof Date ? s.date.toISOString() : s.date // Always store as ISO
          })),
          highestLevel,
        });
      };
      const timeoutId = setTimeout(saveToCloud, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [user, progressLoaded, tasks, badHabits, goodHabits, rewards, points, dailyXPEarned, dailyStreaks, highestLevel]);

  useEffect(() => {
    if (!user && progressLoaded) {
      const streaksToSave = dailyStreaks.map(streak => ({
        ...streak,
        date: streak.date instanceof Date ? streak.date.toISOString() : streak.date
      }));
      localStorage.setItem('dailyStreaks', JSON.stringify(streaksToSave));
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
      
      localStorage.setItem('startOfDayLevel', JSON.stringify(startOfDayLevel));
      localStorage.setItem('dailyXPEarned', JSON.stringify(dailyXPEarned));
      localStorage.setItem('highestLevel', JSON.stringify(highestLevel));
    }
  }, [user, progressLoaded, tasks, badHabits, goodHabits, rewards, points, spendablePoints, dailyStreaks, startOfDayLevel, dailyXPEarned, rewardsClaimed, badHabitsAvoided, highestLevel]);
  
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
  
  // --- Clear Completed Tasks ---
  const handleClearCompletedTasks = () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) {
      toast.info("No completed tasks to clear");
      return;
    }
    
    setTasks(tasks.filter(t => !t.completed));
    toast.success(`Cleared ${completedTasks.length} completed tasks`);
  };
  
  return {
    tasks, badHabits, goodHabits, rewards, points, spendablePoints, activeTab,
    setTasks, setBadHabits, setGoodHabits, setRewards, setPoints, setSpendablePoints, setActiveTab,
    tasksCompleted, goodHabitsCompleted, badHabitsAvoided, rewardsClaimed,
    dailyStreaks, todayPoints, todayTasksCompleted, startOfDayLevel, dailyXPEarned,
    level, pointsToNextLevel, pointsNeededForNextLevel, triggeredBadHabitsToday,
    handleAddTask, handleDeleteTask, handleEditTask, handleCompleteTask, handleClearCompletedTasks,
    handleAddGoodHabit, handleDeleteGoodHabit, handleCompleteGoodHabit,
    handleAddBadHabit, handleDeleteBadHabit, handleTriggerBadHabit,
    handleAddReward, handleDeleteReward, handleClaimReward,
    progressLoaded
  };
}
