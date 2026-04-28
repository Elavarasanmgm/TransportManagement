import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard, Truck, FileText, Wrench, CalendarCheck, Receipt,
  TrendingUp, UserCheck, Users, Settings, X, BarChart2
} from 'lucide-react';

const navItems = [
  { labelKey: 'sidebar.dashboard', icon: LayoutDashboard, path: '/', roles: ['admin'] },
  { sectionKey: 'sidebar.fleet', roles: ['admin', 'driver'] },
  { labelKey: 'sidebar.fleetVehicles', icon: Truck,     path: '/vehicles',          roles: ['admin', 'driver'] },
  { labelKey: 'sidebar.vehicleDocs',   icon: FileText,  path: '/vehicle-documents', roles: ['admin', 'driver'] },
  { labelKey: 'sidebar.maintenance',   icon: Wrench,    path: '/maintenance',       roles: ['admin', 'driver'] },
  { sectionKey: 'sidebar.operations', roles: ['admin', 'driver', 'customer'] },
  { labelKey: 'sidebar.rentals', icon: CalendarCheck, path: '/rentals', roles: ['admin', 'driver', 'customer'] },
  { labelKey: 'sidebar.expenses', icon: Receipt, path: '/expenses', roles: ['admin'] },
  { labelKey: 'sidebar.profitLoss', icon: TrendingUp, path: '/profit-loss', roles: ['admin'] },
  { sectionKey: 'sidebar.hr', roles: ['admin', 'driver'] },
  { labelKey: 'sidebar.drivers', icon: Users, path: '/drivers', roles: ['admin', 'driver'] },
  { labelKey: 'sidebar.attendance', icon: UserCheck, path: '/attendance', roles: ['admin', 'driver'] },
  { sectionKey: 'sidebar.crm', roles: ['admin', 'customer'] },
  { labelKey: 'sidebar.customers', icon: Users, path: '/customers', roles: ['admin', 'customer'] },
  { sectionKey: 'sidebar.reportsSection', roles: ['admin'] },
  { labelKey: 'sidebar.reports', icon: BarChart2, path: '/reports', roles: ['admin'] },
  { sectionKey: 'sidebar.system', roles: ['admin'] },
  { labelKey: 'sidebar.settings', icon: Settings, path: '/settings', roles: ['admin'] },
];

export default function Sidebar({ onClose }) {
  const { company, user } = useAuth();
  const { t } = useLanguage();
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
          <h1>{company?.name || t('common.appName')}</h1>
          <p>{t('common.managementSystem')}</p>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'#64748b', cursor:'pointer' }}>
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item, idx) => {
          if (item.sectionKey) {
            return <div key={idx} className="nav-section-title">{t(item.sectionKey)}</div>;
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
              {t(item.labelKey)}
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
