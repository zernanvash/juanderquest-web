'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';

/** Plan 67: asked when a traveler without a wallet tries to buy or redeem in the shop. */
export const walletConnectHref = (returnPath = '/shop') => `/wallet/connect?returnTo=${encodeURIComponent(returnPath)}`;

export function ConnectWalletPromptModal({
  open,
  onClose,
  itemTitle,
  returnPath = '/shop',
}: {
  open: boolean;
  onClose: () => void;
  itemTitle?: string;
  returnPath?: string;
}) {
  const router = useRouter();
  const primary = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="connect-wallet-title" className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Wallet aria-hidden="true" /></span>
        <h2 id="connect-wallet-title" className="text-lg font-black text-[#582f0e]">Connect a wallet to continue</h2>
        <p className="text-sm text-stone-600">
          You can explore Pangasinan, earn EXP and browse the shop without a wallet. To get
          {' '}<strong>&ldquo;{itemTitle || 'this reward'}&rdquo;</strong>, link a Web3 wallet to your account. Your progress stays the same.
        </p>
        <div className="space-y-2">
          <button ref={primary} type="button" onClick={() => router.push(walletConnectHref(returnPath))}
            className="w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-black text-white hover:bg-emerald-900">
            Yes, connect wallet →
          </button>
          <button type="button" onClick={onClose} className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-bold text-stone-700">
            Not now, keep browsing
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConnectWalletPromptModal;
