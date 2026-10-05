'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { PreviewStatus } from './preview';
import { invalidateCache } from './cache';
import { isTravelerSession } from './traveler-session';
import { useRouter } from 'next/navigation';
import { api, ADMIN_URL, isUnauthorizedError, normalizeUser, normalizeWallet, UserModel, WalletModel } from './api';

interface AuthContextType {
  user: UserModel | null;
  token: string | null;
  wallet: WalletModel | null;
  isLoading: boolean;
  sessionUnavailable: boolean;
  retrySession: () => void;
  isPreviewActive: boolean;
  togglePreview: () => void;
  dismissPreview: () => void;
  previewStatus: PreviewStatus;
  loginWithSeed: (seedId: string) => Promise<boolean>;
  loginWithSimulatedWallet: (username: string, password: string, rememberMe: boolean) => Promise<boolean>;
  loginWithWallet: (address: string, signature: string, rememberMe: boolean) => Promise<boolean>;
  loginWithLocalWallet: (address: string, rememberMe: boolean) => Promise<boolean>;
  loginAsGuest: (rememberMe: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const isStoredUser = (raw: unknown): raw is { display_name?: unknown; demo_points?: unknown; id?: unknown; role?: unknown } =>
  typeof raw === 'object' && raw !== null;

export const adminHandoffUrl = (token: string) => `${ADMIN_URL}/#session=${encodeURIComponent(token)}`;

export const shouldStayInTravelerApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('app_view') === 'true' || searchParams.get('preview') === 'true') {
    sessionStorage.setItem('jdq_app_view', 'true');
    return true;
  }
  return sessionStorage.getItem('jdq_app_view') === 'true';
};

export const clearStoredSession = (): void => {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem('jdq_token');
    storage.removeItem('jdq_user');
  }
};

