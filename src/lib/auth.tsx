'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, UserModel, WalletModel } from './api';

interface AuthContextType {
  user: UserModel | null;
  token: string | null;
  wallet: WalletModel | null;
  isLoading: boolean;
  loginWithSeed: (seedId: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  deductPointsLocally: (points: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserModel | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('jdq_token');
    const savedUser = localStorage.getItem('jdq_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
    setIsLoading(false);
  }, []);

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setUser(res.data.data);
        localStorage.setItem('jdq_user', JSON.stringify(res.data.data));
      }
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  };

  const refreshWallet = async () => {
    try {
      const res = await api.get('/wallet');
      if (res.data?.success) {
        setWallet(res.data.data);
      }
    } catch (e) {
      // Fallback wallet representation for prototype
      setWallet({
        settlement: 'off-chain prototype',
        unit: 'mJDQ',
        balance_mjdq: 1000,
        balance_jdq: 1.0,
      });
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
      refreshWallet();
    }
  }, [token]);

  const loginWithSeed = async (seedId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/demo-login', { seed_id: seedId });
      if (res.data?.success) {
        const authToken = res.data.data.token;
        const userData = res.data.data.user;
        setToken(authToken);
        setUser(userData);
        localStorage.setItem('jdq_token', authToken);
        localStorage.setItem('jdq_user', JSON.stringify(userData));
        setIsLoading(false);
        return true;
      }
    } catch (e) {
      console.error('Login error', e);
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setWallet(null);
    localStorage.removeItem('jdq_token');
    localStorage.removeItem('jdq_user');
  };

  const deductPointsLocally = (points: number) => {
    if (user) {
      const updated = { ...user, points: Math.max(0, user.points - points) };
      setUser(updated);
      localStorage.setItem('jdq_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        wallet,
        isLoading,
        loginWithSeed,
        logout,
        refreshProfile,
        refreshWallet,
        deductPointsLocally,
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
