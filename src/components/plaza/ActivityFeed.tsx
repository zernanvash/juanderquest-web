import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Compass, Loader2 } from 'lucide-react';
import type { ActivityItem, StandingEntry } from '@/lib/plaza-api';
import { ActivityCard } from './ActivityCard';
import { SuggestedExplorers } from './SuggestedExplorers';

interface ActivityFeedProps {
  activities: ActivityItem[];
  feedScope: 'mixed' | 'following';
  onFeedScopeChange: (scope: 'mixed' | 'following') => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  isGuest?: boolean;
  onCheerToggle?: (activityId: string, cheered: boolean) => Promise<void>;
  onHideActivity?: (activityId: string) => Promise<void>;
  suggestedExplorers?: StandingEntry[];
  onFollowToggle?: (userId: string, currentlyFollowing: boolean) => void;
  pinnedActivityId?: string | null;
  openCommentsDefault?: boolean;
  /** Plan 71: highlight the first post the viewer can still cheer (Daily Mission). */
  highlightFirstCheerable?: boolean;
  onCheerMissionDone?: () => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  feedScope,
  onFeedScopeChange,
  loading,
  hasMore,
  onLoadMore,
  isGuest,
  onCheerToggle,
  onHideActivity,
  suggestedExplorers,
  onFollowToggle,
  pinnedActivityId,
  openCommentsDefault,
  highlightFirstCheerable = false,
  onCheerMissionDone,
}) => {
  const missionTargetId = highlightFirstCheerable
    ? activities.find((activity) => !activity.cheered_by_me && activity.reason !== 'you')?.id ?? null
    : null;
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scrolling
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <section aria-label="Plaza Activity Feed" className="space-y-4">
      {/* Feed Header & Scope Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-[var(--color-brand-brown)] flex items-center gap-2">
            <Compass className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <span>What explorers are up to</span>
          </h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            Live adventures, achievements, and discoveries across Pangasinan
          </span>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] self-start sm:self-center">
          <button
            type="button"
            onClick={() => onFeedScopeChange('mixed')}
            aria-pressed={feedScope === 'mixed'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              feedScope === 'mixed'
                ? 'bg-white text-[var(--color-brand-brown)] shadow-xs border border-[var(--color-border-default)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand-brown)]'
            }`}
          >
            All activity
          </button>
          <button
            type="button"
            onClick={() => onFeedScopeChange('following')}
            aria-pressed={feedScope === 'following'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              feedScope === 'following'
                ? 'bg-white text-[var(--color-brand-brown)] shadow-xs border border-[var(--color-border-default)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand-brown)]'
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div role="feed" aria-busy={loading} className="space-y-3">
        {activities.length === 0 && !loading ? (
          feedScope === 'following' ? (
            <div className="space-y-4">
              <div className="bg-white p-8 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)]">
                You are not following anyone yet or the explorers you follow have not shared recent activity.
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link href="/quests" className="rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 font-bold text-white">Explore quests</Link>
                  <Link href="/plaza?period=all_time#plaza-rankings" className="rounded-xl border border-[var(--color-border-default)] px-4 py-2 font-bold text-[var(--color-brand-brown)]">Find explorers to follow</Link>
                </div>
              </div>
              {suggestedExplorers && suggestedExplorers.length > 0 && (
                <SuggestedExplorers
                  explorers={suggestedExplorers}
                  onFollowToggle={onFollowToggle}
                  isGuest={isGuest}
                />
              )}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[var(--color-border-default)] text-center space-y-4">
              <p className="text-sm font-semibold text-[var(--color-brand-brown)]">No explorer stories yet — yours could be the first.</p>
              <p className="text-xs text-[var(--color-text-muted)]">Complete a quest or connect with other explorers to get the Plaza moving.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/quests" className="rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90">Explore quests</Link>
                <Link href="/plaza?period=all_time#plaza-rankings" className="rounded-xl border border-[var(--color-border-default)] px-4 py-2 text-xs font-bold text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)]">Find explorers to follow</Link>
              </div>
            </div>
          )
        ) : (
          activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isGuest={isGuest}
              onCheerToggle={onCheerToggle}
              onHideActivity={onHideActivity}
              defaultCommentsOpen={pinnedActivityId === activity.id && openCommentsDefault}
              missionHighlight={missionTargetId === activity.id}
              onCheerMissionDone={onCheerMissionDone}
            />
          ))
        )}

        {/* Sentinel & Loader */}
        <div ref={sentinelRef} className="py-4 text-center">
          {loading && (
            <div className="inline-flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand-primary)]" />
              <span>Loading more activities...</span>
            </div>
          )}
          {!hasMore && activities.length > 0 && !loading && (
            <span className="text-xs text-[var(--color-text-muted)] font-medium">
              • You are all caught up with recent adventures!
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