// A server outage does not invalidate an HttpOnly cookie. Only a definitive
// unauthorized response may redirect a traveler to sign-in.
export const sessionFailureDisposition = (error: unknown): 'signed_out' | 'retryable' =>
  isUnauthorizedError(error) ? 'signed_out' : 'retryable';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserModel | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionUnavailable, setSessionUnavailable] = useState(false);
  const [sessionRetry, setSessionRetry] = useState(0);

  // The old evaluator switch is retired. Fictional content has a dedicated,
  // read-only guest page; wallet sessions browse the ordinary app.
  const previewStatus: PreviewStatus = 'off';
  const isPreviewActive = false;
  const togglePreview = () => {};
  const dismissPreview = () => {};

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      setIsLoading(true);
      try {
        let response;
        try {
          response = await api.get('/auth/me');
        } catch (error) {
          const legacyToken = localStorage.getItem('jdq_token') || sessionStorage.getItem('jdq_token');
          if (!isUnauthorizedError(error) || !legacyToken) throw error;
          response = await api.post('/auth/session/upgrade', { remember_me: Boolean(localStorage.getItem('jdq_token')) }, { headers: { Authorization: `Bearer ${legacyToken}` } });
        }
        if (!response.data?.success) throw new Error('Session validation failed');
        const restored = normalizeUser(response.data.data);
        clearStoredSession();
        if (!cancelled) {
          setToken('cookie-session');
          setUser(restored);
          setSessionUnavailable(false);
        }
      } catch (error) {
        if (sessionFailureDisposition(error) === 'signed_out') {
          clearStoredSession();
          invalidateCache();
          if (!cancelled) {
            setToken(null);
            setUser(null);
            setWallet(null);
            setSessionUnavailable(false);
          }
        } else if (!cancelled) {
          // Keep the cookie and any in-memory identity, but the route gate
          // blocks protected content until the backend confirms the session.
          setSessionUnavailable(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void restoreSession();
    return () => { cancelled = true; };
  }, [sessionRetry]);

  useEffect(() => {
    const expireSession = () => {
      clearStoredSession();
      invalidateCache();
      setToken(null);
      setUser(null);
      setWallet(null);
      setSessionUnavailable(false);
      setIsLoading(false);
    };
    window.addEventListener('jdq:session-expired', expireSession);
    return () => window.removeEventListener('jdq:session-expired', expireSession);
  }, []);

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        const normalized = normalizeUser(res.data.data);
        setUser(normalized);
        setSessionUnavailable(false);
      }
    } catch (e) {
      if (!isUnauthorizedError(e)) console.error('Failed to refresh profile', e);
    }
  };

  const refreshWallet = async () => {
    if (!token) return;
    try {
      const res = await api.get('/wallet');
      if (res.data?.success) {
        const nextWallet = normalizeWallet(res.data.data);
        setWallet((prev) => {
          if (prev && nextWallet.balanceMjdq > prev.balanceMjdq) {
            const diff = nextWallet.balanceMjdq - prev.balanceMjdq;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('jdq:reward-received', {
                  detail: { diff, total: nextWallet.balanceMjdq },
                })
              );
            }
          }
          return nextWallet;
        });
      }
    } catch (e) {
      if (!isUnauthorizedError(e)) console.error('Failed to refresh wallet', e);
    }
  };

  useEffect(() => {
    if (!token) return;
    refreshWallet();

    const handleFocus = () => {
      refreshWallet();
      refreshProfile();
    };

    const interval = setInterval(() => {
      refreshWallet();
    }, 12000);

    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token]);

  const loginWithSeed = async (seedId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/demo-login', { seed_id: seedId });
      if (res.data?.success) {
        const normalized = normalizeUser(res.data.data.user);
        // Admin users hand off to dashboard unless explicitly in traveler app view / preview mode.
        if (normalized.role === 'admin' && !shouldStayInTravelerApp()) {
          window.location.assign(adminHandoffUrl(res.data.data.token));
          return false;
        }
        invalidateCache();
        setToken('cookie-session');
        setUser(normalized);
        setSessionUnavailable(false);
        clearStoredSession();
        setIsLoading(false);
        return true;
      }
    } catch (e) {
      console.error('Login error', e);
    }
    setIsLoading(false);
    return false;
  };

  const loginWithSimulatedWallet = async (username: string, password: string, rememberMe: boolean) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/simulated-wallet-login', { username, password });
      if (res.data?.success) {
        const normalized = normalizeUser(res.data.data.user);
        if (normalized.role === 'admin' && !shouldStayInTravelerApp()) {
          window.location.assign(adminHandoffUrl(res.data.data.token));
          return false;
        }
        clearStoredSession();
        invalidateCache();
        setToken('cookie-session');
        setUser(normalized);
        setIsLoading(false);
        return true;
      }
    } catch (e) {
      console.error('Simulated wallet login error', e);
    }
    setIsLoading(false);
    return false;
  };

  const storeWalletSession = (data: { token: string; user: Parameters<typeof normalizeUser>[0] }) => {
    const user = normalizeUser(data.user);
    if (user.role === 'admin' && !shouldStayInTravelerApp()) {
      window.location.assign(adminHandoffUrl(data.token));
      return;
    }
    clearStoredSession();
    invalidateCache();
    setToken('cookie-session');
    setUser(user);
    setSessionUnavailable(false);
  };

  const loginWithWallet = async (address: string, signature: string, rememberMe: boolean) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/wallet/login', { address, signature, remember_me: rememberMe });
      if (res.data?.success) {
        storeWalletSession(res.data.data);
        return true;
      }
    } catch (e) {
      console.error('Wallet login error', e);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const loginWithLocalWallet = async (address: string, rememberMe: boolean) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/wallet/local-login', { address, remember_me: rememberMe });
      if (res.data?.success) {
        storeWalletSession(res.data.data);
        return true;
      }
    } catch {
      // Expected validation/auth failures are rendered by the login page.
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const logout = async () => {
    // The cookie is HttpOnly: only the server can clear it. Keep the visible
    // session intact if that request fails, so a refresh cannot silently log in again.
    await api.post('/auth/logout');
    invalidateCache();
    setToken(null);
    setUser(null);
    setWallet(null);
    setSessionUnavailable(false);
    clearStoredSession();
  };

  const loginAsGuest = async (rememberMe: boolean): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/guest-login', { remember_me: rememberMe });
      if (!res.data?.success) return false;
      clearStoredSession();
      invalidateCache();
      setWallet(null);
      setUser(normalizeUser(res.data.data.user));
      setToken('cookie-session');
      setSessionUnavailable(false);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        wallet,
        isLoading,
        sessionUnavailable,
        retrySession: () => setSessionRetry(value => value + 1),
        isPreviewActive,
        togglePreview,
        dismissPreview,
        previewStatus,
        loginWithSeed,
        loginWithSimulatedWallet,
        loginWithWallet,
        loginWithLocalWallet,
        loginAsGuest,
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
  const { user, token, isLoading, sessionUnavailable } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !sessionUnavailable && !isTravelerSession(user)) {
      const path = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?redirect=${encodeURIComponent(path)}`);
    }
  }, [isLoading, sessionUnavailable, user, router]);

  return { user: user as UserModel, token: token as string, isReady: !isLoading && !sessionUnavailable && isTravelerSession(user) };
};
