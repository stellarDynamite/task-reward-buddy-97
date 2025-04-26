
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
  let level = startOfDayLevel;
  let totalPointsNeeded = getPointsNeededForLevel(level);
  let previousLevelPoints = 0;
  
  // Only increase level if points exceed the next threshold
  while (points >= totalPointsNeeded) {
    level++;
    previousLevelPoints = totalPointsNeeded;
    totalPointsNeeded += getPointsNeededForLevel(level);
  }
  
  // Points progress within current level
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
  
  // Calculate level information with floor at startOfDayLevel
  const [level, pointsToNextLevel, pointsNeededForNextLevel] = calculateLevel(points, startOfDayLevel);
  
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
        // Make sure we parse the dates properly
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
      // Reset for a new day
      const currentLevel = calculateLevel(savedPoints ? JSON.parse(savedPoints) : 50, startOfDayLevel)[0];
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
  
  /**
   * Utility function: Update or add points/tasks for a specific date in streaks
   */
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

  /**
   * Add points for a given date
   * - "forDate" should be the date points were earned; defaults to today.
   */
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
  
  // --- Bad Habit Tracking ---
  const handleTriggerBadHabit = (id: string) => {
    const badHabit = badHabits.find(h => h.id === id);
    if (!badHabit) return;
    
    // Subtract points for triggering a bad habit
    const lostPoints = -badHabit.points; // Negative points
    addPoints(lostPoints);
    
    // Decrement the "avoided" count
    setBadHabitsAvoided(prev => Math.max(0, prev - 1));
    
    console.log(`Bad habit triggered: ${badHabit.title} - Lost ${Math.abs(lostPoints)} points`);
  };

  // --- Reward Claiming ---
  const handleClaimReward = (id: string) => {
    const reward = rewards.find(r => r.id === id);
    if (!reward || reward.claimed) return;
    
    // Check if user has enough points
    if (points < reward.points) {
      toast.error(`Not enough points to claim "${reward.title}"`);
      return;
    }
    
    // Subtract points for claiming the reward
    setPoints(prev => prev - reward.points);
    
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
  
  // --- Bad Habit Management ---
  const handleAddBadHabit = (badHabit: BadHabit) => {
    setBadHabits([...badHabits, badHabit]);
    // When adding a new bad habit, increase the "avoided" count
    setBadHabitsAvoided(prev => prev + 1);
  };
  
  const handleDeleteBadHabit = (id: string) => {
    // Check if the bad habit to delete is still being "avoided"
    const isAvoided = badHabitsAvoided > 0 && badHabitsAvoided === badHabits.length;
    
    setBadHabits(badHabits.filter(h => h.id !== id));
    
    // If all bad habits were being avoided, decrement the count when one is deleted
    if (isAvoided) {
      setBadHabitsAvoided(prev => Math.max(0, prev - 1));
    }
  };
  
  // --- Reward Management ---
  const handleAddReward = (reward: Reward) => {
    setRewards([...rewards, reward]);
  };
  
  const handleDeleteReward = (id: string) => {
    // Check if the reward being deleted was claimed
    const reward = rewards.find(r => r.id === id);
    const wasClaimed = reward?.claimed || false;
    
    setRewards(rewards.filter(r => r.id !== id));
    
    // If a claimed reward is being deleted, decrement the count
    if (wasClaimed) {
      setRewardsClaimed(prev => Math.max(0, prev - 1));
    }
  };
  
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
          userPoints={points}
          onAddReward={handleAddReward}
          onClaimReward={handleClaimReward}
          onDeleteReward={handleDeleteReward}
        />
      )}
    </div>
  );
};

export default Index;
