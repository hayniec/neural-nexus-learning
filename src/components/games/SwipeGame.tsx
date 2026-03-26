import { useState } from 'react';
import './SwipeGame.css';
import type { SwipeData } from '../../services/aiService';

import type { GameOptions } from './QuizGame';

interface SwipeGameProps {
  levelData: SwipeData;
  onBack: () => void;
  onComplete?: (score: number, maxScore: number) => void;
  gameOptions?: GameOptions;
}

export default function SwipeGame({ levelData, onBack, onComplete }: SwipeGameProps) {
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [isFinished, setIsFinished] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Fallback
  if (!levelData || !levelData.nodes || levelData.nodes.length === 0) {
    return (
      <div className="game-container">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Whoops!</h2>
          <p>The AI didn't generate any statements for that text.</p>
          <button className="btn-primary" onClick={onBack} style={{ marginTop: '2rem' }}>Go Back</button>
        </div>
      </div>
    );
  }

  const currentNode = levelData.nodes[currentNodeIndex];
  const maxScore = levelData.nodes.length * 100;

  const handleSwipe = (guess: boolean) => {
    if (swipeDirection !== null) return;
    
    setSwipeDirection(guess ? 'right' : 'left');

    if (guess === currentNode.isTrue) {
      setFeedback('correct');
      setScore(s => s + 100);
    } else {
      setFeedback('incorrect');
    }

    setTimeout(() => {
      if (currentNodeIndex < levelData.nodes.length - 1) {
        setCurrentNodeIndex(i => i + 1);
        setFeedback('none');
        setSwipeDirection(null);
      } else {
        setIsFinished(true);
      }
    }, 1200);
  };

  if (isFinished) {
    return (
      <div className="game-container">
        <div className="victory-screen glass-panel">
          <h2>Swipe Challenge Complete! ⚡</h2>
          <div className="final-score">Synapses Forged: {score} / {maxScore}</div>
          <p>Excellent pattern recognition.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            {onComplete && (
              <button className="btn-primary" onClick={() => onComplete(score, maxScore)}>Claim Rewards 💎</button>
            )}
            <button className="btn-secondary" onClick={onBack}>Exit without Saving</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <button className="btn-back" onClick={onBack}>← Return to Hub</button>
        <h2>{levelData.title}</h2>
        <div className="score-display">⚡ {score}</div>
      </div>

      <div className="node-progress">
        {levelData.nodes.map((_, i) => (
          <div key={i} className={`node-indicator ${i < currentNodeIndex ? 'completed' : ''} ${i === currentNodeIndex ? 'active' : ''}`}></div>
        ))}
      </div>

      <div className="swipe-area">
        <div className={`swipe-card glass-panel ${swipeDirection ? `swiping-${swipeDirection}` : ''}`}>
          <h3 className="statement-text">{currentNode.statement}</h3>
          
          {feedback !== 'none' && (
            <div className={`feedback-overlay ${feedback}`}>
              {feedback === 'correct' ? '✅ Correct' : '❌ Incorrect'}
              {feedback === 'incorrect' && (
                <div className="explanation">
                  <strong>Fact Check:</strong> {currentNode.explanation}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="swipe-controls">
          <button 
            className="btn-swipe left" 
            onClick={() => handleSwipe(false)}
            disabled={feedback !== 'none'}
          >
            ❌ FALSE Match
          </button>
          <button 
            className="btn-swipe right" 
            onClick={() => handleSwipe(true)}
            disabled={feedback !== 'none'}
          >
            TRUE Match ✅
          </button>
        </div>
      </div>
    </div>
  );
}
