
import { useState } from 'react';
import { Gift, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export interface Reward {
  id: string;
  title: string;
  points: number;
  claimed: boolean;
}

interface RewardListProps {
  rewards: Reward[];
  userPoints: number;
  onAddReward: (reward: Reward) => void;
  onClaimReward: (id: string) => void;
  onDeleteReward: (id: string) => void;
}

const RewardList = ({ rewards, userPoints, onAddReward, onClaimReward, onDeleteReward }: RewardListProps) => {
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [rewardPoints, setRewardPoints] = useState('50');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleAddReward = () => {
    if (newRewardTitle.trim() === '') {
      toast.error('Please enter a reward title');
      return;
    }
    
    const newReward: Reward = {
      id: Date.now().toString(),
      title: newRewardTitle,
      points: parseInt(rewardPoints),
      claimed: false,
    };
    
    onAddReward(newReward);
    setNewRewardTitle('');
    setRewardPoints('50');
    setIsDialogOpen(false);
    toast.success('New reward added!');
  };

  const handleClaimReward = (reward: Reward) => {
    if (userPoints < reward.points) {
      toast.error(`Not enough points. You need ${reward.points - userPoints} more points.`);
      return;
    }
    
    onClaimReward(reward.id);
    toast.success(`Reward claimed! Enjoy your "${reward.title}"!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Rewards</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Reward
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Reward</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="rewardTitle">Reward Title</Label>
                <Input
                  id="rewardTitle"
                  placeholder="Enter reward title..."
                  value={newRewardTitle}
                  onChange={(e) => setNewRewardTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rewardPoints">Points Cost</Label>
                <Select
                  value={rewardPoints}
                  onValueChange={setRewardPoints}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select points" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 points</SelectItem>
                    <SelectItem value="100">100 points</SelectItem>
                    <SelectItem value="200">200 points</SelectItem>
                    <SelectItem value="500">500 points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddReward}>Add Reward</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {rewards.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>No rewards yet. Add some rewards to motivate yourself!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.filter(reward => !reward.claimed).map((reward) => (
            <Card key={reward.id} className="reward-card overflow-hidden border-primary/20">
              <div className="bg-primary/10 p-4 flex items-center gap-3">
                <div className="rounded-full bg-primary/20 p-2">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{reward.title}</h3>
                </div>
              </div>
              <CardContent className="p-4 pt-4 flex items-center justify-between">
                <div className="text-lg font-bold">{reward.points} points</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={userPoints < reward.points}
                    onClick={() => handleClaimReward(reward)}
                    className="flex items-center gap-1"
                  >
                    <ShoppingCart className="h-4 w-4" /> 
                    {userPoints < reward.points ? `Need ${reward.points - userPoints} more` : 'Claim Reward'}
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="p-0 border-t border-primary/10">
                <Button
                  variant="ghost"
                  className="w-full rounded-none h-10 text-xs text-muted-foreground"
                  onClick={() => onDeleteReward(reward.id)}
                >
                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {rewards.some(reward => reward.claimed) && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-muted-foreground mb-3">Claimed Rewards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
            {rewards.filter(reward => reward.claimed).map((reward) => (
              <Card key={reward.id} className="bg-muted">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Gift className="h-4 w-4 text-primary" />
                    </div>
                    <span>{reward.title}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {reward.points} points
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardList;
