'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface SignInSheetProps {
  open: boolean;
  onClose: () => void;
  actionLabel?: string;
  description?: string;
  reason?: string;
  onSuccess?: () => void;
}

export { SignInSheet };
export default function SignInSheet({
  open,
  onClose,
  actionLabel = 'continue',
  description = 'Sign in with your Explorer Pass or start an instant guest session without losing your place.',
  reason,
  onSuccess,
}: SignInSheetProps) {
  const router = useRouter();
  const auth = useAuth() as { loginAsDemo?: () => Promise<void> };
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleGuestContinue = async () => {
    setBusy(true);
    try {
      await auth.loginAsDemo?.();
      onClose();
      onSuccess?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sign in to ${actionLabel}`}
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[28px] sm:rounded-3xl border border-[#E2DDD3] bg-white p-6 sm:p-7 text-[#141C16] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E9F3EC] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1B4332]">
              Explorer Pass
            </span>
            <h2 className="mt-2.5 text-xl font-extrabold tracking-tight text-[#141C16]">
              Sign in to {actionLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in sheet"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E2DDD3] text-[#526056] hover:bg-[#F3EFE6] hover:text-[#141C16] transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[#526056]">{description}</p>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/explore';
              router.push(`/login?redirect=${encodeURIComponent(currentPath || '/explore')}`);
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1B4332] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#143325] transition-colors cursor-pointer"
          >
            <span>Sign in or create account</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGuestContinue()}
            className="flex min-h-11 w-full items-center justify-center rounded-full border border-[#E2DDD3] bg-[#FAF8F4] px-5 py-3 text-sm font-bold text-[#141C16] hover:bg-[#F3EFE6] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Starting guest session...' : 'Continue with instant guest pass'}
          </button>
        </div>
      </div>
    </div>
  );
}
