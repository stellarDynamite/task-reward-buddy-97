
import { useState, useEffect } from 'react';

interface CelebrationEffectsProps {
  confettiCount: number;
  showBalloons: boolean;
  showRainbow: boolean;
}

const CelebrationEffects = ({ confettiCount, showBalloons, showRainbow }: CelebrationEffectsProps) => {
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    if (confettiCount > 0) {
      setIsActive(true);
      
      const timer = setTimeout(() => {
        setIsActive(false);
      }, 4000); // Animation duration
      
      return () => clearTimeout(timer);
    }
  }, [confettiCount]);
  
  if (!isActive) return null;
  
  // Create confetti pieces
  const confetti = Array.from({ length: confettiCount * 10 }, (_, i) => {
    const randomColor = [
      'bg-pink-400',
      'bg-blue-400',
      'bg-green-400', 
      'bg-purple-400',
      'bg-yellow-400'
    ][Math.floor(Math.random() * 5)];
    
    return (
      <div 
        key={i}
        className={`confetti fixed ${randomColor}`}
        style={{
          left: `${Math.random() * 100}vw`,
          animationDuration: `${Math.random() * 3 + 2}s`,
          animationDelay: `${Math.random() * 0.5}s`
        }}
      />
    );
  });
  
  // Create balloons
  const balloons = showBalloons ? Array.from({ length: 8 }, (_, i) => {
    const colors = [
      'bg-pink-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-green-500',
    ];
    const size = Math.random() * 30 + 40;
    
    return (
      <div 
        key={`balloon-${i}`} 
        className={`fixed rounded-full ${colors[i % colors.length]}`}
        style={{
          width: `${size}px`,
          height: `${size * 1.2}px`,
          bottom: '-50px',
          left: `${10 + (i * 10)}%`,
          animation: `balloon-float ${Math.random() * 3 + 5}s ease-in-out forwards`,
          animationDelay: `${Math.random() * 1}s`,
          boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
        }}
      >
        {/* Balloon string */}
        <div 
          className="absolute w-1 h-20 bg-gray-300" 
          style={{ 
            left: '50%',
            top: '100%',
            transform: 'translateX(-50%)',
            transformOrigin: 'top'
          }} 
        />
      </div>
    );
  }) : [];
  
  // Create rainbow effect
  const rainbow = showRainbow ? (
    <div 
      className="fixed inset-0 pointer-events-none z-10 opacity-0 animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(255,0,0,0.3) 0%, rgba(255,165,0,0.3) 20%, rgba(255,255,0,0.3) 40%, rgba(0,128,0,0.3) 60%, rgba(0,0,255,0.3) 80%, rgba(128,0,128,0.3) 100%)',
        animation: 'fade-in-out 3s ease-in-out forwards',
      }}
    />
  ) : null;
  
  return (
    <>
      {confetti}
      {balloons}
      {rainbow}
    </>
  );
};

export default CelebrationEffects;
