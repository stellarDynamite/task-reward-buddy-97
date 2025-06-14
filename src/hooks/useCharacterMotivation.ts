
import { useState, useEffect } from "react";
import { toast } from 'sonner';

// Place persona constant here or import if reused
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

export function useCharacterMotivation() {
  const [showDialog, setShowDialog] = useState(false);
  const [favoriteCharacter, setFavoriteCharacter] = useState<string>('');
  const [characterInput, setCharacterInput] = useState('');
  const [hasReachedLevel3, setHasReachedLevel3] = useState(false);

  useEffect(() => {
    const savedCharacter = localStorage.getItem('favoriteCharacter');
    const savedHasReachedLevel3 = localStorage.getItem('hasReachedLevel3');
    if (savedCharacter) setFavoriteCharacter(savedCharacter);
    if (savedHasReachedLevel3) setHasReachedLevel3(JSON.parse(savedHasReachedLevel3));
  }, []);

  const handleCharacterSubmit = () => {
    if (characterInput.trim()) {
      const character = characterInput.toLowerCase().trim();
      setFavoriteCharacter(character);
      localStorage.setItem('favoriteCharacter', character);
      localStorage.setItem('hasReachedLevel3', JSON.stringify(true));
      setShowDialog(false);
      toast.success(`Great choice! ${characterInput} will be your motivation buddy!`);
    }
  };

  const getMotivationMessage = () => {
    const personas = CHARACTER_PERSONAS[favoriteCharacter] || [
      "Amazing work! You're absolutely crushing it today!",
      "Incredible dedication! Keep up the fantastic work!",
      "You're on fire! This is exactly the kind of effort that leads to success!"
    ];
    const randomMessage = personas[Math.floor(Math.random() * personas.length)];
    return `${favoriteCharacter.charAt(0).toUpperCase() + favoriteCharacter.slice(1)}: ${randomMessage}`;
  };

  return {
    showDialog, setShowDialog, favoriteCharacter, setFavoriteCharacter,
    characterInput, setCharacterInput, hasReachedLevel3, setHasReachedLevel3,
    handleCharacterSubmit, getMotivationMessage
  };
}
