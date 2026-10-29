'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Coins, Ticket, Wallet, BadgeCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { safeReturnPath } from '@/lib/routes';
import { hasConnectedWallet } from '@/lib/traveler-session';
import { shortAddress, signWalletChallenge } from '@/lib/evm-wallet';
import { Navigation } from '@/components/Navigation';

// Plan 67: link a wallet to an existing account (email, Google or wallet) and go back
// to where the traveler was, usually the shop.

const randomTestAddress = () =>
  '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, '0')).join('');

function WalletConnectContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, bindWallet } = useAuth();
  const returnTo = safeReturnPath(params.get('returnTo')) ?? '/shop';
  const [mode, setMode] = React.useState<'local' | 'signature' | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [linked, setLinked] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.get('/auth/wallet/config').then((r) => setMode(r.data.data.mode)).catch(() => setMode(null));
  }, []);

  React.useEffect(() => {
    if (!linked) return;
    const timer = window.setTimeout(() => router.push(returnTo), 1200);
    return () => window.clearTimeout(timer);
  }, [linked, returnTo, router]);

  const bind = async (getWallet: () => Promise<{ address: string; signature: string }>) => {
    setBusy(true);
    setError('');
    try {
      const { address, signature } = await getWallet();
      const res = await bindWallet(address, signature);
      if (res.success) setLinked(address);
      else setError(res.error || 'Could not link this wallet.');
    } catch (err) {
      setError((err as Error)?.message || 'The wallet could not be connected.');
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;
  const already = hasConnectedWallet(user) ? user.walletAddress! : null;

  return (
    <Navigation>
      <main id="main-content" className="mx-auto w-full max-w-lg space-y-5 px-4 py-8">
        <header className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-800">Wallet</p>
          <h1 className="text-2xl font-black text-[#582f0e]">Connect a blockchain wallet</h1>
          <p className="text-sm text-stone-600">Your account, EXP and points stay exactly as they are.</p>
        </header>

        <section aria-label="Your account" className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
          <div className="min-w-0">
            <p className="truncate font-black text-stone-900">{user.displayName}</p>
            <p className="truncate text-xs text-stone-500">{user.email}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-900"><Coins size={16} aria-hidden="true" />{user.points} points</span>
        </section>

        {linked || already ? (
          <section role="status" className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto text-emerald-700" aria-hidden="true" />
            <p className="font-black text-emerald-900">Wallet {shortAddress(linked ?? already!)} linked!</p>
            <button type="button" onClick={() => router.push(returnTo)} className="w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-black text-white">
              {returnTo.startsWith('/shop') ? 'Continue to shop →' : 'Continue →'}
            </button>
          </section>
        ) : (
          <>
            <section aria-label="Why connect" className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
              <p className="flex items-start gap-2"><Ticket size={18} className="mt-0.5 shrink-0 text-emerald-800" aria-hidden="true" />Redeem partner vouchers and buy cosmetics in the shop.</p>
              <p className="flex items-start gap-2"><BadgeCheck size={18} className="mt-0.5 shrink-0 text-emerald-800" aria-hidden="true" />Claim test tJDQ rewards and soulbound badges on Polygon Amoy (testnet, no real money).</p>
            </section>
            <div className="space-y-2">
              <button type="button" disabled={busy} onClick={() => void bind(signWalletChallenge)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-black disabled:opacity-60">
                <Wallet className="h-4 w-4 text-amber-400" aria-hidden="true" />
                {busy ? 'Waiting for your wallet…' : 'Connect MetaMask / browser wallet'}
              </button>
              {mode === 'local' && process.env.NODE_ENV !== 'production' && (
                <button type="button" disabled={busy} onClick={() => void bind(async () => ({ address: randomTestAddress(), signature: 'local-test-wallet' }))}
                  className="w-full rounded-xl border border-dashed border-amber-400 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-900 disabled:opacity-60">
                  Bind a local test wallet (preview only)
                </button>
              )}
            </div>
            {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
            <button type="button" onClick={() => router.push(returnTo)} className="w-full text-xs font-bold text-stone-500 hover:underline">Not now</button>
          </>
        )}
      </main>
    </Navigation>
  );
}

export default function WalletConnectPage() {
  return <Suspense fallback={null}><WalletConnectContent /></Suspense>;
}
