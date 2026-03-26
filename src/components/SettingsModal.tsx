import { useState, useEffect } from 'react';
import './SettingsModal.css';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider') as 'gemini' | 'openai' | null;
    const savedKey = localStorage.getItem('ai_api_key');
    if (savedProvider) setProvider(savedProvider);
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('ai_provider', provider);
    localStorage.setItem('ai_api_key', apiKey);
    setSaveStatus('Settings saved!');
    setTimeout(() => {
      setSaveStatus('');
      onClose();
    }, 1500);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <button className="btn-close" onClick={onClose}>×</button>
        <h2>AI Provider Settings</h2>
        <p className="modal-desc">
          To generate custom curriculums, you need to provide your own AI API key. This key is stored securely in your browser and never sent to our servers.
        </p>
        
        <div className="form-group">
          <label>Select AI Provider</label>
          <div className="provider-options">
            <button 
              className={`provider-btn ${provider === 'gemini' ? 'active' : ''}`}
              onClick={() => setProvider('gemini')}
            >
              Google Gemini (Free Tier)
            </button>
            <button 
              className={`provider-btn ${provider === 'openai' ? 'active' : ''}`}
              onClick={() => setProvider('openai')}
            >
              OpenAI (ChatGPT)
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>API Key</label>
          <input 
            type="password" 
            placeholder={`Enter your ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key...`}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="api-input"
          />
          <div className="key-help">
            {provider === 'gemini' ? (
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer noopener">Get a free Gemini API Key here ↗</a>
            ) : (
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer noopener">Get an OpenAI API Key here ↗</a>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <span className="save-status">{saveStatus}</span>
          <button className="btn-save" onClick={handleSave}>Save Configuration</button>
        </div>
      </div>
    </div>
  );
}
