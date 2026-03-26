import { useState } from 'react';
import './index.css';
import QuizGame from './components/QuizGame';

function App() {
  const [notes, setNotes] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPlaying) {
    return (
      <div className="app-container">
        <QuizGame onBack={() => setIsPlaying(false)} />
      </div>
    );
  }

  return (
    <div className="app-container">
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
              <button className="btn-generate">Forge Learning Path 🚀</button>
            </div>
          </div>
        </div>
      </div>

      <h3 className="section-title">Your Active Pathways</h3>
      <main className="map-container">
        <div className="planet-card generated-path" onClick={() => setIsPlaying(true)}>
          <div className="planet-orb ai-glow"></div>
          <h2>Cellular Respiration</h2>
          <p>Generated from: Bio 101 Notes</p>
          <div className="progress-bar"><div className="progress" style={{width: '60%'}}></div></div>
        </div>
        
        <div className="planet-card planet-history">
          <div className="planet-orb"></div>
          <h2>World War II</h2>
          <p>Custom Pathway</p>
          <div className="progress-bar"><div className="progress" style={{width: '20%'}}></div></div>
        </div>
        
        <div className="planet-card planet-math">
          <div className="planet-orb"></div>
          <h2>Calculus Basics</h2>
          <p>Core Curriculum</p>
          <div className="progress-bar"><div className="progress" style={{width: '85%'}}></div></div>
        </div>
      </main>
    </div>
  );
}

export default App;
