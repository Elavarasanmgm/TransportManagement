import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY   = 'transport_token';
const USER_KEY    = 'transport_user';
const COMPANY_KEY = 'transport_company';

function loadFromStorage() {
  try {
    return {
      token:   localStorage.getItem(TOKEN_KEY)   || null,
      user:    JSON.parse(localStorage.getItem(USER_KEY))    || null,
      company: JSON.parse(localStorage.getItem(COMPANY_KEY)) || null,
    };
  } catch {
    return { token: null, user: null, company: null };
  }
}

export function AuthProvider({ children }) {
  const initial = loadFromStorage();
  const [token,   setToken]   = useState(initial.token);
  const [user,    setUser]    = useState(initial.user);
  const [company, setCompany] = useState(initial.company);

  const login = useCallback((newToken, newUser, newCompany) => {
    localStorage.setItem(TOKEN_KEY,   newToken);
    localStorage.setItem(USER_KEY,    JSON.stringify(newUser));
    localStorage.setItem(COMPANY_KEY, JSON.stringify(newCompany));
    setToken(newToken);
    setUser(newUser);
    setCompany(newCompany);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(COMPANY_KEY);
    setToken(null);
    setUser(null);
    setCompany(null);
  }, []);

  const updateCompany = useCallback((newCompany) => {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(newCompany));
    setCompany(newCompany);
  }, []);

  return (
    <AuthContext.Provider value={{
      token,
      user,
      company,
      isAuthenticated: !!token,
      login,
      logout,
      updateCompany,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
