import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup as apiSignup, checkNeedsSetup } from '../services/api';

export default function Signup() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({
    companyName: '',
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [logo, setLogo]       = useState(null);   // base64 data URL
  const [logoPreview, setPreview] = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef               = useRef();

  useEffect(() => {
    if (isAuthenticated) { navigate('/'); return; }
    // Redirect to login if setup already done
    checkNeedsSetup()
      .then(d => { if (!d.needsSetup) navigate('/login'); })
      .catch(() => {});
  }, [isAuthenticated, navigate]);

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setLogo(ev.target.result);
      setPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword)
      return setError('Passwords do not match');
    if (form.password.length < 6)
      return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const data = await apiSignup({
        companyName: form.companyName,
        fullName:    form.fullName,
        username:    form.username,
        password:    form.password,
        logo:        logo || null,
      });
      login(data.token, data.user, data.company);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-logo">
          <span className="auth-logo-icon">🚛</span>
          <h1>Transport MS</h1>
          <p>First-time Setup</p>
        </div>

        <h2>Set Up Your Company</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Company logo upload */}
          <div className="auth-logo-upload" onClick={() => fileRef.current.click()}>
            {logoPreview
              ? <img src={logoPreview} alt="Company logo preview" />
              : <div className="auth-logo-placeholder">
                  <span>📷</span>
                  <span>Click to upload company logo</span>
                  <span className="auth-logo-hint">PNG / JPG / SVG · max 2 MB</span>
                </div>
            }
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
          {logoPreview && (
            <button
              type="button"
              className="auth-remove-logo"
              onClick={() => { setLogo(null); setPreview(null); fileRef.current.value = ''; }}
            >
              Remove logo
            </button>
          )}

          <div className="auth-field">
            <label>Company Name <span className="req">*</span></label>
            <input
              type="text"
              value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              placeholder="e.g. Sri Murugan Travels"
              required
            />
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label>Your Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="auth-field">
              <label>Username <span className="req">*</span></label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Login username"
                required
              />
            </div>
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label>Password <span className="req">*</span></label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 6 characters"
                required
              />
            </div>
            <div className="auth-field">
              <label>Confirm Password <span className="req">*</span></label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Repeat password"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Setting up…' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
