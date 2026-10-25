'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isPublicPage } from '@/lib/public-routes';
import { isTravelerSession } from '@/lib/traveler-session';

export function WalletAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, sessionUnavailable, retrySession } = useAuth();
  const [toastDismissed, setToastDismissed] = useState(false);
  const publicPage = isPublicPage(pathname);
  const hasTravelerSession = isTravelerSession(user);

  useEffect(() => {
    if (!publicPage && !isLoading && !sessionUnavailable && !hasTravelerSession) {
      const destination = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?redirect=${encodeURIComponent(destination)}`);
    }
  }, [publicPage, isLoading, sessionUnavailable, hasTravelerSession, router]);

  if (publicPage) {
    return (
      <>
        {children}
        {sessionUnavailable && !toastDismissed && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-20 left-4 right-4 z-[85] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-white/95 px-4 py-3 text-xs font-medium text-[var(--color-text-primary)] shadow-lg backdrop-blur-md lg:bottom-6 lg:left-auto lg:right-6"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
              <span className="truncate">
                Browsing public preview — sign-in is temporarily unavailable.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={retrySession}
                className="rounded-lg bg-[#F3EFE6] px-2.5 py-1 text-[11px] font-bold text-[#1B4332] hover:bg-[#E7E1D3] transition-colors cursor-pointer"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setToastDismissed(true)}
                aria-label="Dismiss offline notice"
                className="rounded-lg p-1 text-[#526056] hover:bg-black/5 hover:text-[#141C16] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!publicPage && sessionUnavailable) {
    return <main id="main-content" className="grid min-h-[60vh] place-items-center p-6">
      <div role="alert" className="w-full max-w-md rounded-2xl border border-[var(--color-border-subtle)] bg-white p-6 text-center">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Connection unavailable</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">We could not verify your session right now. Your sign-in was not cleared.</p>
        <button type="button" onClick={retrySession} className="mt-4 min-h-11 rounded-xl bg-[var(--color-brand-primary)] px-5 py-2 font-semibold text-white">Try again</button>
      </div>
    </main>;
  }

  if (!publicPage && (isLoading || !hasTravelerSession)) {
    return <main id="main-content" className="grid min-h-[60vh] place-items-center p-6 text-sm text-[var(--color-text-secondary)]" role="status">
      {isLoading ? 'Restoring your account session…' : 'Taking you to sign-in…'}
    </main>;
  }
  return <>{children}</>;
}

export default WalletAccessGate;
