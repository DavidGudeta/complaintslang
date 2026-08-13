import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';

const AuthContext = createContext(undefined);
const isLocalDev = import.meta.env.DEV;

const normalizeRole = (value) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/__+/g, '_');

  if (normalized === 'HEAD_OFFICE' || normalized === 'HEADOFFICE') {
    return 'HEAD_OFFICE_DIRECTOR';
  }

  return normalized;
};

const getFallbackUser = () => ({
  id: 'dev-user',
  role: 'HEAD_OFFICE_DIRECTOR',
  display_role: 'HEAD_OFFICE_DIRECTOR',
  tax_center_name: '',
  tax_center_id: null,
  token: 'demo-token',
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('taxguard_user');

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser?.token) {
          const normalizedUser = {
            ...parsedUser,
            role: normalizeRole(parsedUser.role || parsedUser.display_role),
            display_role: normalizeRole(parsedUser.display_role || parsedUser.role),
          };
          setUser(normalizedUser);
        } else {
          localStorage.removeItem('taxguard_user');
        }
      } catch (error) {
        console.error('Failed to load saved auth user:', error);
        localStorage.removeItem('taxguard_user');
      }
    } else if (isLocalDev) {
      setUser(getFallbackUser());
    }

    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/login', { email, password });

      const userData = res.data.user;
      const token = res.data.token;

      if (!userData || !token) {
        throw new Error('Invalid response from server');
      }

      const authUser = {
        ...userData,
        token,
        role: normalizeRole(userData?.role || userData?.display_role),
        display_role: normalizeRole(userData?.display_role || userData?.role),
      };
      setUser(authUser);
      localStorage.setItem('taxguard_user', JSON.stringify(authUser));

    } catch (err) {
      console.error(err);
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('taxguard_user');
  };

  const updateUser = (data) => {
    setUser(data);
    localStorage.setItem('taxguard_user', JSON.stringify(data));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
}