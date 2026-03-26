import { useState } from 'react';
import './QuizGame.css';
import type { QuizData } from '../../services/aiService';

export interface GameOptions {
  isTestMode: boolean;
  maxAttempts: number;
}

interface QuizGameProps {
  levelData: QuizData;
  onBack: () => void;
  onComplete?: (score: number, maxScore: number) => void;
  gameOptions?: GameOptions;
}

export default function QuizGame({ levelData, onBack, onComplete, gameOptions }: QuizGameProps) {
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [isFinished, setIsFinished] = useState(false);
  const [attemptsTrack, setAttemptsTrack] = useState(0);

  // Fallback in case there are no nodes
  if (!levelData || !levelData.nodes || levelData.nodes.length === 0) {
    return (
      <div className="game-container">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Whoops!</h2>
          <p>The AI didn't generate any questions for that text.</p>
          <button className="btn-primary" onClick={onBack} style={{ marginTop: '2rem' }}>Go Back</button>
        </div>
      </div>
    );
  }

  const currentNode = levelData.nodes[currentNodeIndex];
  const maxScore = levelData.nodes.length * 100;

  const handleAnswer = (index: number) => {
    const isTest = gameOptions?.isTestMode || false;
    const maxTries = gameOptions?.maxAttempts || 0;
    const currentAttempts = attemptsTrack + 1;
    setAttemptsTrack(currentAttempts);

    if (index === currentNode.correctAnswer) {
      setFeedback('correct');
      if (currentAttempts === 1) {
        setScore(s => s + (showHint ? 50 : 100)); // Less points if hint used
      } else {
        setScore(s => s + 25); // Minimal points for retries
      }
      setTimeout(() => {
        moveToNext();
      }, 1500);
    } else {
      setFeedback('incorrect');
      if (isTest || (maxTries > 0 && currentAttempts >= maxTries)) {
        setTimeout(() => {
          moveToNext();
        }, 1500);
      } else {
        setTimeout(() => {
          setFeedback('none');
        }, 1500);
      }
    }
  };

  const moveToNext = () => {
    setAttemptsTrack(0);
    if (currentNodeIndex < levelData.nodes.length - 1) {
      setCurrentNodeIndex(i => i + 1);
      setFeedback('none');
      setShowHint(false);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="game-container">
        <div className="victory-screen glass-panel">
          <h2>Pathway Completed! 🚀</h2>
          <div className="final-score">Synapses Forged: {score} / {maxScore}</div>
          <p>You have mastered these knowledge nodes.</p>
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
        {levelData.nodes.map((node, i) => (
          <div key={node.id} className={`node-indicator ${i < currentNodeIndex ? 'completed' : ''} ${i === currentNodeIndex ? 'active' : ''}`}></div>
        ))}
      </div>

      <div className={`question-card glass-panel ${feedback}`}>
        <h3 className="question-text">{currentNode.question}</h3>
        
        {showHint && (
          <div className="hint-box">
            💡 <strong>AI Hint:</strong> {currentNode.hint}
          </div>
        )}

        <div className="options-grid">
          {currentNode.options.map((option, index) => (
            <button 
              key={index} 
              className={`option-btn ${feedback === 'correct' && index === currentNode.correctAnswer ? 'correct' : ''}`}
              onClick={() => handleAnswer(index)}
              disabled={feedback === 'correct'}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="game-actions">
          {!showHint && !gameOptions?.isTestMode && (
            <button className="btn-hint" onClick={() => setShowHint(true)}>
              Buy Strategic Hint (Costs 50 Insight)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
