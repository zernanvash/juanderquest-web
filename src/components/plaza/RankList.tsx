import React from 'react';
import Link from 'next/link';
import { Medal, Loader2, ArrowUp } from 'lucide-react';
import type { StandingEntry } from '@/lib/plaza-api';

interface RankListProps {
  entries: StandingEntry[];
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  maxPoints?: number;
}

export const RankList: React.FC<RankListProps> = ({
  entries,
  loadingMore,
  hasMore,
  onLoadMore,
  maxPoints = 1,
}) => {
  if (entries.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)]">
        No additional ranked explorers to display.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-xs font-black text-[var(--color-brand-brown)] uppercase tracking-wider flex items-center gap-1.5">
          <Medal className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
          <span>Ranked Explorers</span>
        </h3>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {entries.length} explorers listed
        </span>
      </div>

      {entries.map((scout) => {
        const pct = Math.min(100, Math.round((scout.score / Math.max(1, maxPoints)) * 100));

        return (
          <div
            key={`${scout.rank}-${scout.user_id || scout.display_name}`}
            className={`p-3 sm:p-4 rounded-xl border flex items-center justify-between gap-3 transition ${
              scout.is_self
                ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
                : 'bg-white border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/40 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              {/* Rank Badge */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                  scout.is_self
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-[var(--color-bg-subtle)] border-[var(--color-border-default)] text-[var(--color-text-secondary)]'
                }`}
              >
                #{scout.rank}
              </div>

              {/* Scout Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {scout.handle ? (
                    <Link
                      href={`/profile/${scout.handle}`}
                      className="text-xs sm:text-sm font-bold text-[var(--color-brand-brown)] hover:text-[var(--color-brand-primary)] transition truncate"
                    >
                      @{scout.handle}
                    </Link>
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-[var(--color-brand-brown)] truncate">
                      {scout.display_name}
                    </span>
                  )}
                  {scout.is_self && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      You
                    </span>
                  )}
                  {scout.home_town && (
                    <span className="text-[10px] text-[var(--color-text-muted)] font-medium hidden sm:inline">
                      • Base: {scout.home_town}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] text-[var(--color-text-muted)] block truncate">
                    {scout.quests} Eco-Quests completed
                  </span>
                  <div className="hidden md:block w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[var(--color-brand-primary)] h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Score Metrics */}
            <div className="text-right shrink-0">
              <span className="text-xs sm:text-sm font-black text-[var(--color-brand-primary)] block">
                {scout.score.toLocaleString()} pts
              </span>
              {scout.delta !== null && scout.delta !== undefined && (
                <span
                  className={`text-[10px] font-bold block ${
                    scout.delta > 0
                      ? 'text-emerald-700'
                      : scout.delta < 0
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {scout.delta > 0
                    ? `▲${scout.delta}`
                    : scout.delta < 0
                    ? `▼${Math.abs(scout.delta)}`
                    : '—'}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div className="pt-2 text-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="px-4 py-2 rounded-xl bg-white border border-[var(--color-border-default)] hover:bg-[var(--color-bg-subtle)] text-xs font-bold text-[var(--color-brand-brown)] inline-flex items-center gap-2 transition cursor-pointer shadow-2xs"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading more...</span>
              </>
            ) : (
              <span>Show more explorers</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
