'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ShieldCheck, FlaskConical } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type WalletMode = 'local' | 'signature';
type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window { ethereum?: EthereumProvider }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, loginWithWallet, loginWithLocalWallet } = useAuth();
  const [mode, setMode] = React.useState<WalletMode | null>(null);
  const [address, setAddress] = React.useState('dev-wallet-1');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (user) router.replace('/quests');
  }, [user, router]);

  React.useEffect(() => {
    api.get('/auth/wallet/config')
      .then((response) => setMode(response.data.data.mode))
      .catch(() => setError('Could not load the wallet authentication configuration.'));
  }, []);

  const finish = (ok: boolean) => {
    if (ok) router.push('/onboarding/interests');
    else setError('Wallet authentication failed. Please try again.');
  };

  const connectWallet = async () => {
    setError('');
    try {
      if (!window.ethereum) {
        setError('No injected EVM wallet was found. Install or enable a compatible wallet extension.');
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const walletAddress = accounts[0];
      if (!walletAddress) throw new Error('No wallet account selected');
      const challenge = await api.post('/auth/wallet/challenge', { address: walletAddress });
      const message = challenge.data.data.message as string;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      }) as string;
      finish(await loginWithWallet(walletAddress, signature, rememberMe));
    } catch {
      setError('The wallet request was rejected or could not be completed.');
    }
  };

  const useLocalBypass = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const localIdentifier = address.trim();
    if (!localIdentifier) {
      setError('Enter any local wallet identifier.');
      return;
    }
    finish(await loginWithLocalWallet(localIdentifier, rememberMe));
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-canvas)] grid place-items-center p-4">
      <section className="w-full max-w-md bg-white rounded-3xl border border-[var(--color-border-default)] shadow-xl p-7 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--color-brand-primary)] text-white grid place-items-center shadow-xs">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black font-serif text-[var(--color-brand-brown)]">Sign in with your wallet</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Your wallet proves account ownership. Signing in does not send a transaction or cost gas.</p>
        </div>

        {mode === 'signature' && (
          <button
            onClick={connectWallet}
            disabled={isLoading}
            className="w-full rounded-xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white font-extrabold py-3.5 px-5 disabled:opacity-60 flex justify-center items-center gap-2 shadow-xs transition active:scale-98 cursor-pointer min-h-[44px]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLoading ? 'Verifying…' : 'Connect and sign'}</span>
          </button>
        )}

        {mode === 'local' && (
          <form onSubmit={useLocalBypass} className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50/70 p-4">
            <div className="flex gap-2 text-[var(--color-brand-accent-dark)]">
              <FlaskConical className="w-5 h-5 shrink-0" />
              <p className="text-xs font-bold">Local development bypass — wallet ownership is not verified.</p>
            </div>
            <label className="block text-xs font-bold text-[var(--color-brand-brown)]">
              Development wallet identifier
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                required
                maxLength={100}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2 font-mono text-xs focus:border-[var(--color-brand-primary)] focus:outline-none min-h-[40px]"
              />
            </label>
            <button
              disabled={isLoading}
              className="w-full rounded-xl bg-[var(--color-brand-accent-dark)] hover:opacity-90 text-white font-extrabold py-3 disabled:opacity-60 transition cursor-pointer min-h-[44px]"
            >
              {isLoading ? 'Starting…' : 'Continue locally'}
            </button>
          </form>
        )}

        <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)] cursor-pointer">
          <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="rounded" />
          <span>Remember this session</span>
        </label>
        {error && <p role="alert" className="text-xs font-bold text-[#BC4749]">{error}</p>}
        <button
          onClick={() => router.push('/')}
          className="w-full text-xs font-bold text-[var(--color-brand-primary)] hover:underline cursor-pointer py-1"
        >
          Back to home
        </button>
      </section>
    </main>
  );
}
