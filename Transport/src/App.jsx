import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Rentals from './pages/Rentals';
import Expenses from './pages/Expenses';
import ProfitLoss from './pages/ProfitLoss';
import Drivers from './pages/Drivers';
import Attendance from './pages/Attendance';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Pages each role can access (driver/customer land on first item in array)
const ROLE_ACCESS = {
  admin:    ['/', '/vehicles', '/rentals', '/expenses', '/profit-loss', '/drivers', '/attendance', '/customers', '/reports', '/settings'],
  driver:   ['/vehicles', '/rentals', '/drivers', '/attendance'],
  customer: ['/rentals', '/customers'],
};

function RoleRoute({ path, children }) {
  const { user } = useAuth();
  const role = user?.role || 'admin';
  const allowed = ROLE_ACCESS[role] || ROLE_ACCESS.admin;
  if (allowed.includes(path)) return children;
  // Redirect to first allowed page for this role
  return <Navigate to={allowed[0]} replace />;
}

function Layout() {
  const location = useLocation();
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Topbar path={location.pathname} />
        <div className="main-content">
          <Routes>
            <Route path="/"            element={<RoleRoute path="/">           <Dashboard />  </RoleRoute>} />
            <Route path="/vehicles"    element={<RoleRoute path="/vehicles">   <Vehicles />   </RoleRoute>} />
            <Route path="/rentals"     element={<RoleRoute path="/rentals">    <Rentals />    </RoleRoute>} />
            <Route path="/expenses"    element={<RoleRoute path="/expenses">   <Expenses />   </RoleRoute>} />
            <Route path="/profit-loss" element={<RoleRoute path="/profit-loss"><ProfitLoss /> </RoleRoute>} />
            <Route path="/drivers"     element={<RoleRoute path="/drivers">    <Drivers />    </RoleRoute>} />
            <Route path="/attendance"  element={<RoleRoute path="/attendance"> <Attendance /> </RoleRoute>} />
            <Route path="/customers"   element={<RoleRoute path="/customers">  <Customers />  </RoleRoute>} />
            <Route path="/reports"     element={<RoleRoute path="/reports">    <Reports />    </RoleRoute>} />
            <Route path="/settings"    element={<RoleRoute path="/settings">   <Settings />   </RoleRoute>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/*" element={
            <PrivateRoute>
              <AppProvider>
                <Layout />
              </AppProvider>
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  );
}

