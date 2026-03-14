import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Truck, CalendarCheck, Receipt,
  TrendingUp, UserCheck, Users, Settings, X, BarChart2
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin'] },
  { section: 'Fleet', roles: ['admin', 'driver'] },
  { label: 'Fleet / Vehicles', icon: Truck, path: '/vehicles', roles: ['admin', 'driver'] },
  { section: 'Operations', roles: ['admin', 'driver', 'customer'] },
  { label: 'Rentals', icon: CalendarCheck, path: '/rentals', roles: ['admin', 'driver', 'customer'] },
  { label: 'Expenses', icon: Receipt, path: '/expenses', roles: ['admin'] },
  { label: 'Profit & Loss', icon: TrendingUp, path: '/profit-loss', roles: ['admin'] },
  { section: 'HR', roles: ['admin', 'driver'] },
  { label: 'Drivers', icon: Users, path: '/drivers', roles: ['admin', 'driver'] },
  { label: 'Attendance', icon: UserCheck, path: '/attendance', roles: ['admin', 'driver'] },
  { section: 'CRM', roles: ['admin', 'customer'] },
  { label: 'Customers', icon: Users, path: '/customers', roles: ['admin', 'customer'] },
  { section: 'Reports', roles: ['admin'] },
  { label: 'Reports', icon: BarChart2, path: '/reports', roles: ['admin'] },
  { section: 'System', roles: ['admin'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] },
];

export default function Sidebar({ onClose }) {
  const { company, user } = useAuth();
  const role = user?.role || 'admin';
  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(role));

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        {company?.logo
          ? <img src={company.logo} alt="company logo" className="sidebar-logo-img" />
          : <div className="sidebar-logo-icon">🚛</div>
        }
        <div>
          <h1>{company?.name || 'Transport'}</h1>
          <p>Management System</p>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'#64748b', cursor:'pointer' }}>
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item, idx) => {
          if (item.section) {
            return <div key={idx} className="nav-section-title">{item.section}</div>;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <Icon size={17} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '0.72rem', color: '#475569' }}>Transport Management</div>
        <div style={{ fontSize: '0.68rem', color: '#334155', marginTop: '2px' }}>v1.0.0 © 2026</div>
      </div>
    </div>
  );
}
