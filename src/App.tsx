import { useState, useRef, useCallback } from 'react';
import './index.css';
import QuizGame from './components/games/QuizGame';
import SwipeGame from './components/games/SwipeGame';
import FlashcardDefense from './components/games/FlashcardDefense';
import NodeLinker from './components/games/NodeLinker';
import SettingsModal from './components/SettingsModal';
import { generateGame } from './services/aiService';
import type { GameType, AnyGameData } from './services/aiService';

// Fallback mockup removed as library is now functional.

function App() {
  const [synapses, setSynapses] = useState(() => parseInt(localStorage.getItem('nn_synapses') || '3450'));
  const [masteryCores, setMasteryCores] = useState(() => parseInt(localStorage.getItem('nn_cores') || '12'));
  const [playerLevel, setPlayerLevel] = useState(() => parseInt(localStorage.getItem('nn_level') || '12'));

  const [notes, setNotes] = useState('');
  const [pathway, setPathway] = useState('Science');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('High School');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [gameMode, setGameMode] = useState<GameType>('quiz');
  const [questionCount, setQuestionCount] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeLevel, setActiveLevel] = useState<AnyGameData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const speechRecRef = useRef<any>(null);

  const toggleSpeechToText = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording && speechRecRef.current) {
      speechRecRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    speechRecRef.current = recognition;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setNotes(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      speechRecRef.current = null;
    };

    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
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
    
    if (!subject.trim() && !notes.trim() && imageFiles.length === 0) {
      alert("Please either enter a Subject, paste study notes, or upload an image!");
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

      const levelResult = await generateGame(notes, gameMode, imageDataPayloads, questionCount, pathway, subject, level);
      setActiveLevel(levelResult);
      setIsPlaying(true);
    } catch (error: any) {
      alert("Error generating your curriculum: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const [savedLevels, setSavedLevels] = useState<AnyGameData[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nn_library') || '[]');
    } catch {
      return [];
    }
  });

  const handleGameComplete = (earnedSynapses: number, maxScore: number) => {
    // 1 Core for completing a level, bonus core if perfect score
    const coresEarned = earnedSynapses === maxScore ? 2 : 1;
    
    setSynapses(prev => {
      const newTotal = prev + earnedSynapses;
      localStorage.setItem('nn_synapses', newTotal.toString());
      
      // Auto level up every 10,000 synapses
      const newLevel = Math.max(playerLevel, Math.floor(newTotal / 10000) + 1);
      if (newLevel > playerLevel) {
        setPlayerLevel(newLevel);
        localStorage.setItem('nn_level', newLevel.toString());
      }
      return newTotal;
    });

    setMasteryCores(prev => {
      const newTotal = prev + coresEarned;
      localStorage.setItem('nn_cores', newTotal.toString());
      return newTotal;
    });

    // Auto-save generated levels to the library
    if (activeLevel) {
      setSavedLevels(prev => {
        // Prevent dupes
        if (prev.find(l => JSON.stringify(l) === JSON.stringify(activeLevel))) return prev;
        const newList = [activeLevel, ...prev];
        localStorage.setItem('nn_library', JSON.stringify(newList));
        return newList;
      });
    }

    setIsPlaying(false);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (isPlaying && activeLevel) {
    return (
      <div className="app-container">
        {activeLevel.type === 'quiz' && <QuizGame levelData={activeLevel as any} onBack={() => setIsPlaying(false)} onComplete={handleGameComplete} />}
        {activeLevel.type === 'swipe' && <SwipeGame levelData={activeLevel as any} onBack={() => setIsPlaying(false)} onComplete={handleGameComplete} />}
        {activeLevel.type === 'flashcard' && <FlashcardDefense levelData={activeLevel as any} onBack={() => setIsPlaying(false)} onComplete={handleGameComplete} />}
        {activeLevel.type === 'linker' && <NodeLinker levelData={activeLevel as any} onBack={() => setIsPlaying(false)} onComplete={handleGameComplete} />}
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
            <div className="user-title">Level {playerLevel} Scholar</div>
          </div>
        </div>
        <div className="resources">
          <div className="resource-badge" title="Synapses">
            <span className="star-icon">⚡</span> {synapses.toLocaleString()}
          </div>
          <div className="resource-badge" title="Mastery Cores">
            <span className="energy-icon">💎</span> {masteryCores.toLocaleString()}
          </div>
          <button className="btn-settings" onClick={() => setIsSettingsOpen(true)} title="AI Settings">
            ⚙️
          </button>
        </div>
      </header>

      <div className="forge-section">
        <div className="forge-content">
          <h2>The Knowledge Forge</h2>
          <p>Define your curriculum pathway, or provide custom source material (notes, images) to let the AI build a custom learning experience.</p>
          
          <div className="curriculum-builder">
            <div className="curriculum-row">
              <div className="input-group">
                <label>Pathway</label>
                <select title="Curriculum Pathway" value={pathway} onChange={e => setPathway(e.target.value)}>
                  <option value="Science">Science</option>
                  <option value="History">History</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Language Arts">Language Arts</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Custom">Custom / General</option>
                </select>
              </div>

              <div className="input-group">
                <label>Subject</label>
                <input 
                  type="text" 
                  className="subject-input"
                  title="Subject Focus"
                  placeholder="e.g. Cellular Respiration, WW2" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                />
              </div>

              <div className="input-group">
                <label>Difficulty Level</label>
                <select title="Difficulty Level" value={level} onChange={e => setLevel(e.target.value)}>
                  <option value="Elementary School">Elementary</option>
                  <option value="Middle School">Middle School</option>
                  <option value="High School">High School</option>
                  <option value="College / University">College</option>
                  <option value="Expert / Professional">Expert</option>
                </select>
              </div>
            </div>
          </div>

          <div className="upload-area">
            <div className="textarea-with-mic">
              <textarea 
                placeholder="[Optional] Paste study notes, speak them aloud with the mic, or upload images to strictly control the content..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
              <button 
                className={`btn-mic ${isRecording ? 'recording' : ''}`}
                onClick={toggleSpeechToText}
                title={isRecording ? 'Stop recording' : 'Start voice dictation'}
                type="button"
              >
                {isRecording ? '⏹️' : '🎙️'}
              </button>
              {isRecording && <div className="recording-indicator">Listening...</div>}
            </div>

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
                
                <label className="count-input-label"># of Items:</label>
                <input 
                  type="number" 
                  min="3" 
                  max="30" 
                  value={questionCount} 
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                  className="count-input"
                  title="Number of questions or items"
                />
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

      <h3 className="section-title">Your Saved Library</h3>
      <main className="map-container" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {savedLevels.map((level, i) => (
          <div key={i} className="planet-card generated-path" onClick={() => {
            setActiveLevel(level);
            setIsPlaying(true);
          }}>
            <div className="planet-orb ai-glow" style={{ background: 'var(--ai-glow)' }}></div>
            <h2>{level.title.length > 20 ? level.title.substring(0, 20) + '...' : level.title}</h2>
            <p className="pathway-chip" style={{ 
              fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.5rem'
            }}>
              {level.type.toUpperCase()}
            </p>
          </div>
        ))}
        {savedLevels.length === 0 && (
           <div className="planet-card blank-path" style={{ opacity: 0.5, pointerEvents: 'none' }}>
            <div className="planet-orb" style={{ background: '#555' }}></div>
            <h2>Empty Library</h2>
            <p>Generate & complete games to save them!</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
