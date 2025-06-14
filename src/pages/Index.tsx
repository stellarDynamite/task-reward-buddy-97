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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

// Character personas for notifications
const CHARACTER_PERSONAS: { [key: string]: string[] } = {
  bakugo: [
    "DIE! I mean... good job, you damn nerd! Keep pushing yourself harder!",
    "Tch! Not bad for a weakling. You're getting stronger, I'll give you that!",
    "WHAT?! You actually did it! Don't think this makes you better than me!",
    "Finally showing some backbone! Keep this up and maybe you won't be completely useless!",
    "I HATE admitting this, but... you're not as pathetic as I thought. KEEP GOING!"
  ],
  naruto: [
    "Dattebayo! That was amazing! You're getting closer to your dreams!",
    "Believe it! You're working so hard, I'm really proud of you!",
    "That's the spirit! Never give up, that's your ninja way!",
    "Ramen celebration time! You earned it with all that hard work!",
    "You're becoming stronger every day! I can see your determination burning bright!"
  ],
  goku: [
    "Wow! That was incredible! You're getting so much stronger!",
    "Amazing! I can feel your power level rising! Keep training!",
    "That's the spirit! Hard work always pays off!",
    "Fantastic! You remind me of myself when I was training!",
    "Your dedication is inspiring! Let's celebrate with some food!"
  ],
  luffy: [
    "Awesome! You're like a real nakama now! Let's have a feast!",
    "That was so cool! You never gave up, just like a true pirate!",
    "Incredible! You're getting closer to your treasure!",
    "Amazing work! You're definitely crew material!",
    "That spirit! That's what being free is all about!"
  ]
};

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
  
  // Character selection state
  const [showCharacterDialog, setShowCharacterDialog] = useState(false);
  const [favoriteCharacter, setFavoriteCharacter] = useState<string>('');
  const [characterInput, setCharacterInput] = useState('');
  const [hasReachedLevel3, setHasReachedLevel3] = useState(false);
  
  // Calculate level information with floor at startOfDayLevel
  const [level, pointsToNextLevel, pointsNeededForNextLevel] = calculateLevel(points, startOfDayLevel);

  // Check if user reached level 3 and show character dialog
  useEffect(() => {
    if (level >= 3 && !hasReachedLevel3 && !favoriteCharacter) {
      setShowCharacterDialog(true);
      setHasReachedLevel3(true);
    }
  }, [level, hasReachedLevel3, favoriteCharacter]);

  // Load favorite character from storage
  useEffect(() => {
    const savedCharacter = localStorage.getItem('favoriteCharacter');
    const savedHasReachedLevel3 = localStorage.getItem('hasReachedLevel3');
    
    if (savedCharacter) {
      setFavoriteCharacter(savedCharacter);
    }
    if (savedHasReachedLevel3) {
      setHasReachedLevel3(JSON.parse(savedHasReachedLevel3));
    }
  }, []);

  // Save character selection
  const handleCharacterSubmit = () => {
    if (characterInput.trim()) {
      const character = characterInput.toLowerCase().trim();
      setFavoriteCharacter(character);
      localStorage.setItem('favoriteCharacter', character);
      localStorage.setItem('hasReachedLevel3', JSON.stringify(true));
      setShowCharacterDialog(false);
      
      toast.success(`Great choice! ${characterInput} will be your motivation buddy!`);
    }
  };

  // Show character notification when conditions are met
  const showCharacterNotification = () => {
    if (!favoriteCharacter || todayTasksCompleted < 3 || triggeredBadHabitsToday.size > 0) return;
    
    const personas = CHARACTER_PERSONAS[favoriteCharacter] || [
      "Amazing work! You're absolutely crushing it today!",
      "Incredible dedication! Keep up the fantastic work!",
      "You're on fire! This is exactly the kind of effort that leads to success!"
    ];
    
    const randomMessage = personas[Math.floor(Math.random() * personas.length)];
    
    toast.success(`${favoriteCharacter.charAt(0).toUpperCase() + favoriteCharacter.slice(1)}: ${randomMessage}`, {
      duration: 8000,
    });
  };

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
  
  // Check for character notification when tasks completed changes
  useEffect(() => {
    if (favoriteCharacter && todayTasksCompleted >= 3 && triggeredBadHabitsToday.size === 0) {
      // Show notification only when exactly hitting 3 tasks
      if (todayTasksCompleted === 3) {
        showCharacterNotification();
      }
    }
  }, [todayTasksCompleted, triggeredBadHabitsToday.size, favoriteCharacter]);
  
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
      
      {/* Character Selection Dialog */}
      <Dialog open={showCharacterDialog} onOpenChange={setShowCharacterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 Congratulations on reaching Level 3!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p>You've unlocked character motivation! Choose your favorite character who will cheer you on when you complete 3+ tasks without any bad habits.</p>
            <div className="space-y-2">
              <Label htmlFor="character">Enter your favorite character name:</Label>
              <Input
                id="character"
                placeholder="e.g., Bakugo, Naruto, Goku, Luffy..."
                value={characterInput}
                onChange={(e) => setCharacterInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCharacterSubmit()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCharacterDialog(false)}>
                Skip for now
              </Button>
              <Button onClick={handleCharacterSubmit} disabled={!characterInput.trim()}>
                Choose Character
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
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
          
          {favoriteCharacter && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg border">
              <p className="text-sm text-purple-700">
                <strong>Motivation Buddy:</strong> {favoriteCharacter.charAt(0).toUpperCase() + favoriteCharacter.slice(1)} is cheering you on! 
                Complete 3+ tasks without bad habits to get a special message! 🎯
              </p>
            </div>
          )}
          
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
