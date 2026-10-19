'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  getStandings,
  getTowns,
  getFeed,
  getActivity,
  cheerActivity,
  uncheerActivity,
  hideActivity,
  followUser,
  unfollowUser,
  StandingsResponseData,
  TownEntry,
  ActivityItem,
  StandingEntry,
} from '@/lib/plaza-api';
import { PlazaHeader } from '@/components/plaza/PlazaHeader';
import { MyRankCard } from '@/components/plaza/MyRankCard';
import { Podium } from '@/components/plaza/Podium';
import { RivalsStrip } from '@/components/plaza/RivalsStrip';
import { RankList } from '@/components/plaza/RankList';
import { TownBoard } from '@/components/plaza/TownBoard';
import { AlertsCard } from '@/components/plaza/AlertsCard';
import { ActivityFeed } from '@/components/plaza/ActivityFeed';
import { Navigation } from '@/components/Navigation';

function PlazaContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const queryBoard = (searchParams?.get('board') as any) || 'everyone';
  const queryPeriod = (searchParams?.get('period') as any) || 'weekly';
  const queryActivityId = searchParams?.get('activity') || null;
  const queryComments = searchParams?.get('comments') === '1';

  const [board, setBoard] = useState<'everyone' | 'following' | 'town'>(
    ['everyone', 'following', 'town'].includes(queryBoard) ? queryBoard : 'everyone'
  );
  const [period, setPeriod] = useState<'weekly' | 'all_time'>(
    ['weekly', 'all_time'].includes(queryPeriod) ? queryPeriod : 'weekly'
  );

  const [standingsData, setStandingsData] = useState<StandingsResponseData | null>(null);
  const [allTimePreview, setAllTimePreview] = useState<StandingsResponseData | null>(null);
  const [standingsLoading, setStandingsLoading] = useState(true);
  const [standingsError, setStandingsError] = useState<string | null>(null);

  const [towns, setTowns] = useState<TownEntry[]>([]);

  // Feed state
  const [feedScope, setFeedScope] = useState<'mixed' | 'following'>('mixed');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);

  // Load standings
  const loadStandings = useCallback(async () => {
    try {
      setStandingsError(null);
      const data = await getStandings({
        board,
        period,
        limit: 20,
      });
      setStandingsData(data);
    } catch (err: any) {
      setStandingsError(err?.message || 'Failed to load standings');
    } finally {
      setStandingsLoading(false);
    }
  }, [board, period]);

  // Load towns
  const loadTowns = useCallback(async () => {
    try {
      const data = await getTowns();
      setTowns(data?.towns ?? []);
    } catch {
      // Towns board optional failover
    }
  }, []);

  // Load initial feed
  const loadFeed = useCallback(
    async (reset = false) => {
      setFeedLoading(true);
      try {
        const cursor = reset ? undefined : feedCursor || undefined;
        const res = await getFeed({
          scope: feedScope,
          cursor,
          limit: 20,
        });

        if (reset) {
          // If queryActivityId is specified and not present in feed, fetch & pin it
          if (queryActivityId) {
            const hasIt = res.items.some((i) => i.id === queryActivityId);
            if (!hasIt) {
              try {
                const single = await getActivity(queryActivityId);
                if (single) res.items.unshift(single);
              } catch {}
            }
          }
          setActivities(res.items);
        } else {
          setActivities((prev) => [...prev, ...res.items]);
        }

        setFeedCursor(res.next_cursor);
        setHasMoreFeed(res.next_cursor !== null);
      } catch {
        // Feed error handled gracefully
      } finally {
        setFeedLoading(false);
      }
    },
    [feedScope, feedCursor, queryActivityId]
  );

  useEffect(() => {
    setStandingsLoading(true);
    loadStandings();
  }, [loadStandings]);

  const weeklyBoardEmpty = !standingsLoading && !standingsError && period === 'weekly'
    && standingsData?.period === 'weekly' && standingsData.podium.length === 0
    && standingsData.entries.length === 0;

  useEffect(() => {
    if (!weeklyBoardEmpty) return;
    let active = true;
    getStandings({ board: 'everyone', period: 'all_time', limit: 3 })
      .then((data) => { if (active) setAllTimePreview(data); })
      .catch(() => { if (active) setAllTimePreview(null); });
    return () => { active = false; };
  }, [weeklyBoardEmpty]);

  useEffect(() => {
    loadTowns();
  }, [loadTowns]);

  useEffect(() => {
    loadFeed(true);
  }, [feedScope]);

  // Polling every 60 seconds while tab visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadStandings();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [loadStandings]);

  // Deep scroll to pinned activity if present
  useEffect(() => {
    if (queryActivityId && activities.length > 0) {
      const el = document.getElementById(`activity-${queryActivityId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [queryActivityId, activities]);

  // Follow / Unfollow toggle
  const handleFollowToggle = async (targetUserId: string, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      // Update local state in standings
      setStandingsData((prev) => {
        if (!prev) return prev;
        const updateEntry = (s: StandingEntry) =>
          s.user_id === targetUserId ? { ...s, is_following: !currentlyFollowing } : s;

        return {
          ...prev,
          podium: prev.podium.map(updateEntry),
          entries: prev.entries.map(updateEntry),
          rivals: {
            above: prev.rivals.above.map(updateEntry),
            below: prev.rivals.below.map(updateEntry),
          },
        };
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to update follow');
    }
  };

  const handleCheerToggle = async (activityId: string, cheered: boolean) => {
    if (cheered) {
      await cheerActivity(activityId);
    } else {
      await uncheerActivity(activityId);
    }
  };

  const handleHideActivity = async (activityId: string) => {
    await hideActivity(activityId);
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  };

  const isGuest = !user;

  // Split entries into podium (top 3) and rankList (rest)
  const podium = standingsData?.podium || [];
  const rankEntries = standingsData?.entries?.filter((e) => e.rank > 3) || [];
  const rivals = standingsData?.rivals || { above: [], below: [] };
  const me = standingsData?.me || null;
  const rivalAbove = rivals.above && rivals.above.length > 0 ? rivals.above[rivals.above.length - 1] : null;

  return (
    <div className="w-full max-w-[1100px] mx-auto space-y-6 sm:space-y-8 pb-16">
      {/* Header */}
      <PlazaHeader
        board={board}
        period={period}
        onBoardChange={setBoard}
        onPeriodChange={setPeriod}
        resetsInSeconds={standingsData?.week?.resets_in_seconds}
      />

      {/* Standings Error Alert */}
      {standingsError && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-red-500/30 bg-red-50 p-4 text-xs font-medium text-red-900 flex items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{standingsError}</span>
          </div>
          <button
            type="button"
            onClick={loadStandings}
            className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* My Current Rank Card */}
      <MyRankCard me={me} user={user} rivalAbove={rivalAbove} />

      {standingsLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-2 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand-primary)]" />
          <span>Loading verified standings from the Plaza network...</span>
        </div>
      ) : (
        <>
          {/* 🏆 Podium Section (Ranks 1, 2, 3) */}
          {weeklyBoardEmpty ? (
            <div id="plaza-rankings" className="space-y-5">
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 text-center shadow-xs">
                <h2 className="text-lg font-bold text-[var(--color-brand-brown)]">No quests completed this week yet — be the first</h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">The weekly board starts fresh each week. Past achievements are still on the all-time board.</p>
                <button type="button" onClick={() => setPeriod('all_time')} className="mt-4 rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-bold text-white hover:opacity-90">
                  View All time
                </button>
              </div>
              {allTimePreview && allTimePreview.podium.length > 0 && (
                <section aria-label="All-time podium" className="space-y-3">
                  <h2 className="text-base font-bold text-[var(--color-brand-brown)]">All-time leaders</h2>
                  <Podium podium={allTimePreview.podium} />
                </section>
              )}
            </div>
          ) : podium.length > 0 && <div id="plaza-rankings"><Podium podium={podium} /></div>}

          {/* Rivals Strip */}
          <RivalsStrip
            rivals={rivals}
            me={me}
            onFollowToggle={handleFollowToggle}
            isGuest={isGuest}
          />

          {/* Rank List (4-20) */}
          <RankList
            entries={rankEntries}
            maxPoints={podium[0]?.score || 1}
            hasMore={Boolean(standingsData?.next_after_rank)}
            onLoadMore={() => {
              if (standingsData?.next_after_rank) {
                getStandings({
                  board,
                  period,
                  limit: 20,
                  after_rank: standingsData.next_after_rank,
                }).then((more) => {
                  if (!more) return;
                  setStandingsData((prev) =>
                    prev
                      ? {
                          ...prev,
                          entries: [...prev.entries, ...more.entries],
                          next_after_rank: more.next_after_rank,
                        }
                      : more
                  );
                });
              }
            }}
          />

          {/* Town vs Town Board */}
          {towns.length > 0 && <TownBoard towns={towns} />}
        </>
      )}

      {/* Mobile Download Alerts Banner (Web only) */}
      {!isGuest && <AlertsCard />}

      {/* Plaza Activity Feed */}
      <ActivityFeed
        activities={activities}
        feedScope={feedScope}
        onFeedScopeChange={setFeedScope}
        loading={feedLoading}
        hasMore={hasMoreFeed}
        onLoadMore={() => loadFeed(false)}
        isGuest={isGuest}
        onCheerToggle={handleCheerToggle}
        onHideActivity={handleHideActivity}
        suggestedExplorers={standingsData?.entries?.slice(0, 6)}
        onFollowToggle={handleFollowToggle}
        pinnedActivityId={queryActivityId}
        openCommentsDefault={queryComments}
      />
    </div>
  );
}

export default function PlazaPage() {
  return (
    <Navigation>
      <Suspense
        fallback={
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--color-brand-primary)]" />
          </div>
        }
      >
        <PlazaContent />
      </Suspense>
    </Navigation>
  );
}
