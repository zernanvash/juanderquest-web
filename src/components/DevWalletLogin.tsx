'use client';

import React from 'react';
import { Wallet, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth';

/**
 * Local-development wallet sign-in.
 *
 * Rendered only when BOTH hold:
 *  - this is not a production build (compile-time check, so the panel is stripped
 *    from production bundles), and
 *  - the backend reports wallet mode `local` (`GET /auth/wallet/config`), which the
 *    production API never does (it refuses insecure local wallet auth outright).
 *
 * Signs in with a wallet address or any test name, with no signature, via
 * `POST /auth/wallet/local-login`. Quick buttons use the seeded demo accounts.
 */
export function DevWalletLogin({
  mode,
  rememberMe,
  onFinish,
}: {
  mode: 'local' | 'signature' | null;
  rememberMe: boolean;
  onFinish: (ok: boolean) => void;
}) {
  const { isLoading, loginWithLocalWallet, loginWithSeed } = useAuth();
  const [identifier, setIdentifier] = React.useState('');
  const [error, setError] = React.useState('');

  if (process.env.NODE_ENV === 'production' || mode !== 'local') return null;

  const signInLocal = async (value: string) => {
    const trimmed = value.trim();
    setError('');
    if (trimmed.length < 1 || trimmed.length > 100) {
      setError('Enter a wallet address or a test name (1–100 characters).');
      return;
    }
    onFinish(await loginWithLocalWallet(trimmed, rememberMe));
  };

  const connectInjectedAddress = async () => {
    setError('');
    const provider = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<unknown> } }).ethereum;
    if (!provider) {
      setError('No browser wallet found. Type an address or test name instead.');
      return;
    }
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts?.[0]) throw new Error('no account');
      setIdentifier(accounts[0]);
      await signInLocal(accounts[0]);
    } catch {
      setError('The wallet did not share an address.');
    }
  };

  return (
    <section aria-labelledby="dev-wallet-title" className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50/70 p-4">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <div>
          <h2 id="dev-wallet-title" className="text-sm font-black text-[#7D5800]">Local dev wallet sign-in</h2>
          <p className="text-[11px] text-[#7D5800]">
            Development only: no signature needed. Hidden in production builds and refused by the production API.
          </p>
        </div>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void signInLocal(identifier);
        }}
      >
        <label htmlFor="dev-wallet-identifier" className="sr-only">Wallet address or test name</label>
        <input
          id="dev-wallet-identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="0x… or a test name, e.g. cafe-owner"
          maxLength={100}
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-3 text-sm"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="min-h-11 shrink-0 rounded-xl bg-neutral-900 px-3 text-xs font-extrabold text-white disabled:opacity-60"
        >
          Sign in
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void connectInjectedAddress()}
          disabled={isLoading}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-[#582F0E] disabled:opacity-60"
        >
          <Wallet className="h-3.5 w-3.5 text-amber-600" aria-hidden />
          Use my browser wallet address
        </button>
        <button
          type="button"
          onClick={async () => onFinish(await loginWithSeed('user-1'))}
          disabled={isLoading}
          className="min-h-11 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-[#582F0E] disabled:opacity-60"
        >
          Demo traveler
        </button>
        <button
          type="button"
          onClick={async () => onFinish(await loginWithSeed('admin-1'))}
          disabled={isLoading}
          className="min-h-11 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-[#582F0E] disabled:opacity-60"
        >
          Demo admin
        </button>
      </div>

      {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
    </section>
  );
}
