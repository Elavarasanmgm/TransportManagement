import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm]         = useState({ username: '', password: '', remember: false });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin({ username: form.username, password: form.password, remember: form.remember });
      login(data.token, data.user, data.company);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🚛</span>
          <h1>{t('common.appName')}</h1>
          <p>{t('common.managementSystem')}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ marginBottom: 0 }}>{t('common.signIn')}</h2>
          <select
            className="form-input"
            style={{ width: 120, height: 34, fontSize: '0.82rem' }}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">{t('common.english')}</option>
            <option value="ta">{t('common.tamil')}</option>
          </select>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>{t('common.username')}</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label>{t('common.password')}</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Enter password"
              required
            />
          </div>

          <label className="auth-remember">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={e => setForm(f => ({ ...f, remember: e.target.checked }))}
            />
            {t('common.rememberMe30')}
          </label>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t('common.signingIn') : t('common.signIn')}
          </button>
        </form>

        <p className="auth-footer">
          {t('common.newCompanyQuestion')} <Link to="/signup">{t('common.registerHere')} →</Link>
        </p>
      </div>
    </div>
  );
}
