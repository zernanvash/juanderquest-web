'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isPublicPage } from '@/lib/public-routes';
import { isTravelerSession } from '@/lib/traveler-session';

export function WalletAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, sessionUnavailable, retrySession } = useAuth();
  const publicPage = isPublicPage(pathname);
  const hasWallet = isTravelerSession(user);

  useEffect(() => {
    if (!publicPage && !isLoading && !sessionUnavailable && !hasWallet) {
      const destination = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?redirect=${encodeURIComponent(destination)}`);
    }
  }, [publicPage, isLoading, sessionUnavailable, hasWallet, router]);

  if (!publicPage && sessionUnavailable) {
    return <main id="main-content" className="grid min-h-[60vh] place-items-center p-6">
      <div role="alert" className="w-full max-w-md rounded-2xl border border-[var(--color-border-subtle)] bg-white p-6 text-center">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Connection unavailable</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">We could not verify your session right now. Your sign-in was not cleared.</p>
        <button type="button" onClick={retrySession} className="mt-4 min-h-11 rounded-xl bg-[var(--color-brand-primary)] px-5 py-2 font-semibold text-white">Try again</button>
      </div>
    </main>;
  }

  if (!publicPage && (isLoading || !hasWallet)) {
    return <main id="main-content" className="grid min-h-[60vh] place-items-center p-6 text-sm text-[var(--color-text-secondary)]" role="status">
      {isLoading ? 'Restoring your wallet session…' : 'Taking you to wallet sign-in…'}
    </main>;
  }
  return <>{children}</>;
}
