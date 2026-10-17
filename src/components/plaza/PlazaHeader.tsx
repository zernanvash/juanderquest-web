import React from 'react';
import { Users, Flame, Crown, MapPin, Clock } from 'lucide-react';

interface PlazaHeaderProps {
  board: 'everyone' | 'following' | 'town';
  period: 'weekly' | 'all_time';
  onBoardChange: (board: 'everyone' | 'following' | 'town') => void;
  onPeriodChange: (period: 'weekly' | 'all_time') => void;
  resetsInSeconds?: number;
}

function formatCountdown(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'Resets soon';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `Resets in ${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return `Resets in ${h}h ${m}m`;
}

export const PlazaHeader: React.FC<PlazaHeaderProps> = ({
  board,
  period,
  onBoardChange,
  onPeriodChange,
  resetsInSeconds,
}) => {
  return (
    <header className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-7 lg:p-8 space-y-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-accent)]/15 border border-[var(--color-brand-accent)]/30 text-[var(--color-brand-accent-dark)] text-xs font-semibold">
            <Users className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
            <span>Pangasinan Plaza</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[var(--color-brand-brown)]">
            Plaza
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
            Rankings, rivals, and what Pangasinan explorers are up to right now. Connect, cheer, and see who is leading the trails.
          </p>
        </div>

        {/* Period Switcher (Weekly Sprint vs All-Time Legends) */}
        <div className="inline-flex p-1.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={() => onPeriodChange('weekly')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
              period === 'weekly'
                ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                : 'text-[var(--color-brand-brown)] hover:bg-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
            <span>This week</span>
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange('all_time')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
              period === 'all_time'
                ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                : 'text-[var(--color-brand-brown)] hover:bg-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>All time</span>
          </button>
        </div>
      </div>

      {/* Board Selector Tabs & Reset Countdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center p-1 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] self-start">
          <button
            type="button"
            onClick={() => onBoardChange('everyone')}
            aria-pressed={board === 'everyone'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              board === 'everyone'
                ? 'bg-white text-[var(--color-brand-brown)] shadow-xs border border-[var(--color-border-default)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand-brown)]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
            <span>Everyone</span>
          </button>
          <button
            type="button"
            onClick={() => onBoardChange('following')}
            aria-pressed={board === 'following'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              board === 'following'
                ? 'bg-white text-[var(--color-brand-brown)] shadow-xs border border-[var(--color-border-default)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand-brown)]'
            }`}
          >
            <span>Following</span>
          </button>
          <button
            type="button"
            onClick={() => onBoardChange('town')}
            aria-pressed={board === 'town'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              board === 'town'
                ? 'bg-white text-[var(--color-brand-brown)] shadow-xs border border-[var(--color-border-default)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand-brown)]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>My town</span>
          </button>
        </div>

        {period === 'weekly' && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-medium self-end sm:self-center">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{formatCountdown(resetsInSeconds)}</span>
          </div>
        )}
      </div>
    </header>
  );
};
