'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { PreviewGate, PreviewStatus, setPreviewAuthorization, storedToken } from './preview';
import { invalidateCache } from './cache';
import { useRouter } from 'next/navigation';
import { api, ADMIN_URL, normalizeUser, normalizeWallet, UserModel, WalletModel } from './api';

interface AuthContextType {
  user: UserModel | null;
  token: string | null;
  wallet: WalletModel | null;
  isLoading: boolean;
  isPreviewActive: boolean;
  togglePreview: () => void;
  dismissPreview: () => void;
  previewStatus: PreviewStatus;
  loginWithSeed: (seedId: string) => Promise<boolean>;
  loginWithSimulatedWallet: (username: string, password: string, rememberMe: boolean) => Promise<boolean>;
  loginWithWallet: (address: string, signature: string, rememberMe: boolean) => Promise<boolean>;
  loginWithLocalWallet: (address: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => void;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserModel | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('off');
  const [previewEpoch, setPreviewEpoch] = useState(0);
  const identityRef = useRef(token);
  identityRef.current = token;
  const gateRef = useRef<PreviewGate | null>(null);
  if (!gateRef.current) gateRef.current = new PreviewGate((status) => {
    setPreviewAuthorization(status === 'active' ? identityRef.current : null);
    invalidateCache();
    setPreviewStatus(status);
    setPreviewEpoch((epoch) => epoch + 1);
    window.dispatchEvent(new Event('jdq:preview-mode-changed'));
  });
  const isPreviewActive = previewStatus === 'active';
  const enablePreview = () => gateRef.current!.enable(identityRef.current, async () => {
    const res = await api.get('/qa/capabilities', { timeout: 8000 });
    return res.data?.success === true && res.data?.data?.can_preview_test_data === true;
  });
  const dismissPreview = () => {
    try {
      sessionStorage.removeItem('jdq_preview_requested');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.has('preview')) {
          url.searchParams.delete('preview');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch {}
    gateRef.current!.disable('off');
  };
  const togglePreview = () => {
    if (gateRef.current!.status === 'active' || gateRef.current!.status === 'checking') {
      try { sessionStorage.removeItem('jdq_preview_requested'); } catch {}
      gateRef.current!.disable('off');
    } else if (
      gateRef.current!.status === 'forbidden' ||
      gateRef.current!.status === 'unavailable' ||
      gateRef.current!.status === 'sign_in_required'
    ) {
      dismissPreview();
    } else {
      try { sessionStorage.setItem('jdq_preview_requested', 'true'); sessionStorage.setItem('jdq_app_view', 'true'); } catch {}
      void enablePreview();
    }
  };

  useEffect(() => {
    try {
      // Old preview/passkey values are not proof of authorization.
      for (const storage of [localStorage, sessionStorage]) {
        storage.removeItem('jdq_qa_preview');
        storage.removeItem('jdq_qa_passkey');
      }
      if (new URLSearchParams(window.location.search).get('preview') === 'true') {
        sessionStorage.setItem('jdq_preview_requested', 'true');
        sessionStorage.setItem('jdq_app_view', 'true');
      }
    } catch {}
  }, []);
  useEffect(() => {
    gateRef.current!.disable();
    try {
      if (sessionStorage.getItem('jdq_preview_requested') === 'true') void enablePreview();
    } catch {}
    return () => { gateRef.current!.disable(); };
  }, [token]);
  useEffect(() => {
    const rejected = (event: Event) => {
      const status = (event as CustomEvent<number>).detail;
      gateRef.current!.disable(status === 401 ? 'sign_in_required' : status === 403 ? 'forbidden' : 'unavailable');
    };
    const changedStorage = (event: StorageEvent) => {
      if (event.key === 'jdq_token' || event.key === null) {
        gateRef.current!.disable();
        setUser(null);
        setWallet(null);
        setToken(storedToken());
        // Restore the new tab's identity through the normal validated session path.
        window.location.reload();
      }
    };
    window.addEventListener('jdq:preview-rejected', rejected);
    window.addEventListener('storage', changedStorage);
    return () => { window.removeEventListener('jdq:preview-rejected', rejected); window.removeEventListener('storage', changedStorage); };
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('jdq_token') || sessionStorage.getItem('jdq_token');
    const savedUser = localStorage.getItem('jdq_user') || sessionStorage.getItem('jdq_user');
    if (savedToken && savedUser) {
      try {
        const raw = JSON.parse(savedUser);
        // Validate stored user shape; discard broken sessions (Phase C repair).
        if (isStoredUser(raw) && raw.display_name && typeof raw.demo_points === 'number') {
          const restored = normalizeUser(raw as Parameters<typeof normalizeUser>[0]);
          // Preserve the admin handoff across reloads unless user opted into traveler app view / preview.
          if (restored.role === 'admin' && !shouldStayInTravelerApp()) {
            window.location.assign(adminHandoffUrl(savedToken));
            return;
          }
          setToken(savedToken);
          setUser(restored);
        } else {
          localStorage.removeItem('jdq_token');
          localStorage.removeItem('jdq_user');
          sessionStorage.removeItem('jdq_token');
          sessionStorage.removeItem('jdq_user');
        }
      } catch (e) {
        localStorage.removeItem('jdq_token');
        localStorage.removeItem('jdq_user');
        sessionStorage.removeItem('jdq_token');
        sessionStorage.removeItem('jdq_user');
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
        const storage = localStorage.getItem('jdq_token') ? localStorage : sessionStorage;
        storage.setItem('jdq_user', JSON.stringify(res.data.data));
      }
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  };

  const refreshWallet = async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/wallet/status');
      if (res.data?.success) {
        setWallet(normalizeWallet(res.data.data));
      }
    } catch (e) {
      console.error('Failed to refresh wallet', e);
    }
  };

  useEffect(() => {
    if (token) {
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
        // Admin users hand off to dashboard unless explicitly in traveler app view / preview mode.
        if (normalized.role === 'admin' && !shouldStayInTravelerApp()) {
          window.location.assign(adminHandoffUrl(authToken));
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

  const loginWithSimulatedWallet = async (username: string, password: string, rememberMe: boolean) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/simulated-wallet-login', { username, password });
      if (res.data?.success) {
        const authToken = res.data.data.token;
        const normalized = normalizeUser(res.data.data.user);
        if (normalized.role === 'admin' && !shouldStayInTravelerApp()) {
          window.location.assign(adminHandoffUrl(authToken));
          return false;
        }
        const storage = rememberMe ? localStorage : sessionStorage;
        localStorage.removeItem('jdq_token');
        localStorage.removeItem('jdq_user');
        sessionStorage.removeItem('jdq_token');
        sessionStorage.removeItem('jdq_user');
        storage.setItem('jdq_token', authToken);
        storage.setItem('jdq_user', JSON.stringify(res.data.data.user));
        setToken(authToken);
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

  const storeWalletSession = (data: { token: string; user: Parameters<typeof normalizeUser>[0] }, rememberMe: boolean) => {
    const user = normalizeUser(data.user);
    if (user.role === 'admin' && !shouldStayInTravelerApp()) {
      window.location.assign(adminHandoffUrl(data.token));
      return;
    }
    const storage = rememberMe ? localStorage : sessionStorage;
    localStorage.removeItem('jdq_token');
    localStorage.removeItem('jdq_user');
    sessionStorage.removeItem('jdq_token');
    sessionStorage.removeItem('jdq_user');
    storage.setItem('jdq_token', data.token);
    storage.setItem('jdq_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(user);
  };

  const loginWithWallet = async (address: string, signature: string, rememberMe: boolean) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/wallet/login', { address, signature });
      if (res.data?.success) {
        storeWalletSession(res.data.data, rememberMe);
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
      const res = await api.post('/auth/wallet/local-login', { address });
      if (res.data?.success) {
        storeWalletSession(res.data.data, rememberMe);
        return true;
      }
    } catch {
      // Expected validation/auth failures are rendered by the login page.
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const logout = () => {
    gateRef.current!.disable();
    sessionStorage.removeItem('jdq_preview_requested');
    setToken(null);
    setUser(null);
    setWallet(null);
    localStorage.removeItem('jdq_token');
    localStorage.removeItem('jdq_user');
    sessionStorage.removeItem('jdq_token');
    sessionStorage.removeItem('jdq_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        wallet,
        isLoading,
        isPreviewActive,
        togglePreview,
        dismissPreview,
        previewStatus,
        loginWithSeed,
        loginWithSimulatedWallet,
        loginWithWallet,
        loginWithLocalWallet,
        logout,
        refreshProfile,
        refreshWallet,
      }}
    >
      <React.Fragment key={previewEpoch}>{children}</React.Fragment>
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
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  return { user: user as UserModel, token: token as string, isReady: !isLoading && !!user };
};
