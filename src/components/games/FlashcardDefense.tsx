import { useState, useEffect, useRef } from 'react';
import './FlashcardDefense.css';
import type { FlashcardData } from '../../services/aiService';

import type { GameOptions } from './QuizGame';

interface FlashcardDefenseProps {
  levelData: FlashcardData;
  onBack: () => void;
  onComplete?: (score: number, maxScore: number) => void;
  gameOptions?: GameOptions;
}

export default function FlashcardDefense({ levelData, onBack, onComplete, gameOptions }: FlashcardDefenseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'skipped' | 'incorrect'>('none');
  const [isFinished, setIsFinished] = useState(false);
  const [attemptsTrack, setAttemptsTrack] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto focus the input field always
    inputRef.current?.focus();
  }, [currentIndex, feedback]);

  // Fallback
  if (!levelData || !levelData.nodes || levelData.nodes.length === 0) {
    return (
      <div className="game-container">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Whoops!</h2>
          <p>The AI didn't generate any flashcards for that text.</p>
          <button className="btn-primary" onClick={onBack} style={{ marginTop: '2rem' }}>Go Back</button>
        </div>
      </div>
    );
  }

  const currentNode = levelData.nodes[currentIndex];
  const maxScore = levelData.nodes.length * 200;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // Only auto-submit perfect matches if infinite attempts & not test mode
    if (!gameOptions?.isTestMode && (!gameOptions?.maxAttempts || gameOptions.maxAttempts === 0)) {
      const cleanGuessed = e.target.value.trim().toLowerCase();
      const cleanAnswer = currentNode.answer.trim().toLowerCase();
      if (cleanGuessed === cleanAnswer) {
        submitAnswer(cleanGuessed, cleanAnswer);
      }
    }
  };

  const submitAnswer = (guessed: string, answer: string) => {
    const isTest = gameOptions?.isTestMode || false;
    const maxTries = gameOptions?.maxAttempts || 0;
    const currentAttempts = attemptsTrack + 1;
    setAttemptsTrack(currentAttempts);

    if (guessed === answer) {
      setFeedback('correct');
      if (currentAttempts === 1) {
        setScore(s => s + 200);
      } else {
        setScore(s => s + 50); // lower score for retries
      }
      setInputValue('');
      setAttemptsTrack(0);
      setTimeout(() => nextCard(), 800);
    } else {
      if (isTest || (maxTries > 0 && currentAttempts >= maxTries)) {
        setFeedback('skipped');
        setInputValue(currentNode.answer); // Reveal answer
        setAttemptsTrack(0);
        setTimeout(() => {
          setInputValue('');
          nextCard();
        }, 1500);
      } else {
        setFeedback('incorrect');
        setTimeout(() => setFeedback('none'), 800);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      submitAnswer(inputValue.trim().toLowerCase(), currentNode.answer.trim().toLowerCase());
    }
  };

  const skipCard = () => {
    setFeedback('skipped');
    // Reveal answer briefly before moving on
    setInputValue(currentNode.answer);
    setTimeout(() => {
      setInputValue('');
      nextCard();
    }, 1500);
  };

  const nextCard = () => {
    setFeedback('none');
    if (currentIndex < levelData.nodes.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="game-container">
        <div className="victory-screen glass-panel">
          <h2>Defense Successful! 🚀</h2>
          <div className="final-score">Synapses Forged: {score} / {maxScore}</div>
          <p>Your mental reflexes are sharp.</p>
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
          <div key={i} className={`node-indicator ${i < currentIndex ? 'completed' : ''} ${i === currentIndex ? 'active' : ''}`}></div>
        ))}
      </div>

      <div className={`defense-card glass-panel ${feedback}`}>
        <div className="defense-target">
          <div className="radar-sweep"></div>
          <h3 className="defense-question">"{currentNode.question}"</h3>
        </div>

        <div className="defense-console">
          <input 
            type="text" 
            ref={inputRef}
            className={`defense-input ${feedback === 'correct' ? 'success' : ''} ${feedback === 'skipped' ? 'failed' : ''} ${feedback === 'incorrect' ? 'wrong' : ''}`}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={(gameOptions?.isTestMode || (gameOptions?.maxAttempts || 0) > 0) ? "Type and press Enter..." : "Type your answer to intercept..."}
            disabled={feedback !== 'none' && feedback !== 'incorrect'}
            autoFocus
            autoComplete="off"
          />
          
          {feedback === 'none' && !gameOptions?.isTestMode && (
            <button className="btn-skip" onClick={skipCard}>Emergency Skip (Reveal Answer)</button>
          )}
        </div>
      </div>
    </div>
  );
}
