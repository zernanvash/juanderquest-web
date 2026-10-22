'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ShieldCheck, Mail, Lock, User, KeyRound, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { safeReturnPath } from '@/lib/routes';
import { isTravelerSession } from '@/lib/traveler-session';
import { DevWalletLogin } from '@/components/DevWalletLogin';

type AuthTab = 'signin' | 'register' | 'forgot' | 'verify_otp';
type WalletMode = 'local' | 'signature';

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    isLoading,
    loginWithEmail,
    registerWithEmail,
    verifyEmailOtp,
    loginWithWallet,
  } = useAuth();

  const [activeTab, setActiveTab] = React.useState<AuthTab>('signin');
  const [mode, setMode] = React.useState<WalletMode | null>(null);
  const [rememberMe, setRememberMe] = React.useState(true);

  // Form states
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [ageDeclared, setAgeDeclared] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState('');
  const [resetGrant, setResetGrant] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');

  const [devCodeBanner, setDevCodeBanner] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const redirectTarget = () => {
    const target = new URLSearchParams(window.location.search).get('redirect');
    return safeReturnPath(target);
  };

  React.useEffect(() => {
    if (isTravelerSession(user)) router.replace(redirectTarget() ?? '/quests');
  }, [user, router]);

  React.useEffect(() => {
    api
      .get('/auth/wallet/config')
      .then((response) => {
        setMode(response.data.data.mode);
      })
      .catch(() => setError('Could not load the authentication configuration.'));
  }, []);

  const finish = (ok: boolean) => {
    if (ok) router.push(redirectTarget() ?? '/onboarding/interests');
    else setError('Authentication failed. Please check your credentials.');
  };

  // 1. Email Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    const res = await loginWithEmail(email, password, rememberMe);
    if (res.success) {
      finish(true);
    } else {
      setError(res.error || 'Invalid email or password.');
    }
  };

  // 2. Email Register
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    if (!ageDeclared) {
      setError('You must confirm age eligibility to proceed.');
      return;
    }
    if (!termsAccepted) {
      setError('You must accept the terms and privacy notice.');
      return;
    }
    const res = await registerWithEmail({
      email,
      password,
      display_name: displayName,
      age_eligibility_declared: true,
      terms_accepted: true,
    });
    if (res.success) {
      if (res.dev_code) {
        setDevCodeBanner(res.dev_code);
        setOtpCode(res.dev_code);
      }
      setStatusMessage('Verification code sent! Enter the 6-digit code to activate your passport.');
      setActiveTab('verify_otp');
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    const res = await verifyEmailOtp(email, otpCode, rememberMe);
    if (res.success) {
      finish(true);
    } else {
      setError(res.error || 'Invalid or expired code.');
    }
  };

  // 4. Forgot Password Flow
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    try {
      const res = await api.post('/auth/password/forgot', { email });
      if (res.data?.success) {
        if (res.data.data?.dev_code) {
          setDevCodeBanner(res.data.data.dev_code);
          setOtpCode(res.data.data.dev_code);
        }
        setStatusMessage('Recovery code dispatched to your email address.');
      }
    } catch {
      setError('Recovery service unavailable.');
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    try {
      const res = await api.post('/auth/password/verify-code', { email, code: otpCode });
      if (res.data?.success) {
        setResetGrant(res.data.data.reset_grant);
        setStatusMessage('Code verified. Set your new password.');
      } else {
        setError(res.data?.error?.message || 'Invalid code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid or expired code.');
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    try {
      const res = await api.post('/auth/password/reset', {
        reset_grant: resetGrant,
        new_password: newPassword,
      });
      if (res.data?.success) {
        setStatusMessage('Password updated successfully! Please sign in.');
        setActiveTab('signin');
        setResetGrant('');
        setPassword('');
      } else {
        setError(res.data?.error?.message || 'Reset failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Reset failed.');
    }
  };

  // 5. Connect EVM Wallet
  const connectWallet = async () => {
    setError('');
    setStatusMessage('');
    try {
      if (!window.ethereum) {
        setError('No injected EVM wallet (MetaMask, Coinbase, Brave, etc.) was found.');
        return;
      }
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const walletAddress = accounts[0];
      if (!walletAddress) throw new Error('No wallet account selected');
      
      const challenge = await api.post('/auth/wallet/challenge', { address: walletAddress });
      if (!challenge.data?.success || !challenge.data?.data?.message) {
        throw new Error(challenge.data?.error?.message || 'Failed to request challenge nonce from server.');
      }
      const message = challenge.data.data.message as string;
      
      // Request signature with standard params: [message, address] (some wallets expect hex-encoded message or direct string)
      let signature: string;
      try {
        signature = (await window.ethereum.request({
          method: 'personal_sign',
          params: [message, walletAddress],
        })) as string;
      } catch (signErr: any) {
        // Fallback for wallets that strictly require hex-encoded UTF-8 messages for personal_sign
        if (signErr?.code === 4001 || signErr?.message?.includes('User rejected')) {
          throw new Error('Signature request was rejected in your wallet.');
        }
        const hexMessage = '0x' + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
        signature = (await window.ethereum.request({
          method: 'personal_sign',
          params: [hexMessage, walletAddress],
        })) as string;
      }

      const ok = await loginWithWallet(walletAddress, signature, rememberMe);
      finish(ok);
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      if (err?.code === 4001 || err?.message?.includes('User rejected')) {
        setError('Wallet connection or signature was rejected.');
      } else {
        setError(err?.response?.data?.error?.message || err?.message || 'The wallet connection was rejected or could not be completed.');
      }
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-canvas)] grid place-items-center p-3 sm:p-4">
      <section className="w-full max-w-md bg-white rounded-3xl border border-[var(--color-border-default)] shadow-xl p-5 sm:p-7 space-y-5 sm:space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--color-brand-primary)] text-white grid place-items-center shadow-xs">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--color-brand-brown)] break-words">
            JuanDerQuest Passport
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
            Unified sign-in for Pangasinan travelers, cultural scouts, and municipal explorers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-neutral-100 p-1 border border-neutral-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setError('');
              setStatusMessage('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition ${
              activeTab === 'signin' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError('');
              setStatusMessage('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition ${
              activeTab === 'register' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {devCodeBanner && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 font-bold">
            <span>Dev OTP Code:</span>
            <span className="font-mono text-sm px-2 py-0.5 bg-amber-200 rounded text-amber-950 font-black">
              {devCodeBanner}
            </span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold">
            {statusMessage}
          </div>
        )}

        {/* --- SIGN IN TAB --- */}
        {activeTab === 'signin' && (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="traveler@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-neutral-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    setError('');
                    setStatusMessage('');
                  }}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 px-5 transition cursor-pointer text-sm shadow-xs disabled:opacity-60"
            >
              {isLoading ? 'Signing in…' : 'Sign In with Email'}
            </button>
          </form>
        )}

        {/* --- REGISTER TAB --- */}
        {activeTab === 'register' && (
          <form onSubmit={handleEmailRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Display Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="traveler@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs text-neutral-600">
              <label className="flex items-start gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={ageDeclared}
                  onChange={(e) => setAgeDeclared(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>I confirm that I meet the age eligibility requirement for tourism activities.</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>I agree to the JuanDerQuest terms of service and privacy notice.</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 px-5 transition cursor-pointer text-sm shadow-xs disabled:opacity-60"
            >
              {isLoading ? 'Creating account…' : 'Create Traveler Account'}
            </button>
          </form>
        )}

        {/* --- VERIFY OTP TAB --- */}
        {activeTab === 'verify_otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs text-neutral-600">
              Enter the 6-digit verification code sent to <strong>{email}</strong>.
            </p>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">6-Digit Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.trim())}
                  placeholder="123456"
                  required
                  className="w-full pl-9 pr-3 py-2.5 font-mono text-center tracking-widest text-lg font-black rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 px-5 transition cursor-pointer text-sm shadow-xs disabled:opacity-60"
            >
              {isLoading ? 'Verifying…' : 'Verify & Continue'}
            </button>
          </form>
        )}

        {/* --- FORGOT PASSWORD TAB --- */}
        {activeTab === 'forgot' && (
          <div className="space-y-4">
            {!resetGrant ? (
              <form onSubmit={handleVerifyResetCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Account Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="traveler@example.com"
                      required
                      className="flex-1 px-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-xs font-bold rounded-xl"
                    >
                      Send Code
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Recovery Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.trim())}
                    placeholder="6-digit recovery code"
                    required
                    className="w-full px-3 py-2.5 font-mono text-center tracking-widest text-base font-bold rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 px-5 transition cursor-pointer text-sm shadow-xs disabled:opacity-60"
                >
                  Confirm Recovery Code
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New secure password"
                    required
                    minLength={8}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 px-5 transition cursor-pointer text-sm shadow-xs disabled:opacity-60"
                >
                  Save New Password &amp; Sign In
                </button>
              </form>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setError('');
                  setStatusMessage('');
                }}
                className="text-xs font-bold text-neutral-500 hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Local dev wallet sign-in: dev builds only, and only when the API is in local wallet mode. */}
        <DevWalletLogin mode={mode} rememberMe={rememberMe} onFinish={finish} />

        {/* Web3 EVM Option */}
        {process.env.NEXT_PUBLIC_DISABLE_WALLET_LOGIN !== 'true' && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-neutral-400 font-bold">Or Connect Alternative</span>
              </div>
            </div>

            <button
              type="button"
              onClick={connectWallet}
              disabled={isLoading}
              className="w-full rounded-xl bg-neutral-900 hover:bg-black text-white font-extrabold py-3 px-5 flex justify-center items-center gap-2 shadow-xs transition active:scale-98 cursor-pointer text-sm"
            >
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>Connect Web3 / EVM Wallet</span>
            </button>
          </>
        )}

        <label className="flex items-center gap-2 text-xs font-bold text-neutral-500 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span>Remember this session</span>
        </label>

        {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}

        <button
          type="button"
          onClick={() => router.push('/explore')}
          className="w-full text-xs font-bold text-neutral-500 hover:underline cursor-pointer py-1 text-center"
        >
          Browse destinations
        </button>
      </section>
    </main>
  );
}
