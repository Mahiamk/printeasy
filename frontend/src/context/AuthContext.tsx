import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, authApi } from '../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, initialUser?: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('printeasy_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('printeasy_token');
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      setUser(null);
      localStorage.removeItem('printeasy_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch user on mount (not on every token change — login() handles that)
  useEffect(() => {
    refreshUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (newToken: string, initialUser?: User) => {
    localStorage.setItem('printeasy_token', newToken);
    setToken(newToken);
    if (initialUser) {
      setUser(initialUser);
      return;
    }
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      localStorage.removeItem('printeasy_token');
      setToken(null);
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('printeasy_token');
    setToken(null);
    setUser(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user, token, loading, login, logout, refreshUser,
  }), [user, token, loading, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
