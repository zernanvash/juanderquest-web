import React from 'react';
import Link from 'next/link';
import { Zap, ChevronRight, TrendingUp, TrendingDown, Minus, LogIn } from 'lucide-react';
import type { StandingEntry } from '@/lib/plaza-api';

interface MyRankCardProps {
  me: StandingEntry | null;
  user: { id?: string; displayName?: string; email?: string } | null;
  rivalAbove?: StandingEntry | null;
}

export const MyRankCard: React.FC<MyRankCardProps> = ({ me, user, rivalAbove }) => {
  if (!user) {
    return (
      <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-200 text-gray-500 flex items-center justify-center font-black text-sm shadow-2xs">
            #—
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] block">
              Guest Explorer
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Sign in to see your rank, rivals, and earn activity points across Pangasinan.
            </span>
          </div>
        </div>

        <Link
          href="/login?redirect=/plaza"
          className="py-2.5 px-4 rounded-xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-xs"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign in</span>
        </Link>
      </div>
    );
  }

  const delta = me?.delta ?? null;
  const gapText =
    rivalAbove && me
      ? `${Math.max(1, rivalAbove.score - me.score)} pts to pass ${rivalAbove.display_name}`
      : 'At the top of your group!';

  return (
    <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex flex-wrap items-center justify-between gap-4 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--color-brand-primary)] text-[var(--color-brand-accent)] flex items-center justify-center font-black text-sm shadow-2xs shrink-0">
          {me?.rank ? `#${me.rank}` : '#—'}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
              {me?.display_name || user.displayName || user.email || 'You'}
            </span>
            {delta !== null && delta !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  delta > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : delta < 0
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {delta > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span>▲{delta}</span>
                  </>
                ) : delta < 0 ? (
                  <>
                    <TrendingDown className="w-3 h-3 text-red-600" />
                    <span>▼{Math.abs(delta)}</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-3 h-3" />
                    <span>0</span>
                  </>
                )}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)] block">
            {me
              ? `${me.score.toLocaleString()} pts · ${me.quests} Eco-Quests · ${gapText}`
              : 'Complete quests and verify visits to climb ranks on the Plaza'}
          </span>
        </div>
      </div>

      <Link
        href="/quests"
        className="py-2.5 px-4 rounded-xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-xs"
      >
        <Zap className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
        <span>Explore quests</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
