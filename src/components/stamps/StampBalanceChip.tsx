'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Stamp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { STAMPS_UPDATED_EVENT, fetchStampBalance } from '@/lib/stamps-api';

export const StampBalanceChip: React.FC<{ compact?: boolean; className?: string }> = ({
  compact = false,
  className = '',
}) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [balance, setBalance] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setBalance(null);
      return;
    }
    try {
      const data = await fetchStampBalance();
      setBalance(data.balance);
    } catch {
      setBalance((current) => current ?? 0);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    const handler = () => { void load(); };
    window.addEventListener(STAMPS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(STAMPS_UPDATED_EVENT, handler);
  }, [load]);

  if (!user) return null;

  return (
    <Link
      href="/stamps"
      aria-label={`Passport stamps: ${balance ?? 0}`}
      title="Passport stamps"
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 text-amber-900 font-extrabold transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
        compact ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } ${className}`}
    >
      <Stamp className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />
      <span>{balance === null ? '—' : balance.toLocaleString()}</span>
    </Link>
  );
};
