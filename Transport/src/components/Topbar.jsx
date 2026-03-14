import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const pageTitles = {
  '/': 'Dashboard',
  '/vehicles': 'Fleet / Vehicles',
  '/rentals': 'Rental Bookings',
  '/expenses': 'Expenses',
  '/profit-loss': 'Profit & Loss',
  '/drivers': 'Drivers',
  '/attendance': 'Attendance',
  '/customers': 'Customers',
  '/settings':  'Settings',
};

export default function Topbar({ path }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef   = useRef();

  const title   = pageTitles[path] || 'Transport';
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
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
                <LogOut size={14} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
