import { useState, useRef, useCallback, useEffect } from 'react';
import './index.css';
import QuizGame from './components/games/QuizGame';
import SwipeGame from './components/games/SwipeGame';
import FlashcardDefense from './components/games/FlashcardDefense';
import NodeLinker from './components/games/NodeLinker';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { generateGame } from './services/aiService';
import type { GameType, AnyGameData } from './services/aiService';
import { supabase } from './services/supabase';
import { getOrCreateProfile, updateProfile, getSavedLevels, saveLevel } from './services/userService';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [displayName, setDisplayName] = useState('Lifelong Learner');

  const [synapses, setSynapses] = useState(() => parseInt(localStorage.getItem('nn_synapses') || '0'));
  const [masteryCores, setMasteryCores] = useState(() => parseInt(localStorage.getItem('nn_cores') || '0'));
  const [playerLevel, setPlayerLevel] = useState(() => parseInt(localStorage.getItem('nn_level') || '1'));

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserLogin(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleUserLogin(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserLogin = async (authUser: User) => {
    setUser(authUser);
    try {
      const profile = await getOrCreateProfile(
        authUser.id,
        authUser.user_metadata?.display_name || 'Lifelong Learner'
      );
      setDisplayName(profile.display_name);
      setSynapses(profile.synapses);
      setMasteryCores(profile.mastery_cores);
      setPlayerLevel(profile.player_level);

      const levels = await getSavedLevels(authUser.id);
      setSavedLevels(levels);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDisplayName('Lifelong Learner');
    setSynapses(0);
    setMasteryCores(0);
    setPlayerLevel(1);
    setSavedLevels([]);
  };

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
    const provider = localStorage.getItem('ai_provider') || 'gemini';
    const hasKey = localStorage.getItem(`ai_key_${provider}`);
    if (!hasKey) {
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

  const handleGameComplete = async (earnedSynapses: number, maxScore: number) => {
    const coresEarned = earnedSynapses === maxScore ? 2 : 1;

    const newSynapses = synapses + earnedSynapses;
    const newCores = masteryCores + coresEarned;
    const newLevel = Math.max(playerLevel, Math.floor(newSynapses / 10000) + 1);

    setSynapses(newSynapses);
    setMasteryCores(newCores);
    setPlayerLevel(newLevel);

    // Save to library
    if (activeLevel) {
      setSavedLevels(prev => {
        if (prev.find(l => l.title === activeLevel.title && l.type === activeLevel.type)) return prev;
        return [activeLevel, ...prev];
      });
    }

    // Persist to Supabase if logged in, otherwise localStorage
    if (user) {
      try {
        await updateProfile(user.id, {
          synapses: newSynapses,
          mastery_cores: newCores,
          player_level: newLevel,
        });
        if (activeLevel) {
          await saveLevel(user.id, activeLevel);
        }
      } catch (err) {
        console.error('Failed to sync to cloud:', err);
      }
    } else {
      localStorage.setItem('nn_synapses', newSynapses.toString());
      localStorage.setItem('nn_cores', newCores.toString());
      localStorage.setItem('nn_level', newLevel.toString());
      if (activeLevel) {
        const lib = JSON.parse(localStorage.getItem('nn_library') || '[]');
        lib.unshift(activeLevel);
        localStorage.setItem('nn_library', JSON.stringify(lib));
      }
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
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onAuth={(authUser) => {
            handleUserLogin(authUser);
            setIsAuthOpen(false);
          }}
        />
      )}
      
      <header className="top-nav">
        <div className="user-profile">
          <div className="avatar-ring">
            <div className="avatar">🌌</div>
          </div>
          <div className="user-info">
            <h1>{displayName}</h1>
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
          {user ? (
            <button className="btn-logout" onClick={handleLogout} title="Sign Out">
              Logout
            </button>
          ) : (
            <button className="btn-settings" onClick={() => setIsAuthOpen(true)} title="Sign In">
              👤
            </button>
          )}
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
      <main className="library-grid">
        {savedLevels.map((level, i) => (
          <div key={i} className="planet-card library-card generated-path" onClick={() => {
            setActiveLevel(level);
            setIsPlaying(true);
          }}>
            <div className="planet-orb ai-glow"></div>
            <h2>{level.title.length > 25 ? level.title.substring(0, 25) + '...' : level.title}</h2>
            <p className="pathway-chip">
              {level.type.toUpperCase()}
            </p>
          </div>
        ))}
        {savedLevels.length === 0 && (
           <div className="planet-card library-card blank-path">
            <div className="planet-orb"></div>
            <h2>Empty Library</h2>
            <p>Complete games to save them here!</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
