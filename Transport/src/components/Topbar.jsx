import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Topbar({ path }) {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, locale } = useLanguage();
  const navigate  = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef   = useRef();

  const titleMap = {
    '/': t('topbar.dashboard'),
    '/vehicles': t('topbar.vehicles'),
    '/rentals': t('topbar.rentals'),
    '/expenses': t('topbar.expenses'),
    '/profit-loss': t('topbar.profitLoss'),
    '/drivers': t('topbar.drivers'),
    '/attendance': t('topbar.attendance'),
    '/customers': t('topbar.customers'),
    '/reports': t('topbar.reports'),
    '/settings': t('topbar.settings'),
  };

  const title   = titleMap[path] || t('topbar.transport');
  const now     = new Date();
  const dateStr = now.toLocaleDateString(locale, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const initial = user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-date">{dateStr}</div>
      </div>
      <div className="topbar-right">
        <Bell size={18} color="#64748b" style={{ cursor:'pointer' }} />
        <div className="topbar-user-menu" ref={menuRef}>
          <button
            className="topbar-avatar"
            onClick={() => setMenuOpen(v => !v)}
            title={user?.fullName || user?.username}
          >
            <span className="topbar-avatar-initial">{initial}</span>
            <ChevronDown size={13} />
          </button>
          {menuOpen && (
            <div className="topbar-dropdown">
              <div className="topbar-dropdown-header">
                <strong>{user?.fullName || user?.username}</strong>
                <span>{user?.username}</span>
              </div>
              <button onClick={handleLogout} className="topbar-dropdown-item topbar-logout">
                <LogOut size={14} /> {t('common.logout')}
              </button>
              <div style={{ padding: '8px 14px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 4 }}>{t('common.language')}</div>
                <select
                  className="form-input"
                  style={{ height: 34, fontSize: '0.82rem' }}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">{t('common.english')}</option>
                  <option value="ta">{t('common.tamil')}</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
