import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, authApi } from '../api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('printeasy_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (!localStorage.getItem('printeasy_token')) {
        setUser(null);
        setLoading(false);
        return;
      }
      const me = await authApi.getMe();
      setUser(me);
    } catch (err) {
      console.error('Failed to fetch current user', err);
      setUser(null);
      localStorage.removeItem('printeasy_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (newToken: string) => {
    localStorage.setItem('printeasy_token', newToken);
    setToken(newToken);
    const me = await authApi.getMe();
    setUser(me);
  };

  const logout = () => {
    localStorage.removeItem('printeasy_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
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
