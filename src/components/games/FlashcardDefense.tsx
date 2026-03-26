import { useState, useEffect, useRef } from 'react';
import './FlashcardDefense.css';
import type { FlashcardData } from '../../services/aiService';

interface FlashcardDefenseProps {
  levelData: FlashcardData;
  onBack: () => void;
}

export default function FlashcardDefense({ levelData, onBack }: FlashcardDefenseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'skipped'>('none');
  const [isFinished, setIsFinished] = useState(false);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Auto-check against answer (ignoring case and whitespace)
    const cleanGuessed = val.trim().toLowerCase();
    const cleanAnswer = currentNode.answer.trim().toLowerCase();

    if (cleanGuessed === cleanAnswer) {
      setFeedback('correct');
      setScore(s => s + 200);
      setInputValue('');
      setTimeout(() => nextCard(), 800);
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
          <h2>Pathway Completed! 🚀</h2>
          <div className="final-score">Synapses Forged: {score}</div>
          <p>Your mental reflexes are sharp.</p>
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
            className={`defense-input ${feedback === 'correct' ? 'success' : ''} ${feedback === 'skipped' ? 'failed' : ''}`}
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your answer to intercept..."
            disabled={feedback !== 'none'}
            autoFocus
            autoComplete="off"
          />
          
          {feedback === 'none' && (
            <button className="btn-skip" onClick={skipCard}>Emergency Skip (Reveal Answer)</button>
          )}
        </div>
      </div>
    </div>
  );
}
