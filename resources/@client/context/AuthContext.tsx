import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppMode = 'principal' | 'vendor';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  role_id?: number;
  workspace_id?: number;
  workspace_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  appMode: 'principal',
  setAppMode: () => {},
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });
  const [appMode, setAppModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem('app_mode');
    return (saved === 'vendor' || saved === 'principal') ? saved : 'principal';
  });

  const setAppMode = (mode: AppMode) => {
    localStorage.setItem('app_mode', mode);
    setAppModeState(mode);
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('app_mode');
    localStorage.removeItem('workspace_id');
    localStorage.removeItem('workspace_name');
    localStorage.removeItem('vendor_workspace_id');
    localStorage.removeItem('vendor_workspace_name');
    setToken(null);
    setUser(null);
    setAppModeState('principal');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, appMode, setAppMode, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
