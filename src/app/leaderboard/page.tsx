'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Trophy,
  Award,
  Medal,
  MapPin,
  ShieldCheck,
  Zap,
  ChevronRight,
  TrendingUp,
  Search,
  Crown,
  ArrowUp,
  Loader2,
  Flame,
  AlertCircle,
  Users,
  X,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchLeaderboard,
  LeaderboardModel,
  LeaderboardRankModel,
} from '@/lib/api';
import {
  searchPublicTravelers,
  PersonResultItem,
  isProcessableQuery,
  normalizeSearchQuery,
} from '@/lib/search';
import { travelerProfileHref } from '@/lib/preview';
import { UserBadgesRow } from '@/components/Badges';

function getMunicipalityIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('bolinao')) return '🏖️';
  if (lower.includes('alaminos') || lower.includes('islands')) return '🏝️';
  if (lower.includes('dagupan')) return '🐟';
  if (lower.includes('lingayen')) return '🏛️';
  if (lower.includes('dasol')) return '🧂';
  if (lower.includes('manaoag')) return '⛪';
  if (lower.includes('san fabian')) return '🌊';
  if (lower.includes('bani')) return '🦇';
  return '📍';
}

function LeaderboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const urlTab = searchParams?.get('tab') ?? null;
  const urlMode = searchParams?.get('mode') ?? null;
  const urlQuery = searchParams?.get('q') || '';

  const initialTab = (urlTab === 'people' || urlMode === 'travelers' || (urlQuery && !urlTab)) ? 'travelers' : 'roster';

  const [activeTab, setActiveTab] = useState<'roster' | 'travelers'>(initialTab);
  const [timeframe, setTimeframe] = useState<'weekly' | 'allTime'>('weekly');
  const [rosterFilterQuery, setRosterFilterQuery] = useState('');
  const [selectedTown, setSelectedTown] = useState<string>('all');

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Progressive batch rendering / Infinite scroll adaptation for roster
  const [visibleCount, setVisibleCount] = useState<number>(15);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Public Traveler Directory Search State
  const [travelerQuery, setTravelerQuery] = useState(urlQuery);
  const [travelers, setTravelers] = useState<PersonResultItem[]>([]);
  const [loadingTravelers, setLoadingTravelers] = useState(false);
  const [travelerError, setTravelerError] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState('');

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard({
        timeframe: timeframe === 'weekly' ? 'weekly' : 'all_time',
      });
      setLeaderboardData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const rawList: LeaderboardRankModel[] = useMemo(() => {
    return leaderboardData?.top_scouts || [];
  }, [leaderboardData]);

  // Extract unique towns for filtering
  const availableTowns = useMemo(() => {
    const set = new Set<string>();
    rawList.forEach((s) => {
      if (s.primary_town && s.primary_town !== 'Pangasinan') {
        set.add(s.primary_town);
      }
    });
    return ['all', ...Array.from(set).sort()];
  }, [rawList]);

  // Filter scouts by search query & town in ranked roster
  const filteredList = useMemo(() => {
    return rawList.filter((s) => {
      const matchTown = selectedTown === 'all' || s.primary_town === selectedTown;
      const matchSearch =
        rosterFilterQuery === '' ||
        s.display_name.toLowerCase().includes(rosterFilterQuery.toLowerCase()) ||
        (s.handle && s.handle.toLowerCase().includes(rosterFilterQuery.toLowerCase())) ||
        s.primary_town.toLowerCase().includes(rosterFilterQuery.toLowerCase()) ||
        s.badge.toLowerCase().includes(rosterFilterQuery.toLowerCase());
      return matchTown && matchSearch;
    });
  }, [rawList, selectedTown, rosterFilterQuery]);

  // Reset pagination on filter or timeframe change
  useEffect(() => {
    setVisibleCount(15);
  }, [timeframe, selectedTown, rosterFilterQuery]);

  // Adaptive Infinite Scroll Sentinel Observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + 10);
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredList]);

  // Execute Traveler Directory Search with Debounce and Cancellation
  const executeTravelerSearch = useCallback(async (query: string, signal?: AbortSignal) => {
    const norm = normalizeSearchQuery(query);
    if (!isProcessableQuery(norm)) {
      setTravelers([]);
      setSearchedQuery('');
      setLoadingTravelers(false);
      setTravelerError(null);
      return;
    }

    setLoadingTravelers(true);
    setTravelerError(null);
    try {
      const res = await searchPublicTravelers(norm, undefined, 20, signal);
      setTravelers(res.items);
      setSearchedQuery(norm);
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError') return;
      setTravelerError(err?.message || 'Failed to search public travelers.');
      setTravelers([]);
    } finally {
      if (!signal?.aborted) {
        setLoadingTravelers(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'travelers') return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void executeTravelerSearch(travelerQuery, controller.signal);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeTab, travelerQuery, executeTravelerSearch]);

  // Top 3 Podium Scouts (Rank 1, 2, 3)
  const topPodium = useMemo(() => {
    const first = rawList.find((s) => s.rank === 1);
    const second = rawList.find((s) => s.rank === 2);
    const third = rawList.find((s) => s.rank === 3);
    return { first, second, third };
  }, [rawList]);

  const maxPoints = useMemo(() => {
    return rawList[0]?.points_earned || 1;
  }, [rawList]);

  const paginatedList = filteredList.slice(0, visibleCount);
  const hasMoreToLoad = visibleCount < filteredList.length;

  const presentationBuild = process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE === 'true';

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-12">
      {presentationBuild && (
        <div role="status" className="rounded-2xl border-2 border-amber-500 bg-amber-100 p-4 text-sm font-bold text-amber-950">
          Presentation demo mode — Explorer leaderboards and civic rankings reflect prototype simulation. Demo JuanChoice voting activities do not contribute to official rankings.
        </div>
      )}

      {/* Season 1 Pilot Provenance Notice */}
      {leaderboardData?.is_sparse_pilot && (
        <div
          role="status"
          className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/80 p-4 text-xs font-medium text-emerald-900 flex items-start gap-3 shadow-2xs"
        >
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-emerald-950 block">Season 1 Pilot Rankings • Verified Activity Provenance</span>
            <p className="text-emerald-800 leading-relaxed">
              {leaderboardData.provenance_note ||
                'Rankings reflect verified submissions and activity. As pilot quests are verified by community validators, scout positions update deterministically.'}
            </p>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-red-500/30 bg-red-50 p-4 text-xs font-medium text-red-900 flex items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchRankings}
            className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header Hero Banner */}
      <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-7 lg:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-accent)]/15 border border-[var(--color-brand-accent)]/30 text-[var(--color-brand-accent-dark)] text-xs font-semibold">
              <Trophy className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
              <span>Pangasinan Leaderboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[var(--color-brand-brown)]">
              Explorer Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
              Honoring the top JuanDerers, trail champions, and local discoverers across Pangasinan. Track community standings, verified visits, and civic progression.
            </p>
          </div>

          {/* Timeframe Toggle Switcher */}
          <div className="inline-flex p-1.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => setTimeframe('weekly')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
                timeframe === 'weekly'
                  ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                  : 'text-[var(--color-brand-brown)] hover:bg-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
              <span>Weekly Sprint</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('allTime')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
                timeframe === 'allTime'
                  ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                  : 'text-[var(--color-brand-brown)] hover:bg-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>All-Time Legends</span>
            </button>
          </div>
        </div>

        {/* User's Current Standing Banner */}
        <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-brand-primary)] text-[var(--color-brand-accent)] flex items-center justify-center font-black text-sm shadow-2xs">
              {leaderboardData?.my_rank ? `#${leaderboardData.my_rank.rank}` : '#—'}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] block">
                  {user ? (user.displayName || user.email) : 'Guest Explorer'}
                </span>
                {user && <UserBadgesRow isCurrentUser size="xs" enablePreviewModal={false} />}
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {leaderboardData?.my_rank
                  ? `${leaderboardData.my_rank.scout_reputation} Scout Rep • ${leaderboardData.my_rank.points_earned.toLocaleString()} pts • ${leaderboardData.my_rank.approved_quests} verified Eco-Quests`
                  : user
                  ? `${user.points || 0} pts • Complete Eco-Quests and verify visits to climb ranks`
                  : 'Sign in to record verified activity points'}
              </span>
            </div>
          </div>

          <Link
            href="/quests"
            className="py-2.5 px-4 rounded-xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
            <span>Explore Eco-Quests to Climb</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 🏆 Top 3 Podium Section */}
      {topPodium.first && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-2">
          {/* 🥈 Rank 2 - Silver (Left) */}
          {topPodium.second ? (
            <div className="order-2 md:order-1 bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition relative group">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
                <span>🥈 2nd Place</span>
              </div>

              <div className="text-center space-y-2.5 pt-2">
                <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex items-center justify-center text-xl font-black text-slate-700 shadow-inner">
                  {topPodium.second.display_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {topPodium.second.handle ? (
                      <Link
                        href={`/profile/${topPodium.second.handle}`}
                        className="text-base font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                      >
                        @{topPodium.second.handle}
                      </Link>
                    ) : (
                      <span className="text-base font-black text-[var(--color-brand-brown)]">
                        {topPodium.second.display_name}
                      </span>
                    )}
                    <UserBadgesRow
                      userIdOrName={topPodium.second.user_id || topPodium.second.handle || topPodium.second.display_name}
                      isCurrentUser={topPodium.second.is_self}
                      size="xs"
                      enablePreviewModal={false}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{topPodium.second.primary_town}</span>
                  </p>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-700 text-[10px] font-bold border border-slate-200">
                  {topPodium.second.badge}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-[var(--color-text-muted)]">{topPodium.second.approved_quests} Eco-Quests</span>
                <span className="text-slate-800 font-black text-sm">{topPodium.second.points_earned.toLocaleString()} pts</span>
              </div>
            </div>
          ) : (
            <div className="hidden md:block order-2 md:order-1" />
          )}

          {/* 🥇 Rank 1 - Gold Champion (Center / Spotlight) */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50/90 via-white to-white rounded-2xl border-2 border-amber-300 p-6 sm:p-7 flex flex-col justify-between shadow-md hover:shadow-lg transition relative group md:-translate-y-2">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>1st Place Champion</span>
            </div>

            <div className="text-center space-y-3 pt-3">
              <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-amber-200 to-amber-400 border-4 border-white flex items-center justify-center text-3xl font-black text-amber-950 shadow-md">
                👑
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {topPodium.first.handle ? (
                    <Link
                      href={`/profile/${topPodium.first.handle}`}
                      className="text-lg sm:text-xl font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                    >
                      @{topPodium.first.handle}
                    </Link>
                  ) : (
                    <span className="text-lg sm:text-xl font-black text-[var(--color-brand-brown)]">
                      {topPodium.first.display_name}
                    </span>
                  )}
                  <UserBadgesRow
                    userIdOrName={topPodium.first.user_id || topPodium.first.handle || topPodium.first.display_name}
                    isCurrentUser={topPodium.first.is_self}
                    size="xs"
                    enablePreviewModal={false}
                  />
                </div>
                <p className="text-xs text-[var(--color-brand-primary)] font-bold flex items-center justify-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{topPodium.first.primary_town}</span>
                </p>
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-black border border-amber-300/80">
                {topPodium.first.badge}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-amber-200 flex items-center justify-between text-xs font-bold">
              <span className="text-[var(--color-text-muted)]">{topPodium.first.approved_quests} Eco-Quests</span>
              <span className="text-[var(--color-brand-primary)] font-black text-base">{topPodium.first.points_earned.toLocaleString()} pts</span>
            </div>
          </div>

          {/* 🥉 Rank 3 - Bronze (Right) */}
          {topPodium.third ? (
            <div className="order-3 md:order-3 bg-white rounded-2xl border-2 border-orange-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition relative group">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-orange-800 text-[11px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
                <span>🥉 3rd Place</span>
              </div>

              <div className="text-center space-y-2.5 pt-2">
                <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-orange-100 to-orange-200 border-2 border-orange-300 flex items-center justify-center text-xl font-black text-orange-800 shadow-inner">
                  {topPodium.third.display_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {topPodium.third.handle ? (
                      <Link
                        href={`/profile/${topPodium.third.handle}`}
                        className="text-base font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                      >
                        @{topPodium.third.handle}
                      </Link>
                    ) : (
                      <span className="text-base font-black text-[var(--color-brand-brown)]">
                        {topPodium.third.display_name}
                      </span>
                    )}
                    <UserBadgesRow
                      userIdOrName={topPodium.third.user_id || topPodium.third.handle || topPodium.third.display_name}
                      isCurrentUser={topPodium.third.is_self}
                      size="xs"
                      enablePreviewModal={false}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-orange-600" />
                    <span>{topPodium.third.primary_town}</span>
                  </p>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-800 text-[10px] font-bold border border-orange-200">
                  {topPodium.third.badge}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between text-xs font-bold">
                <span className="text-[var(--color-text-muted)]">{topPodium.third.approved_quests} quests</span>
                <span className="text-orange-900 font-black text-sm">{topPodium.third.points_earned.toLocaleString()} PTS</span>
              </div>
            </div>
          ) : (
            <div className="hidden md:block order-3 md:order-3" />
          )}
        </div>
      )}

      {/* 2-Column Responsive Split: Full Scout Table / Directory (8 cols) + Regional Activity & Perks (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scout Roster or Traveler Directory */}
        <div className="lg:col-span-8 space-y-4">
          {/* Surface Mode Toggle (Ranked Scouts Roster vs Find a Traveler Directory) */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] w-full sm:w-auto self-start">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              aria-pressed={activeTab === 'roster'}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-white text-[var(--color-brand-brown)] shadow-xs border border-[var(--color-border-default)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand-brown)]'
              }`}
            >
              <Medal className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
              <span>Ranked Scouts ({rawList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('travelers')}
              aria-pressed={activeTab === 'travelers'}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'travelers'
                  ? 'bg-white text-[var(--color-brand-brown)] shadow-xs border border-[var(--color-border-default)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand-brown)]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span>Find a Traveler</span>
            </button>
          </div>

          {activeTab === 'roster' ? (
            <>
              {/* Sticky Search & Filter Toolbar for Ranked Roster */}
              <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Medal className="w-4 h-4 text-[var(--color-brand-accent)]" />
                    <div>
                      <h2 className="text-xs sm:text-sm font-black text-[var(--color-brand-brown)] uppercase tracking-wider">
                        Scout Roster ({timeframe === 'weekly' ? 'This Week' : 'All-Time'})
                      </h2>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">
                        Ranked top {rawList.length} participants
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Town Filter Dropdown */}
                    <select
                      value={selectedTown}
                      onChange={(e) => setSelectedTown(e.target.value)}
                      aria-label="Filter by municipality"
                      className="bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-[var(--color-brand-brown)] text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[var(--color-brand-primary)]"
                    >
                      <option value="all">All Towns</option>
                      {availableTowns.filter((t) => t !== 'all').map((town) => (
                        <option key={town} value={town}>
                          {town}
                        </option>
                      ))}
                    </select>

                    {/* Roster Filter Input */}
                    <div className="relative min-w-[160px] sm:min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Filter ranked scouts..."
                        aria-label="Filter ranked scouts by name, handle, town, or badge"
                        value={rosterFilterQuery}
                        onChange={(e) => setRosterFilterQuery(e.target.value)}
                        className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#2C221E] focus:outline-none focus:border-[#2D6A4F]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading Indicator */}
              {loading ? (
                <div className="bg-white p-12 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-2 shadow-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand-primary)]" />
                  <span>Loading verified rankings from JuanDerQuest network...</span>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)] shadow-xs space-y-2">
                  <p>
                    {rosterFilterQuery || selectedTown !== 'all'
                      ? 'No scouts match your filter in the ranked roster.'
                      : 'No verified scout activity recorded for this timeframe yet. Be the first to complete a quest!'}
                  </p>
                  {rosterFilterQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setTravelerQuery(rosterFilterQuery);
                        setActiveTab('travelers');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-xs font-bold text-[var(--color-brand-primary)] hover:bg-white transition cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Search directory for &ldquo;{rosterFilterQuery}&rdquo;</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedList.map((scout) => {
                    const pct = Math.min(100, Math.round((scout.points_earned / maxPoints) * 100));

                    return (
                      <div
                        key={`${scout.rank}-${scout.user_id}`}
                        className={`p-3 sm:p-4 rounded-xl border flex items-center justify-between gap-3 transition ${
                          scout.is_self
                            ? 'bg-emerald-50/60 border-emerald-400 shadow-2xs'
                            : scout.rank === 1
                            ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                            : scout.rank === 2
                            ? 'bg-slate-50/80 border-slate-300'
                            : scout.rank === 3
                            ? 'bg-orange-50/60 border-orange-300'
                            : 'bg-white border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/40 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          {/* Rank Badge */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                              scout.rank === 1
                                ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-xs'
                                : scout.rank === 2
                                ? 'bg-slate-200 border-slate-300 text-slate-800'
                                : scout.rank === 3
                                ? 'bg-orange-200 border-orange-300 text-orange-900'
                                : 'bg-[var(--color-bg-subtle)] border-[var(--color-border-default)] text-[var(--color-text-secondary)]'
                            }`}
                          >
                            {scout.rank === 1 ? '🥇' : scout.rank === 2 ? '🥈' : scout.rank === 3 ? '🥉' : `#${scout.rank}`}
                          </div>

                          {/* Scout Identity & Town */}
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
                              <UserBadgesRow
                                userIdOrName={scout.user_id || scout.handle || scout.display_name}
                                isCurrentUser={scout.is_self}
                                size="xs"
                                enablePreviewModal={false}
                              />
                              {scout.is_self && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  You
                                </span>
                              )}
                              <span className="text-[10px] text-[var(--color-text-muted)] font-medium hidden sm:inline">
                                • Base: {scout.primary_town}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="text-[10px] text-[var(--color-text-muted)] block truncate">
                                {scout.badge}
                              </span>
                              <div className="hidden md:block w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-[var(--color-brand-primary)] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Score Metrics */}
                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-black text-[var(--color-brand-primary)] block">
                            {scout.points_earned.toLocaleString()} pts
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">
                            {scout.approved_quests} Eco-Quests • {scout.scout_reputation} rep
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Adaptive Infinite Scroll Sentinel */}
                  <div
                    ref={sentinelRef}
                    className="py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border-subtle)] pt-4"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <span>
                        Showing {Math.min(visibleCount, filteredList.length)} of {filteredList.length} ranked scouts (Top {rawList.length} slice)
                      </span>
                      {hasMoreToLoad ? (
                        <span className="inline-flex items-center gap-1 text-[var(--color-brand-primary)] font-bold">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading more scouts as you scroll...</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">• All ranked scouts displayed</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-subtle)] text-[var(--color-brand-brown)] font-bold transition active:scale-95 cursor-pointer shadow-2xs text-[11px]"
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>Top</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Find a Traveler Directory Mode */
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2D6A4F]" />
                    <div>
                      <h2 className="text-xs sm:text-sm font-black text-[var(--color-brand-brown)] uppercase tracking-wider">
                        Find a Traveler
                      </h2>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">
                        Search the public traveler directory across Pangasinan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search public travelers by name or @handle..."
                    aria-label="Search public travelers by name or handle"
                    value={travelerQuery}
                    onChange={(e) => setTravelerQuery(e.target.value)}
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#2C221E] focus:outline-none focus:border-[#2D6A4F] focus:bg-white transition"
                  />
                  {travelerQuery && (
                    <button
                      type="button"
                      onClick={() => setTravelerQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      aria-label="Clear traveler search query"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Results State */}
              {loadingTravelers ? (
                <div className="bg-white p-12 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-2 shadow-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand-primary)]" />
                  <span>Searching public traveler directory...</span>
                </div>
              ) : travelerError ? (
                <div
                  role="alert"
                  className="rounded-2xl border-2 border-red-500/30 bg-red-50 p-4 text-xs font-medium text-red-900 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{travelerError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void executeTravelerSearch(travelerQuery)}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : !isProcessableQuery(normalizeSearchQuery(travelerQuery)) ? (
                <div className="bg-white p-10 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)] shadow-xs space-y-1.5">
                  <Users className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-bold text-[var(--color-brand-brown)]">Search Public Travelers</p>
                  <p className="text-[11px]">Type at least 2 characters to search by display name or @handle.</p>
                </div>
              ) : travelers.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)] shadow-xs space-y-1">
                  <p className="font-bold text-[var(--color-brand-brown)]">No public travelers found</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    No directory matches found for &ldquo;{searchedQuery}&rdquo;. Note: Private accounts and unverified test accounts are not visible in the public directory.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="px-1 text-[11px] font-bold text-[var(--color-text-muted)]">
                    Found {travelers.length} public {travelers.length === 1 ? 'traveler' : 'travelers'}
                  </div>
                  {travelers.map((traveler) => {
                    // Truthfully cross-reference with top_scouts rankings without fabricating ranks
                    const matchedRank = rawList.find(
                      (s) => s.user_id === traveler.id || (traveler.handle && s.handle?.toLowerCase() === traveler.handle.toLowerCase())
                    );

                    const initials = traveler.display_name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0].toUpperCase())
                      .join('');

                    return (
                      <div
                        key={traveler.id}
                        className="p-3.5 sm:p-4 rounded-xl border border-[var(--color-border-default)] bg-white hover:border-[var(--color-brand-primary)]/40 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-xs font-black text-white shadow-2xs overflow-hidden">
                            {traveler.avatar_url ? (
                              <img src={traveler.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{initials || 'TR'}</span>
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={travelerProfileHref(traveler.handle || traveler.id)}
                                className="text-xs sm:text-sm font-bold text-[var(--color-brand-brown)] hover:text-[var(--color-brand-primary)] transition truncate"
                              >
                                {traveler.display_name}
                              </Link>
                              {traveler.handle && (
                                <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                                  @{traveler.handle}
                                </span>
                              )}
                              <UserBadgesRow
                                userIdOrName={traveler.id || traveler.handle || traveler.display_name}
                                size="xs"
                                enablePreviewModal={false}
                              />
                            </div>

                            {traveler.bio && (
                              <p className="text-[11px] text-[#514532] line-clamp-1 mt-0.5">
                                {traveler.bio}
                              </p>
                            )}

                            {traveler.status_text && (
                              <p className="text-[10px] text-[#837560] italic mt-0.5">
                                &ldquo;{traveler.status_text}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Rank Status in current timeframe */}
                        <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F2EFE9]">
                          {matchedRank ? (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-xs border border-amber-300">
                                Rank #{matchedRank.rank}
                              </span>
                              <span className="text-[10px] text-[var(--color-text-muted)] font-bold">
                                {matchedRank.points_earned.toLocaleString()} pts ({timeframe === 'weekly' ? 'Weekly' : 'All-Time'})
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                                No rank in this timeframe
                              </span>
                              <span className="text-[10px] text-[var(--color-text-muted)] hidden sm:block">
                                Public directory scout
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Municipal Activity Ranking & Milestones (Sticky on Desktop) */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* Municipal Honor Roll */}
          <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--color-brand-primary)]" />
                <h3 className="text-xs font-black text-[var(--color-brand-brown)] uppercase tracking-wider">
                  Pilot Municipalities
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 px-2 py-0.5 rounded-full">
                {leaderboardData?.top_municipalities ? `${leaderboardData.top_municipalities.length} LGUs Active` : 'Pilot Network'}
              </span>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Pangasinan communities ranked by verified explorer trail check-ins and active scouts:
            </p>

            <div className="space-y-2 pt-1">
              {(!leaderboardData?.top_municipalities || leaderboardData.top_municipalities.length === 0) ? (
                <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] text-center text-xs text-[var(--color-text-muted)]">
                  No municipal quest check-ins logged yet for this timeframe.
                </div>
              ) : (
                leaderboardData.top_municipalities.map((muni, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/40 transition flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{getMunicipalityIcon(muni.name)}</span>
                      <div className="min-w-0">
                        <span className="font-bold text-[var(--color-text-primary)] block truncate">{muni.name}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] block">
                          {muni.active_scouts} active scouts
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-black text-[var(--color-brand-primary)] block">
                        {muni.quests_completed.toLocaleString()} visits
                      </span>
                      <span className="text-[9px] text-[var(--color-text-muted)] font-medium">
                        {muni.share_percentage}% territory
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scout Rank Tiers Card with tooltip-style explanation of point sources */}
          <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--color-brand-accent)]" />
                <h4 className="text-xs font-black text-[var(--color-brand-brown)] uppercase tracking-wider">
                  Scout Ranks &amp; Milestones
                </h4>
              </div>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              Points are earned from verified Eco-Quest completions, community photo submissions, and starter explorer onboarding.
            </p>
            <ul className="space-y-2 text-xs text-[var(--color-text-secondary)]">
              <li className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                <span className="font-bold">👑 Grandmaster Scout</span>
                <span className="text-[10px] text-[var(--color-brand-primary)] font-black">10,000+ pts</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                <span className="font-bold">⚔️ Vanguard Scout</span>
                <span className="text-[10px] text-[var(--color-brand-primary)] font-black">5,000+ pts</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                <span className="font-bold">🧭 Trailblazer</span>
                <span className="text-[10px] text-[var(--color-brand-primary)] font-black">2,000+ pts</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                <span className="font-bold">🌱 Active Scout</span>
                <span className="text-[10px] text-[var(--color-brand-primary)] font-black">500+ pts</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Navigation>
      <Suspense
        fallback={
          <div className="bg-white p-12 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-2 shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand-primary)]" />
            <span>Loading leaderboard...</span>
          </div>
        }
      >
        <LeaderboardContent />
      </Suspense>
    </Navigation>
  );
}
