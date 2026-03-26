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
  const [activeProvider, setActiveProvider] = useState<Provider>('gemini');
  const [keys, setKeys] = useState<Record<Provider, string>>({
    gemini: '', openai: '', claude: '', mistral: '', groq: ''
  });
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider') as Provider | null;
    if (savedProvider) setActiveProvider(savedProvider);

    const loadedKeys: Record<Provider, string> = { gemini: '', openai: '', claude: '', mistral: '', groq: '' };
    for (const p of PROVIDERS) {
      loadedKeys[p.id] = localStorage.getItem(`ai_key_${p.id}`) || '';
    }
    setKeys(loadedKeys);
  }, []);

  const handleKeyChange = (provider: Provider, value: string) => {
    setKeys(prev => ({ ...prev, [provider]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('ai_provider', activeProvider);
    for (const p of PROVIDERS) {
      if (keys[p.id]) {
        localStorage.setItem(`ai_key_${p.id}`, keys[p.id]);
      } else {
        localStorage.removeItem(`ai_key_${p.id}`);
      }
    }
    setSaveStatus('Settings saved!');
    setTimeout(() => {
      setSaveStatus('');
      onClose();
    }, 1500);
  };

  const configuredCount = PROVIDERS.filter(p => keys[p.id].trim() !== '').length;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <button className="btn-close" onClick={onClose}>×</button>
        <h2>AI Provider Settings</h2>
        <p className="modal-desc">
          Add API keys for any providers you want to use. Keys are stored locally in your browser and never leave your device.
          <span className="configured-badge">{configuredCount}/{PROVIDERS.length} configured</span>
        </p>

        <div className="form-group">
          <label>Active Provider</label>
          <div className="provider-options">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                className={`provider-btn ${activeProvider === p.id ? 'active' : ''} ${keys[p.id].trim() ? 'has-key' : ''}`}
                onClick={() => setActiveProvider(p.id)}
              >
                <span className="provider-name">{p.label}</span>
                <span className="provider-desc">{p.description}</span>
                {keys[p.id].trim() && <span className="provider-key-dot" title="API key configured">●</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="provider-keys-section">
          <label>API Keys</label>
          <div className="provider-key-list">
            {PROVIDERS.map(p => (
              <div key={p.id} className={`provider-key-row ${activeProvider === p.id ? 'active-row' : ''}`}>
                <div className="provider-key-header">
                  <span className="provider-key-label">
                    {keys[p.id].trim() ? '🟢' : '⚫'} {p.label}
                    {activeProvider === p.id && <span className="active-tag">ACTIVE</span>}
                  </span>
                  <a href={p.keyUrl} target="_blank" rel="noreferrer noopener" className="get-key-link">
                    Get key ↗
                  </a>
                </div>
                <input
                  type="password"
                  placeholder={`Enter your ${p.label} API key...`}
                  value={keys[p.id]}
                  onChange={(e) => handleKeyChange(p.id, e.target.value)}
                  className="api-input"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <span className="save-status">{saveStatus}</span>
          <button className="btn-save" onClick={handleSave}>Save All Keys</button>
        </div>
      </div>
    </div>
  );
}
