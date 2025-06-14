
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: string;
  setInput: (val: string) => void;
  onSubmit: () => void;
}

const CharacterDialog = ({ open, onOpenChange, input, setInput, onSubmit }: CharacterDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip for now
          </Button>
          <Button onClick={onSubmit} disabled={!input.trim()}>
            Choose Character
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default CharacterDialog;
