import { useState, useEffect } from 'react';
import './SettingsModal.css';

type Provider = 'gemini' | 'openai' | 'claude' | 'mistral' | 'groq';

const PROVIDERS: { id: Provider; label: string; description: string; keyUrl: string }[] = [
  { id: 'gemini', label: 'Google Gemini', description: 'Free tier available', keyUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'openai', label: 'OpenAI (GPT)', description: 'GPT-4o-mini', keyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'claude', label: 'Anthropic Claude', description: 'Claude 3.5 Sonnet', keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'mistral', label: 'Mistral AI', description: 'Mistral Large', keyUrl: 'https://console.mistral.ai/api-keys' },
  { id: 'groq', label: 'Groq', description: 'Llama 3 · Ultra fast', keyUrl: 'https://console.groq.com/keys' },
];

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider') as Provider | null;
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

  const activeProvider = PROVIDERS.find(p => p.id === provider)!;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <button className="btn-close" onClick={onClose}>×</button>
        <h2>AI Provider Settings</h2>
        <p className="modal-desc">
          Choose your AI engine and paste your API key. Keys are stored locally in your browser and never leave your device.
        </p>
        
        <div className="form-group">
          <label>Select AI Provider</label>
          <div className="provider-options">
            {PROVIDERS.map(p => (
              <button 
                key={p.id}
                className={`provider-btn ${provider === p.id ? 'active' : ''}`}
                onClick={() => setProvider(p.id)}
              >
                <span className="provider-name">{p.label}</span>
                <span className="provider-desc">{p.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>{activeProvider.label} API Key</label>
          <input 
            type="password" 
            placeholder={`Enter your ${activeProvider.label} API Key...`}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="api-input"
          />
          <div className="key-help">
            <a href={activeProvider.keyUrl} target="_blank" rel="noreferrer noopener">
              Get a {activeProvider.label} API Key here ↗
            </a>
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
