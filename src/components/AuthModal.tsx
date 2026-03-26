import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';
import './AuthModal.css';

interface AuthModalProps {
  onClose: () => void;
  onAuth: (user: User) => void;
}

export default function AuthModal({ onClose, onAuth }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [mode]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else if (data.user) {
      onAuth(data.user);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName || 'Lifelong Learner' }
      }
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else if (data.user) {
      setSuccess('Account created! Check your email to confirm if required.');
      setTimeout(() => onAuth(data.user!), 1500);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess('Password reset instructions sent to your email.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleSignup();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel auth-modal">
        <button className="btn-close" onClick={onClose}>×</button>

        <div className="auth-header">
          <h2>{mode === 'login' ? 'Welcome Back' : 'Join Neural Nexus'}</h2>
          <p className="modal-desc">
            {mode === 'login'
              ? 'Sign in to sync your progress across devices.'
              : 'Create an account to save your learning journey.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                placeholder="Your scholar name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="auth-input"
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Password</label>
              {mode === 'login' && (
                <button 
                  type="button" 
                  className="btn-forgot-password" 
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="btn-save auth-submit" disabled={loading}>
            {loading
              ? 'Processing...'
              : mode === 'login'
              ? 'Sign In ⚡'
              : 'Create Account 🚀'}
          </button>
        </form>

        <button className="btn-guest" onClick={onClose}>
          Continue as Guest (localStorage only)
        </button>
      </div>
    </div>
  );
}
