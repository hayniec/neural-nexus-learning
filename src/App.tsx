import { useState } from 'react';
import './index.css';
import QuizGame from './components/games/QuizGame';
import SwipeGame from './components/games/SwipeGame';
import FlashcardDefense from './components/games/FlashcardDefense';
import NodeLinker from './components/games/NodeLinker';
import SettingsModal from './components/SettingsModal';
import { generateGame } from './services/aiService';
import type { GameType, AnyGameData } from './services/aiService';

// Fallback mockup
// ... (I'll just inject at the exact line I need)
const mockLevelData: AnyGameData = {
  title: "Cellular Respiration - Level 1",
  type: "quiz",
  nodes: [
    {
      id: 1,
      question: "What is the primary energy currency of the cell produced during respiration?",
      options: ["Glucose", "ATP", "DNA", "Oxygen"],
      correctAnswer: 1,
      hint: "Think of a rechargeable battery that powers cellular work."
    }
  ]
};

function App() {
  const [notes, setNotes] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [gameMode, setGameMode] = useState<GameType>('quiz');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeLevel, setActiveLevel] = useState<AnyGameData | null>(null);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:image/jpeg;base64, prefix to get raw string
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!localStorage.getItem('ai_api_key')) {
      setIsSettingsOpen(true);
      return;
    }
    
    if (!notes.trim() && imageFiles.length === 0) {
      alert("Please paste some study notes or upload an image first!");
      return;
    }

    setIsGenerating(true);
    try {
      const imageDataPayloads = await Promise.all(
        imageFiles.map(async (file) => ({
          base64: await readFileAsBase64(file),
          mimeType: file.type
        }))
      );

      const levelResult = await generateGame(notes, gameMode, imageDataPayloads);
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

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (isPlaying && activeLevel) {
    return (
      <div className="app-container">
        {activeLevel.type === 'quiz' && <QuizGame levelData={activeLevel as any} onBack={() => setIsPlaying(false)} />}
        {activeLevel.type === 'swipe' && <SwipeGame levelData={activeLevel as any} onBack={() => setIsPlaying(false)} />}
        {activeLevel.type === 'flashcard' && <FlashcardDefense levelData={activeLevel as any} onBack={() => setIsPlaying(false)} />}
        {activeLevel.type === 'linker' && <NodeLinker levelData={activeLevel as any} onBack={() => setIsPlaying(false)} />}
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
          <p>Paste your notes or <strong>upload images</strong> (handwritten notes, textbook pages), select your game mode, and the AI will forge a custom learning path.</p>
          <div className="upload-area">
            <textarea 
              placeholder="Paste your study materials here (e.g., Biology Chapter 4 summary, College Calculus equations, or Python basics)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>

            {imageFiles.length > 0 && (
              <div className="attached-files">
                {imageFiles.map((file, i) => (
                  <div key={i} className="attached-file-badge">
                    📎 {file.name} 
                    <button className="btn-remove-file" onClick={() => removeImage(i)}>✖</button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="forge-toolbar">
              <div className="file-upload-wrapper">
                <label className="file-upload-label">
                  <span className="icon">📎</span> Add Images
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div className="game-mode-selector">
                <label>Training Mode:</label>
                <select title="Select Game Mode" value={gameMode} onChange={(e) => setGameMode(e.target.value as GameType)}>
                  <option value="quiz">📝 Multiple Choice</option>
                  <option value="swipe">👉 Swipe True / False</option>
                  <option value="flashcard">⌨️ Flashcard Defense</option>
                  <option value="linker">🔗 Node Linker</option>
                </select>
              </div>

              <div className="forge-actions">
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
      </div>

      <h3 className="section-title">Your Active Pathways</h3>
      <main className="map-container">
        <div className="planet-card generated-path" onClick={playMockLevel}>
          <div className="planet-orb ai-glow"></div>
          <h2>Cellular Respiration</h2>
          <p>Example Pathway</p>
          <div className="progress-bar"><div className="progress" style={{width: '60%'}}></div></div>
        </div>
      </main>
    </div>
  );
}

export default App;
