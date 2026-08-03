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
    if (ok) router.push('/quests');
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
    <main className="min-h-screen bg-[#FAF9F5] grid place-items-center p-4">
      <section className="w-full max-w-md bg-white rounded-3xl border border-[#D5C4AC]/50 shadow-xl p-7 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#2D6A4F] text-white grid place-items-center"><Wallet /></div>
          <h1 className="text-2xl font-black font-serif text-[#582F0E]">Sign in with your wallet</h1>
          <p className="text-sm text-[#514532]">Your wallet proves account ownership. Signing in does not send a transaction or cost gas.</p>
        </div>

        {mode === 'signature' && (
          <button onClick={connectWallet} disabled={isLoading} className="w-full rounded-xl bg-[#2D6A4F] text-white font-extrabold py-3 px-5 disabled:opacity-60 flex justify-center items-center gap-2">
            <ShieldCheck className="w-4 h-4" />{isLoading ? 'Verifying…' : 'Connect and sign'}
          </button>
        )}

        {mode === 'local' && (
          <form onSubmit={useLocalBypass} className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex gap-2 text-[#7D5800]"><FlaskConical className="w-5 h-5 shrink-0" /><p className="text-xs font-bold">Local development bypass — wallet ownership is not verified.</p></div>
            <label className="block text-xs font-bold text-[#582F0E]">Development wallet identifier
              <input value={address} onChange={(event) => setAddress(event.target.value)} required maxLength={100} spellCheck={false} autoCapitalize="none" autoCorrect="off" className="mt-1.5 w-full rounded-xl border border-[#D5C4AC] px-3 py-2 font-mono text-xs" />
            </label>
            <button disabled={isLoading} className="w-full rounded-xl bg-[#7D5800] text-white font-extrabold py-3 disabled:opacity-60">{isLoading ? 'Starting…' : 'Continue locally'}</button>
          </form>
        )}

        <label className="flex items-center gap-2 text-xs font-bold text-[#514532]"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />Remember this session</label>
        {error && <p role="alert" className="text-xs font-bold text-[#BC4749]">{error}</p>}
        <button onClick={() => router.push('/')} className="w-full text-xs font-bold text-[#3F6653]">Back to home</button>
      </section>
    </main>
  );
}
