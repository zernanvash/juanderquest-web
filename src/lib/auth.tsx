'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, ADMIN_URL, normalizeUser, normalizeWallet, UserModel, WalletModel } from './api';

interface AuthContextType {
  user: UserModel | null;
  token: string | null;
  wallet: WalletModel | null;
  isLoading: boolean;
  loginWithSeed: (seedId: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isStoredUser = (raw: unknown): raw is { display_name?: unknown; demo_points?: unknown; id?: unknown } =>
  typeof raw === 'object' && raw !== null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserModel | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('jdq_token');
    const savedUser = localStorage.getItem('jdq_user');
    if (savedToken && savedUser) {
      try {
        const raw = JSON.parse(savedUser);
        // Validate stored user shape; discard broken sessions (Phase C repair).
        if (isStoredUser(raw) && raw.display_name && typeof raw.demo_points === 'number') {
          setToken(savedToken);
          setUser(normalizeUser(raw as Parameters<typeof normalizeUser>[0]));
        } else {
          localStorage.removeItem('jdq_token');
          localStorage.removeItem('jdq_user');
        }
      } catch (e) {
        localStorage.removeItem('jdq_token');
        localStorage.removeItem('jdq_user');
      }
    }
    setIsLoading(false);
  }, []);

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        const normalized = normalizeUser(res.data.data);
        setUser(normalized);
        localStorage.setItem('jdq_user', JSON.stringify(res.data.data));
      }
    } catch (e: any) {
      // Expired or invalid session: clear it so guards redirect to login.
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        logout();
      } else {
        console.error('Failed to refresh profile', e);
      }
    }
  };

  const refreshWallet = async () => {
    try {
      const res = await api.get('/wallet');
      if (res.data?.success) {
        setWallet(normalizeWallet(res.data.data));
      }
    } catch (e) {
      // No fabricated fallback balance: leave the wallet as null so UI shows a dash.
      console.error('Failed to refresh wallet', e);
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
        const normalized = normalizeUser(res.data.data.user);
        // Admin users hand off to the dashboard with a fragment session (restored protocol).
        if (normalized.role === 'admin') {
          window.location.assign(`${ADMIN_URL}/#session=${encodeURIComponent(authToken)}`);
          return false;
        }
        setToken(authToken);
        setUser(normalized);
        localStorage.setItem('jdq_token', authToken);
        localStorage.setItem('jdq_user', JSON.stringify(res.data.data.user));
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

// Guard for pages that require a traveler session. Redirects to the login page.
export const useRequireAuth = (): { user: UserModel; token: string; isReady: boolean } => {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, user, router]);

  return { user: user as UserModel, token: token as string, isReady: !isLoading && !!user };
};
