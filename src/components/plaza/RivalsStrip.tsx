import React from 'react';
import Link from 'next/link';
import { UserPlus, UserCheck, Shield } from 'lucide-react';
import type { RivalsGroup, StandingEntry } from '@/lib/plaza-api';

interface RivalsStripProps {
  rivals: RivalsGroup;
  me: StandingEntry | null;
  onFollowToggle?: (userId: string, currentlyFollowing: boolean) => void;
  isGuest?: boolean;
}

export const RivalsStrip: React.FC<RivalsStripProps> = ({
  rivals,
  me,
  onFollowToggle,
  isGuest,
}) => {
  if (!me && (!rivals.above || rivals.above.length === 0) && (!rivals.below || rivals.below.length === 0)) {
    return null;
  }

  const renderRivalItem = (scout: StandingEntry, isMe: boolean) => {
    return (
      <div
        key={`rival-${scout.user_id || scout.rank}`}
        className={`flex-1 min-w-[140px] p-3 rounded-xl border flex flex-col justify-between transition ${
          isMe
            ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
            : 'bg-white border-[var(--color-border-default)]'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span
              className={`text-xs font-black px-1.5 py-0.5 rounded ${
                isMe ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              #{scout.rank}
            </span>
            {!isMe && scout.user_id && !isGuest && (
              <button
                type="button"
                onClick={() => onFollowToggle?.(scout.user_id!, scout.is_following)}
                className={`p-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${
                  scout.is_following
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-subtle)]'
                }`}
                title={scout.is_following ? 'Following' : 'Follow explorer'}
              >
                {scout.is_following ? (
                  <UserCheck className="w-3.5 h-3.5" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          <div className="pt-1 truncate">
            {scout.handle ? (
              <Link
                href={`/profile/${scout.handle}`}
                className="text-xs font-bold text-[var(--color-brand-brown)] hover:text-[var(--color-brand-primary)] truncate block"
              >
                {isMe ? 'You' : scout.display_name}
              </Link>
            ) : (
              <span className="text-xs font-bold text-[var(--color-brand-brown)] truncate block">
                {isMe ? 'You' : scout.display_name}
              </span>
            )}
            <span className="text-[10px] text-[var(--color-text-muted)] block truncate">
              {scout.home_town || 'Pangasinan'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[11px]">
          <span className="font-black text-[var(--color-brand-primary)]">
            {scout.score.toLocaleString()} pts
          </span>
          {me && !isMe && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {scout.score >= me.score
                ? `+${scout.score - me.score}`
                : `-${me.score - scout.score}`}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section aria-label="Rivals strip" className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-[var(--color-brand-brown)] uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-500" />
          <span>Rivals & Nearby Explorers</span>
        </h3>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          Follow rivals to track their progress
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {rivals.above?.map((scout) => renderRivalItem(scout, false))}
        {me && renderRivalItem(me, true)}
        {rivals.below?.map((scout) => renderRivalItem(scout, false))}
      </div>
    </section>
  );
};
