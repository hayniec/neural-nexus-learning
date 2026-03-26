import { useState } from 'react';
import './index.css';
import QuizGame from './components/QuizGame';
import SettingsModal from './components/SettingsModal';
import { generateQuiz } from './services/aiService';
import type { LevelData } from './services/aiService';

// Fallback mockup in case you click the old static planets
const mockLevelData: LevelData = {
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
    }
  ]
};

function App() {
  const [notes, setNotes] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeLevel, setActiveLevel] = useState<LevelData | null>(null);

  const handleGenerate = async () => {
    if (!localStorage.getItem('ai_api_key')) {
      setIsSettingsOpen(true);
      return;
    }
    
    if (!notes.trim()) {
      alert("Please paste some study notes first!");
      return;
    }

    setIsGenerating(true);
    try {
      const levelResult = await generateQuiz(notes);
      setActiveLevel(levelResult);
      setIsPlaying(true);
    } catch (error: any) {
      alert("Error generating your curriculum: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const playMockLevel = () => {
    setActiveLevel(mockLevelData);
    setIsPlaying(true);
  };

  if (isPlaying && activeLevel) {
    return (
      <div className="app-container">
        <QuizGame levelData={activeLevel} onBack={() => setIsPlaying(false)} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      
      <header className="top-nav">
        <div className="user-profile">
          <div className="avatar-ring">
            <div className="avatar">🌌</div>
          </div>
          <div className="user-info">
            <h1>Lifelong Learner</h1>
            <div className="user-title">Level 12 Scholar</div>
          </div>
        </div>
        <div className="resources">
          <div className="resource-badge" title="Synapses">
            <span className="star-icon">⚡</span> 3,450
          </div>
          <div className="resource-badge" title="Mastery Cores">
            <span className="energy-icon">💎</span> 12
          </div>
          <button className="btn-settings" onClick={() => setIsSettingsOpen(true)} title="AI Settings">
            ⚙️
          </button>
        </div>
      </header>

      <div className="forge-section">
        <div className="forge-content">
          <h2>The Knowledge Forge</h2>
          <p>Paste your notes, textbook chapters, or syllabus. Our AI will forge a custom gamified learning path for you.</p>
          <div className="upload-area">
            <textarea 
              placeholder="Paste your study materials here (e.g., Biology Chapter 4 summary, College Calculus equations, or Python basics)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
            <div className="forge-actions">
              <button className="btn-upload">📎 Upload PDF/Doc</button>
              <button 
                className="btn-generate" 
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? "Forging Neurons... 🧠" : "Forge Learning Path 🚀"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <h3 className="section-title">Your Active Pathways</h3>
      <main className="map-container">
        <div className="planet-card generated-path" onClick={playMockLevel}>
          <div className="planet-orb ai-glow"></div>
          <h2>Cellular Respiration</h2>
          <p>Example Pathway</p>
          <div className="progress-bar"><div className="progress" style={{width: '60%'}}></div></div>
        </div>
        
        <div className="planet-card planet-history" onClick={playMockLevel}>
          <div className="planet-orb"></div>
          <h2>World War II</h2>
          <p>Example Pathway</p>
          <div className="progress-bar"><div className="progress" style={{width: '20%'}}></div></div>
        </div>
      </main>
    </div>
  );
}

export default App;
