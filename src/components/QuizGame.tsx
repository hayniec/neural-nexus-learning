import { useState } from 'react';
import './QuizGame.css';

// Mock AI generated data
const mockLevelData = {
  title: "Cellular Respiration - Level 1",
  nodes: [
    {
      id: 1,
      question: "What is the primary energy currency of the cell produced during respiration?",
      options: ["Glucose", "ATP", "DNA", "Oxygen"],
      correctAnswer: 1,
      hint: "Think of a rechargeable battery that powers cellular work."
    },
    {
      id: 2,
      question: "Which organelle is known as the powerhouse of the cell?",
      options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Apparatus"],
      correctAnswer: 2,
      hint: "It has a double membrane and its own DNA."
    },
    {
      id: 3,
      question: "Glycolysis breaks down glucose into two molecules of what?",
      options: ["Pyruvate", "Lactic Acid", "Carbon Dioxide", "Water"],
      correctAnswer: 0,
      hint: "A 3-carbon compound."
    }
  ]
};

interface QuizGameProps {
  onBack: () => void;
}

export default function QuizGame({ onBack }: QuizGameProps) {
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [isFinished, setIsFinished] = useState(false);

  const currentNode = mockLevelData.nodes[currentNodeIndex];

  const handleAnswer = (index: number) => {
    if (index === currentNode.correctAnswer) {
      setFeedback('correct');
      setScore(s => s + (showHint ? 50 : 100)); // Less points if hint used
      setTimeout(() => {
        if (currentNodeIndex < mockLevelData.nodes.length - 1) {
          setCurrentNodeIndex(i => i + 1);
          setFeedback('none');
          setShowHint(false);
        } else {
          setIsFinished(true);
        }
      }, 1500);
    } else {
      setFeedback('incorrect');
      setTimeout(() => {
        setFeedback('none');
      }, 1500);
    }
  };

  if (isFinished) {
    return (
      <div className="game-container">
        <div className="victory-screen glass-panel">
          <h2>Pathway Completed! 🚀</h2>
          <div className="final-score">Synapses Forged: {score}</div>
          <p>You have mastered these knowledge nodes.</p>
          <button className="btn-primary" onClick={onBack}>Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <button className="btn-back" onClick={onBack}>← Return to Hub</button>
        <h2>{mockLevelData.title}</h2>
        <div className="score-display">⚡ {score}</div>
      </div>

      <div className="node-progress">
        {mockLevelData.nodes.map((node, i) => (
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
          {!showHint && (
            <button className="btn-hint" onClick={() => setShowHint(true)}>
              Buy Strategic Hint (Costs 50 Insight)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
