import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service.js';
import { socketService } from '../services/socket.service.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('livetrack_token');
    if (token) {
      authService.getMe()
        .then(profile => {
          setUser(profile);
          socketService.connect(token);
        })
        .catch(() => {
          localStorage.removeItem('livetrack_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    socketService.connect(data.token);
    return data;
  };

  const register = async (data) => {
    const res = await authService.register(data);
    setUser(res.user);
    socketService.connect(res.token);
    return res;
  };

  const logout = () => {
    socketService.disconnect();
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: Boolean(user), login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
