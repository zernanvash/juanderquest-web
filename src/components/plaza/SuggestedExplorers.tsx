import React from 'react';
import Link from 'next/link';
import { UserPlus, UserCheck, Users } from 'lucide-react';
import type { StandingEntry } from '@/lib/plaza-api';

interface SuggestedExplorersProps {
  explorers: StandingEntry[];
  onFollowToggle?: (userId: string, currentlyFollowing: boolean) => void;
  isGuest?: boolean;
}

export const SuggestedExplorers: React.FC<SuggestedExplorersProps> = ({
  explorers,
  onFollowToggle,
  isGuest,
}) => {
  if (!explorers || explorers.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 sm:p-5 shadow-xs space-y-3">
      <div className="space-y-0.5">
        <h4 className="text-xs sm:text-sm font-black text-[var(--color-brand-brown)] flex items-center gap-1.5">
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Follow explorers to fill your Plaza</span>
        </h4>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Follow active discoverers from your town or top rankings to see their quests and achievements.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {explorers.slice(0, 4).map((scout) => (
          <div
            key={scout.user_id || scout.rank}
            className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              {scout.handle ? (
                <Link
                  href={`/profile/${scout.handle}`}
                  className="text-xs font-bold text-[var(--color-brand-brown)] hover:text-[var(--color-brand-primary)] truncate block"
                >
                  {scout.display_name}
                </Link>
              ) : (
                <span className="text-xs font-bold text-[var(--color-brand-brown)] truncate block">
                  {scout.display_name}
                </span>
              )}
              <span className="text-[10px] text-[var(--color-text-muted)] block truncate">
                {scout.home_town || 'Pangasinan'} · {scout.score.toLocaleString()} pts
              </span>
            </div>

            {scout.user_id && !isGuest && (
              <button
                type="button"
                onClick={() => onFollowToggle?.(scout.user_id!, scout.is_following)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  scout.is_following
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-primary-hover)]'
                }`}
              >
                {scout.is_following ? (
                  <>
                    <UserCheck className="w-3 h-3" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
