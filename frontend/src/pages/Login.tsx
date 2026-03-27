import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loginWithMicrosoft } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMockForm, setShowMockForm] = useState(false);

  async function handleMicrosoftLogin() {
    setError('');
    setLoading(true);
    try {
      await loginWithMicrosoft();
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Microsoft login failed');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = login(form.username, form.password);
      if (result.ok) {
        navigate('/dashboard');
      } else {
        setError(result.error ?? 'Login failed');
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">⬡</span>
          <span className="login-logo-text">{import.meta.env.VITE_APP_NAME}</span>
        </div>
        <h2 className="login-title">Sign in to your account</h2>

        {error && <div className="login-error">{error}</div>}

        {/* Primary — Microsoft login */}
        <button
          className="login-btn microsoft-btn"
          onClick={handleMicrosoftLogin}
          disabled={loading}
        >
          <span className="ms-icon">⊞</span>
          {loading ? 'Signing in…' : 'Sign in with Microsoft'}
        </button>

        {/* Secondary — mock login toggle */}
        <p className="login-hint" style={{ marginTop: '1.25rem' }}>
          <button
            className="link-btn"
            onClick={() => setShowMockForm(!showMockForm)}
          >
            {showMockForm ? 'Hide' : 'Use local account instead'}
          </button>
        </p>

        {showMockForm && (
          <form className="login-form" onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="login-hint">Demo: <code>admin</code> / <code>demo</code></p>
          </form>
        )}
      </div>
    </div>
  );
}
