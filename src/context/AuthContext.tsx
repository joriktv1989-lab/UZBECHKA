import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiFetch } from '../utils/api';

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string, role?: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  googleRegister: (name: string, phone: string, googleId: string, photo?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('uzbechka_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    setUser(data);
    localStorage.setItem('uzbechka_user', JSON.stringify(data));
  };

  const register = async (name: string, phone: string, password: string, role?: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password, role }),
    });
    if (!res.ok) throw new Error('Registration failed');
    const data = await res.json();
    setUser(data);
    localStorage.setItem('uzbechka_user', JSON.stringify(data));
  };

  const googleLogin = async () => {
    const res = await apiFetch('/api/auth/google/url');
    const { url } = await res.json();
    window.open(url, 'google_auth', 'width=500,height=600');
  };

  const googleRegister = async (name: string, phone: string, googleId: string, photo?: string) => {
    const res = await apiFetch('/api/auth/google/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, googleId, photo }),
    });
    if (!res.ok) throw new Error('Registration failed');
    const data = await res.json();
    setUser(data);
    localStorage.setItem('uzbechka_user', JSON.stringify(data));
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const userData = event.data.user;
        setUser(userData);
        localStorage.setItem('uzbechka_user', JSON.stringify(userData));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('uzbechka_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, googleRegister, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
