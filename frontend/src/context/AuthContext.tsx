import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  demoLogin: (type: 'ADMIN' | 'HOST' | 'PARTICIPANT') => Promise<void>;
  logout: () => void;
  updateProfile: (fullName: string, avatarUrl?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('pulsemeet_access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      localStorage.setItem('pulsemeet_user', JSON.stringify(res.data.user));
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
      setUser(null);
      localStorage.removeItem('pulsemeet_access_token');
      localStorage.removeItem('pulsemeet_refresh_token');
      localStorage.removeItem('pulsemeet_user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = res.data;

    localStorage.setItem('pulsemeet_access_token', accessToken);
    localStorage.setItem('pulsemeet_refresh_token', refreshToken);
    localStorage.setItem('pulsemeet_user', JSON.stringify(user));
    setUser(user);
  };

  const register = async (fullName: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { fullName, email, password });
    const { user, accessToken, refreshToken } = res.data;

    localStorage.setItem('pulsemeet_access_token', accessToken);
    localStorage.setItem('pulsemeet_refresh_token', refreshToken);
    localStorage.setItem('pulsemeet_user', JSON.stringify(user));
    setUser(user);
  };

  const demoLogin = async (type: 'ADMIN' | 'HOST' | 'PARTICIPANT') => {
    let email = 'admin@pulsemeet.io';
    let password = 'Admin123!';

    if (type === 'HOST') {
      email = 'sarah.host@pulsemeet.io';
      password = 'Password123!';
    } else if (type === 'PARTICIPANT') {
      email = 'john.dev@pulsemeet.io';
      password = 'Password123!';
    }

    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('pulsemeet_access_token');
    localStorage.removeItem('pulsemeet_refresh_token');
    localStorage.removeItem('pulsemeet_user');
    setUser(null);
  };

  const updateProfile = async (fullName: string, avatarUrl?: string) => {
    const res = await api.put('/auth/profile', { fullName, avatarUrl });
    setUser((prev) => (prev ? { ...prev, ...res.data.user } : res.data.user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        demoLogin,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
