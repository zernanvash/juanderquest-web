'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  ChevronRight,
  Crown,
  Flame,
  MapPin,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, fetchLeaderboard, LeaderboardModel, LeaderboardRankModel, normalizeSpot, SpotModel } from '@/lib/api';
import { appRoutes } from '@/lib/routes';
import { PublicTravelerSummary } from '@/lib/social';

type Timeframe = 'weekly' | 'all_time';
type Audience = 'everyone' | 'following' | 'town';

const TIMEFRAMES: { id: Timeframe; label: string; icon: typeof Flame }[] = [
  { id: 'weekly', label: 'This week', icon: Flame },
  { id: 'all_time', label: 'All time', icon: Crown },
];

const AUDIENCES: { id: Audience; label: string; icon?: typeof Users }[] = [
  { id: 'everyone', label: 'Everyone', icon: Users },
  { id: 'following', label: 'Following' },
  { id: 'town', label: 'My town', icon: MapPin },
];

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    if (response?.data?.error?.message) return response.data.error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function getExplorerName(explorer: LeaderboardRankModel): string {
  return explorer.handle ? `@${explorer.handle}` : explorer.display_name;
}

function LeaderCard({ explorer, position }: { explorer: LeaderboardRankModel; position: number }) {
  const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';
  const profileHref = explorer.handle
    ? `/profile/${encodeURIComponent(explorer.handle)}`
    : appRoutes.user(explorer.user_id);

  return (
    <article className="relative rounded-2xl border border-[#E8E1D5] bg-white p-5 text-center shadow-sm">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#D7E1EC] bg-[#F0F5FA] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#4C6077]">
        {medal} {position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} place
      </span>
      <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-[#E6EBF0] bg-[#F4EFE6] text-2xl font-black text-[#2D6A4F]">
        {explorer.avatar_url ? (
          <Image src={explorer.avatar_url} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" />
        ) : (
          explorer.display_name.slice(0, 1).toUpperCase()
        )}
      </div>
      <Link href={profileHref} className="mt-3 block truncate text-base font-black text-[#582F0E] hover:text-[#2D6A4F]">
        {getExplorerName(explorer)}
      </Link>
      <p className="mt-1 flex items-center justify-center gap-1 text-xs text-[#837560]">
        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{explorer.primary_town || 'Pangasinan'}</span>
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-[#F0ECE4] pt-3 text-xs font-bold">
        <span className="text-[#837560]">{explorer.approved_quests} quests</span>
        <span className="text-sm font-black text-[#344054]">{explorer.points_earned.toLocaleString()} pts</span>
      </div>
    </article>
  );
}

export default function PlazaPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');
  const [audience, setAudience] = useState<Audience>('everyone');
  const [activityFollowingOnly, setActivityFollowingOnly] = useState(false);
  const [leaderboards, setLeaderboards] = useState<Partial<Record<Timeframe, LeaderboardModel>>>({});
  const [leaderboardErrors, setLeaderboardErrors] = useState<Partial<Record<Timeframe, string>>>({});
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [feedError, setFeedError] = useState('');
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [following, setFollowing] = useState<PublicTravelerSummary[]>([]);
  const [followingError, setFollowingError] = useState('');
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);

  const loadPlaza = useCallback(async (signal: AbortSignal) => {
    const [weeklyResult, allTimeResult, feedResult] = await Promise.allSettled([
      fetchLeaderboard({ timeframe: 'weekly', limit: 50 }),
      fetchLeaderboard({ timeframe: 'all_time', limit: 50 }),
      api.get('/feed', { params: { limit: 20 }, signal }),
    ]);

    if (signal.aborted) return;

    const nextBoards: Partial<Record<Timeframe, LeaderboardModel>> = {};
    const nextErrors: Partial<Record<Timeframe, string>> = {};
    if (weeklyResult.status === 'fulfilled') nextBoards.weekly = weeklyResult.value;
    else nextErrors.weekly = getErrorMessage(weeklyResult.reason);
    if (allTimeResult.status === 'fulfilled') nextBoards.all_time = allTimeResult.value;
    else nextErrors.all_time = getErrorMessage(allTimeResult.reason);
    setLeaderboards(nextBoards);
    setLeaderboardErrors(nextErrors);
    setLoadingLeaderboards(false);

    if (feedResult.status === 'fulfilled') {
      const data = feedResult.value.data?.data;
      if (feedResult.value.data?.success && Array.isArray(data?.items)) {
        setSpots(data.items.map((item: Parameters<typeof normalizeSpot>[0]) => normalizeSpot(item)));
      } else {
        setFeedError('The explorer activity feed returned an unexpected response.');
      }
    } else {
      setFeedError(getErrorMessage(feedResult.reason));
    }
    setLoadingFeed(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void loadPlaza(controller.signal));
    return () => controller.abort();
  }, [loadPlaza]);

  const loadFollowing = useCallback(async () => {
    if (followingLoaded || loadingFollowing) return;
    setLoadingFollowing(true);
    setFollowingError('');
    try {
      const response = await api.get('/users/me/following', { params: { limit: 50 } });
      const data = response.data?.data;
      if (!response.data?.success || !Array.isArray(data?.items)) {
        throw new Error('Your following list could not be loaded.');
      }
      setFollowing(data.items as PublicTravelerSummary[]);
      setFollowingLoaded(true);
    } catch (error) {
      setFollowingError(getErrorMessage(error));
    } finally {
      setLoadingFollowing(false);
    }
  }, [followingLoaded, loadingFollowing]);

  const activeBoard = leaderboards[timeframe];
  const currentUserRank = useMemo(() => {
    if (!activeBoard) return null;
    return activeBoard.my_rank
      ?? activeBoard.top_scouts.find((scout) => scout.is_self || scout.user_id === user?.id)
      ?? null;
  }, [activeBoard, user?.id]);
  const town = currentUserRank?.primary_town && currentUserRank.primary_town !== 'Pangasinan'
    ? currentUserRank.primary_town
    : '';
  const followingIds = useMemo(() => new Set(following.map((traveler) => traveler.id)), [following]);
  const filterRankings = (scouts: LeaderboardRankModel[]) => {
    if (audience === 'following') return scouts.filter((scout) => followingIds.has(scout.user_id));
    if (audience === 'town') return town ? scouts.filter((scout) => scout.primary_town === town) : [];
    return scouts;
  };
  const filteredRankings = filterRankings(activeBoard?.top_scouts ?? []);
  const allTimeLeaders = filterRankings(leaderboards.all_time?.top_scouts ?? []);
  const filteredSpots = useMemo(() => {
    if (audience === 'town') return town ? spots.filter((spot) => spot.municipality?.toLowerCase() === town.toLowerCase()) : [];
    if (audience === 'following') return spots.filter((spot) => spot.createdBy && followingIds.has(spot.createdBy));
    return spots;
  }, [audience, followingIds, spots, town]);
  const visibleActivitySpots = activityFollowingOnly
    ? spots.filter((spot) => spot.createdBy && followingIds.has(spot.createdBy))
    : filteredSpots;

  const resetLabel = timeframe === 'weekly' ? 'Resets every Monday' : 'All-time standings';
  const visibleBoardLoading = loadingLeaderboards || (audience === 'following' && loadingFollowing);
  const noRankingsMessage = audience === 'following'
    ? 'No followed explorers are ranked here yet.'
    : audience === 'town' && !town
      ? 'Your town will appear here once your explorer rank includes a town.'
      : 'No quests completed this week yet — be the first.';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12">
      <header className="rounded-3xl border border-[#E8E1D5] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Pangasinan Plaza
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#582F0E] sm:text-4xl">Plaza</h1>
            <p className="mt-1 text-sm leading-relaxed text-[#756753]">
              Rankings, rivals, and what Pangasinan explorers are up to right now. Connect, cheer, and see who is leading the trails.
            </p>
          </div>
          <div className="inline-flex self-start rounded-2xl border border-[#E8E1D5] bg-[#F5F2EC] p-1 md:self-center" role="group" aria-label="Leaderboard timeframe">
            {TIMEFRAMES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={timeframe === id}
                onClick={() => setTimeframe(id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition sm:px-4 ${
                  timeframe === id ? 'bg-[#2D6A4F] text-white shadow-sm' : 'text-[#6F5B43] hover:bg-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0ECE4] pt-3">
          <div className="inline-flex flex-wrap gap-1 rounded-full border border-[#E8E1D5] bg-[#F5F2EC] p-1" role="group" aria-label="Filter Plaza audience">
            {AUDIENCES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={audience === id}
                onClick={() => {
                  setAudience(id);
                  if (id === 'following') void loadFollowing();
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  audience === id ? 'bg-white text-[#582F0E] shadow-sm' : 'text-[#817565] hover:text-[#582F0E]'
                }`}
              >
                {Icon && <Icon className={`h-3.5 w-3.5 ${id === 'town' ? 'text-emerald-600' : 'text-amber-600'}`} aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#837560]">
            <Activity className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            {resetLabel}
          </span>
        </div>
      </header>

      <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#E8E1D5] bg-[#F5F2EC] p-4 sm:flex-row sm:items-center sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2D6A4F] text-sm font-black text-amber-300">
            {currentUserRank ? `#${currentUserRank.rank}` : '#—'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#49351F]">{user?.displayName || 'Explorer Juan'}</p>
            <p className="text-xs text-[#837560]">
              {currentUserRank
                ? `${currentUserRank.approved_quests} quests completed · ${currentUserRank.points_earned.toLocaleString()} pts`
                : 'Complete quests and verify visits to climb ranks on the Plaza'}
            </p>
          </div>
        </div>
        <Link href="/quests" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#2D6A4F] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#24563F]">
          <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          Explore quests
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </section>

      {audience === 'following' && followingError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {followingError}
        </div>
      )}

      {Object.entries(leaderboardErrors).map(([period, message]) => (
        <div key={period} role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Could not load {period === 'weekly' ? 'this week’s' : 'all-time'} rankings: {message}
          </span>
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-1 font-bold underline">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Retry
          </button>
        </div>
      ))}

      {visibleBoardLoading ? (
        <div className="grid min-h-32 place-items-center rounded-2xl border border-[#E8E1D5] bg-white text-sm text-[#837560]" role="status">
          Loading Plaza rankings…
        </div>
      ) : filteredRankings.length > 0 ? (
        <section aria-label={timeframe === 'weekly' ? 'This week leaders' : 'All-time leaders'}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#582F0E]">{timeframe === 'weekly' ? 'This week’s leaders' : 'All-time leaders'}</h2>
            <span className="text-xs font-medium text-[#837560]">{filteredRankings.length} explorers</span>
          </div>
          <div className="grid grid-cols-1 gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRankings.slice(0, 3).map((scout, index) => (
              <LeaderCard key={scout.user_id} explorer={scout} position={index + 1} />
            ))}
          </div>
          {filteredRankings.length > 3 && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#E8E1D5] bg-white">
              {filteredRankings.slice(3).map((scout) => (
                <Link
                  key={scout.user_id}
                  href={scout.handle ? `/profile/${encodeURIComponent(scout.handle)}` : appRoutes.user(scout.user_id)}
                  className="flex items-center justify-between gap-3 border-b border-[#F0ECE4] px-4 py-3 last:border-0 hover:bg-[#FAF8F3]"
                >
                  <span className="min-w-0 truncate text-sm font-bold text-[#49351F]">#{scout.rank} {getExplorerName(scout)}</span>
                  <span className="shrink-0 text-xs font-black text-[#344054]">{scout.points_earned.toLocaleString()} pts</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-[#E8E1D5] bg-white px-5 py-8 text-center shadow-sm sm:py-10">
          <h2 className="text-lg font-black text-[#582F0E]">{noRankingsMessage}</h2>
          <p className="mt-2 text-sm text-[#837560]">
            {timeframe === 'weekly' ? 'The weekly board starts fresh each week. Past achievements are still on the all-time board.' : 'Verified quest achievements will appear here.'}
          </p>
          {timeframe === 'weekly' && (
            <button type="button" onClick={() => setTimeframe('all_time')} className="mt-4 rounded-full bg-[#2D6A4F] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#24563F]">
              View all time
            </button>
          )}
        </section>
      )}

      {timeframe === 'weekly' && allTimeLeaders.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#582F0E]">All-time leaders</h2>
            <button type="button" onClick={() => setTimeframe('all_time')} className="text-xs font-bold text-[#2D6A4F] hover:underline">
              View all <ChevronRight className="inline h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {allTimeLeaders.slice(0, 3).map((scout, index) => (
              <LeaderCard key={scout.user_id} explorer={scout} position={index + 1} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-[#582F0E]">Get Plaza alerts on the Android app</p>
            <p className="text-xs text-[#837560]">Know when an explorer passes your rank or cheers your quest achievements.</p>
          </div>
        </div>
        <Link href="/download" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-black text-[#49351F] transition hover:bg-amber-400">
          Download app <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-[#582F0E]">
              <Activity className="h-5 w-5 text-[#2D6A4F]" aria-hidden="true" />
              What explorers are up to
            </h2>
            <p className="mt-1 text-xs text-[#837560]">Live adventures, achievements, and discoveries across Pangasinan</p>
          </div>
          <div className="inline-flex rounded-full border border-[#E8E1D5] bg-[#F5F2EC] p-1 text-xs font-bold text-[#6F5B43]" role="group" aria-label="Filter explorer activity">
            <button type="button" aria-pressed={!activityFollowingOnly} onClick={() => setActivityFollowingOnly(false)} className={`rounded-full px-3 py-1.5 ${!activityFollowingOnly ? 'bg-white shadow-sm' : ''}`}>All activity</button>
            <button type="button" aria-pressed={activityFollowingOnly} onClick={() => {
              setActivityFollowingOnly(true);
              void loadFollowing();
            }} className={`rounded-full px-3 py-1.5 ${activityFollowingOnly ? 'bg-white shadow-sm' : ''}`}>Following</button>
          </div>
        </div>

        {feedError ? (
          <div role="alert" className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{feedError}
          </div>
        ) : loadingFeed || ((audience === 'following' || activityFollowingOnly) && loadingFollowing) ? (
          <div className="grid min-h-28 place-items-center rounded-2xl border border-[#E8E1D5] bg-white text-sm text-[#837560]" role="status">
            Loading explorer activity…
          </div>
        ) : visibleActivitySpots.length > 0 ? (
          <div className="grid gap-3">
            {visibleActivitySpots.slice(0, 10).map((spot) => (
              <Link key={spot.id} href={appRoutes.spot(spot.slug || spot.id)} className="flex items-center gap-4 rounded-2xl border border-[#E8E1D5] bg-white p-4 shadow-sm transition hover:border-[#B5D0BF] hover:shadow-md">
                {spot.imageUrl ? (
                  <Image src={spot.imageUrl} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#EAF1E9] text-[#2D6A4F]"><MapPin className="h-6 w-6" aria-hidden="true" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#49351F]">{spot.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[#837560]">{spot.description || 'A new Pangasinan discovery shared with the community.'}</p>
                  <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#2D6A4F]">
                    <MapPin className="h-3 w-3" aria-hidden="true" />{spot.municipality || spot.address || 'Pangasinan'}
                    {spot.createdBy && <span className="text-[#837560]">· Explorer contribution</span>}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#9A8D7B]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E8E1D5] bg-white px-5 py-8 text-center">
            <h3 className="font-black text-[#582F0E]">No explorer stories yet — yours could be the first.</h3>
            <p className="mt-2 text-sm text-[#837560]">
              {activityFollowingOnly || audience === 'following' ? 'Follow explorers to see their new discoveries here.' : 'Complete a quest or share a discovery to get the Plaza moving.'}
            </p>
            <Link href="/explore" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2D6A4F] px-4 py-2.5 text-sm font-black text-white hover:bg-[#24563F]">
              Explore destinations <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
