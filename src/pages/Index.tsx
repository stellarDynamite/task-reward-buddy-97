import { useEffect } from 'react';
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
import { startOfDay, isSameDay } from 'date-fns';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useGameProgress } from '@/hooks/useGameProgress';
import { useCharacterMotivation } from '@/hooks/useCharacterMotivation';
import CharacterDialog from '@/components/CharacterDialog';
import { Button } from '@/components/ui/button';

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

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, loadProgress } = useUserProgress();

  // Fix: Only pass the required initial values 
  const {
    tasks, badHabits, goodHabits, rewards, points, spendablePoints, activeTab,
    setTasks, setBadHabits, setGoodHabits, setRewards, setPoints, setSpendablePoints, setActiveTab,
    tasksCompleted, goodHabitsCompleted, badHabitsAvoided, rewardsClaimed,
    dailyStreaks, todayPoints, todayTasksCompleted, startOfDayLevel, dailyXPEarned,
    handleAddTask, handleDeleteTask, handleEditTask, handleCompleteTask,
    handleAddGoodHabit, handleDeleteGoodHabit, handleCompleteGoodHabit,
    handleAddBadHabit, handleDeleteBadHabit, handleTriggerBadHabit,
    handleAddReward, handleDeleteReward, handleClaimReward,
    progressLoaded // <--- this should exist in the return object from useGameProgress
  } = useGameProgress({
    INITIAL_TASKS,
    INITIAL_BAD_HABITS,
    INITIAL_GOOD_HABITS,
    INITIAL_REWARDS
  });

  const {
    showDialog, setShowDialog, favoriteCharacter, characterInput, setCharacterInput,
    hasReachedLevel3, setHasReachedLevel3, handleCharacterSubmit, getMotivationMessage
  } = useCharacterMotivation();

  useEffect(() => {
    if (favoriteCharacter && todayTasksCompleted >= 3 && new Set(badHabits).size === 0) {
      if (todayTasksCompleted === 3) {
        toast.success(getMotivationMessage(), {
          duration: 8000,
        });
      }
    }
  }, [todayTasksCompleted, badHabits, favoriteCharacter, getMotivationMessage]);

  // Fix: Only return the loading screen if progress is NOT loaded yet
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
      
      <CharacterDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        input={characterInput}
        setInput={setCharacterInput}
        onSubmit={handleCharacterSubmit}
      />
      
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <Dashboard
            points={points}
            level={startOfDayLevel}
            pointsToNextLevel={0}
            pointsNeededForNextLevel={0}
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
          triggeredBadHabitsToday={new Set()}
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
