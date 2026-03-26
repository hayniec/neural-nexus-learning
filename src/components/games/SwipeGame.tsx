import { useState } from 'react';
import './SwipeGame.css';
import type { SwipeData } from '../../services/aiService';

interface SwipeGameProps {
  levelData: SwipeData;
  onBack: () => void;
}

export default function SwipeGame({ levelData, onBack }: SwipeGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

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

  const currentNode = levelData.nodes[currentIndex];

  const handleSwipe = (guessedTrue: boolean) => {
    if (feedback !== 'none') return; // Prevent double clicks

    const isCorrect = guessedTrue === currentNode.isTrue;
    
    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 100);
      setTimeout(() => nextCard(), 1000);
    } else {
      setFeedback('incorrect');
      setShowExplanation(true);
    }
  };

  const nextCard = () => {
    setFeedback('none');
    setShowExplanation(false);
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
          <h2>Pathway Completed! 🚀</h2>
          <div className="final-score">Synapses Forged: {score}</div>
          <p>You have classified all statements successfully.</p>
          <button className="btn-primary" onClick={onBack}>Return to Dashboard</button>
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
          <div key={i} className={`node-indicator ${i < currentIndex ? 'completed' : ''} ${i === currentIndex ? 'active' : ''}`}></div>
        ))}
      </div>

      <div className={`swipe-card glass-panel ${feedback}`}>
        <h3 className="statement-text">"{currentNode.statement}"</h3>
        
        {showExplanation && (
          <div className="explanation-box">
            <h4>Incorrect!</h4>
            <p>{currentNode.explanation}</p>
            <button className="btn-continue" onClick={nextCard}>Got it, next →</button>
          </div>
        )}

        {feedback === 'none' && (
          <div className="swipe-actions">
            <button className="btn-swipe false" onClick={() => handleSwipe(false)}>
              <span className="icon">✖</span> False
            </button>
            <button className="btn-swipe true" onClick={() => handleSwipe(true)}>
              <span className="icon">✔</span> True
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
