'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Award,
  Medal,
  Sparkles,
  MapPin,
  ShieldCheck,
  Zap,
  Users,
  ChevronRight,
  TrendingUp,
  Search,
  Crown,
  ArrowUp,
  Loader2,
  Flame,
  Filter,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';

interface ScoutRankItem {
  rank: number;
  username: string;
  points: number;
  quests: number;
  badge: string;
  town: string;
  avatarSeed: string;
}

const RAW_SCOUTS_WEEKLY: ScoutRankItem[] = [
  { rank: 1, username: 'CoastalExplorer', points: 3420, quests: 24, badge: '👑 Grandmaster Scout', town: 'Bolinao', avatarSeed: 'coastal' },
  { rank: 2, username: 'BolinaoWave', points: 2890, quests: 19, badge: '⚔️ Vanguard Scout', town: 'Bolinao', avatarSeed: 'wave' },
  { rank: 3, username: 'HeritageSeeker', points: 2150, quests: 15, badge: '🧭 Trailblazer', town: 'Manaoag', avatarSeed: 'heritage' },
  { rank: 4, username: 'SaltHarvester_01', points: 1840, quests: 12, badge: '🧭 Trailblazer', town: 'Dasol', avatarSeed: 'salt' },
  { rank: 5, username: 'HundredIslandsFan', points: 1620, quests: 11, badge: '🌱 Active Scout', town: 'Alaminos City', avatarSeed: 'islands' },
  { rank: 6, username: 'LingayenRider', points: 1390, quests: 9, badge: '🌱 Active Scout', town: 'Lingayen', avatarSeed: 'rider' },
  { rank: 7, username: 'DagupanFoodie', points: 1150, quests: 8, badge: '🌱 Active Scout', town: 'Dagupan City', avatarSeed: 'foodie' },
  { rank: 8, username: 'PangasinanNomad', points: 1040, quests: 7, badge: '🌱 Active Scout', town: 'San Fabian', avatarSeed: 'nomad' },
  { rank: 9, username: 'BaniCavesSeeker', points: 980, quests: 7, badge: '🌱 Active Scout', town: 'Bani', avatarSeed: 'caves' },
  { rank: 10, username: 'AndaWhiteSand', points: 920, quests: 6, badge: '🌱 Active Scout', town: 'Anda', avatarSeed: 'sand' },
  { rank: 11, username: 'SualPortWatcher', points: 870, quests: 6, badge: '🌱 Active Scout', town: 'Sual', avatarSeed: 'port' },
  { rank: 12, username: 'LabradorTrekker', points: 810, quests: 5, badge: '🌱 Active Scout', town: 'Labrador', avatarSeed: 'trekker' },
  { rank: 13, username: 'MabangloAdventurer', points: 760, quests: 5, badge: '🌱 Active Scout', town: 'Infanta', avatarSeed: 'adventurer' },
  { rank: 14, username: 'BinalonanFlyer', points: 710, quests: 5, badge: '🌱 Active Scout', town: 'Binalonan', avatarSeed: 'flyer' },
  { rank: 15, username: 'TayugFlowerFan', points: 680, quests: 4, badge: '🌱 Active Scout', town: 'Tayug', avatarSeed: 'flower' },
  { rank: 16, username: 'RosalesWayfarer', points: 640, quests: 4, badge: '🌱 Active Scout', town: 'Rosales', avatarSeed: 'wayfarer' },
  { rank: 17, username: 'SanCarlosMango', points: 610, quests: 4, badge: '🌱 Active Scout', town: 'San Carlos City', avatarSeed: 'mango' },
  { rank: 18, username: 'CalasiaoPutoKing', points: 580, quests: 4, badge: '🌱 Active Scout', town: 'Calasiao', avatarSeed: 'puto' },
  { rank: 19, username: 'BugallonHiker', points: 530, quests: 3, badge: '🌱 Active Scout', town: 'Bugallon', avatarSeed: 'hiker' },
  { rank: 20, username: 'AguilarStream', points: 490, quests: 3, badge: '🌱 Active Scout', town: 'Aguilar', avatarSeed: 'stream' },
  { rank: 21, username: 'MangataremPine', points: 450, quests: 3, badge: '🌱 Active Scout', town: 'Mangatarem', avatarSeed: 'pine' },
  { rank: 22, username: 'UrbiztondoWalker', points: 420, quests: 3, badge: '🌱 Active Scout', town: 'Urbiztondo', avatarSeed: 'walker' },
  { rank: 23, username: 'AlcalaLover', points: 390, quests: 2, badge: '🌱 Active Scout', town: 'Alcala', avatarSeed: 'alcala' },
  { rank: 24, username: 'BayambangGiant', points: 360, quests: 2, badge: '🌱 Active Scout', town: 'Bayambang', avatarSeed: 'giant' },
  { rank: 25, username: 'MalasiquiRoots', points: 330, quests: 2, badge: '🌱 Active Scout', town: 'Malasiqui', avatarSeed: 'roots' },
];

const RAW_SCOUTS_ALL_TIME: ScoutRankItem[] = [
  { rank: 1, username: 'CoastalExplorer', points: 18450, quests: 112, badge: '👑 Grandmaster Scout', town: 'Bolinao', avatarSeed: 'coastal' },
  { rank: 2, username: 'HundredIslandsFan', points: 14200, quests: 94, badge: '👑 Grandmaster Scout', town: 'Alaminos City', avatarSeed: 'islands' },
  { rank: 3, username: 'BolinaoWave', points: 12890, quests: 82, badge: '⚔️ Vanguard Scout', town: 'Bolinao', avatarSeed: 'wave' },
  { rank: 4, username: 'HeritageSeeker', points: 9650, quests: 61, badge: '⚔️ Vanguard Scout', town: 'Manaoag', avatarSeed: 'heritage' },
  { rank: 5, username: 'SaltHarvester_01', points: 7840, quests: 49, badge: '🧭 Trailblazer', town: 'Dasol', avatarSeed: 'salt' },
  { rank: 6, username: 'LingayenRider', points: 6720, quests: 42, badge: '🧭 Trailblazer', town: 'Lingayen', avatarSeed: 'rider' },
  { rank: 7, username: 'DagupanFoodie', points: 5930, quests: 38, badge: '🧭 Trailblazer', town: 'Dagupan City', avatarSeed: 'foodie' },
  { rank: 8, username: 'SanFabianCoast', points: 5120, quests: 33, badge: '🧭 Trailblazer', town: 'San Fabian', avatarSeed: 'coast' },
  { rank: 9, username: 'BaniCaveMaster', points: 4680, quests: 30, badge: '🧭 Trailblazer', town: 'Bani', avatarSeed: 'caves' },
  { rank: 10, username: 'AndaIslandVoyager', points: 4210, quests: 27, badge: '🧭 Trailblazer', town: 'Anda', avatarSeed: 'voyager' },
  { rank: 11, username: 'PangasinanPioneer', points: 3890, quests: 25, badge: '🧭 Trailblazer', town: 'Alaminos City', avatarSeed: 'pioneer' },
  { rank: 12, username: 'SualFisherman', points: 3540, quests: 23, badge: '🌱 Active Scout', town: 'Sual', avatarSeed: 'fish' },
  { rank: 13, username: 'LabradorCamper', points: 3220, quests: 21, badge: '🌱 Active Scout', town: 'Labrador', avatarSeed: 'camper' },
  { rank: 14, username: 'TayugMazeRunner', points: 2980, quests: 19, badge: '🌱 Active Scout', town: 'Tayug', avatarSeed: 'maze' },
  { rank: 15, username: 'BinalonanAviation', points: 2740, quests: 18, badge: '🌱 Active Scout', town: 'Binalonan', avatarSeed: 'aviation' },
  { rank: 16, username: 'RosalesTraveler', points: 2490, quests: 16, badge: '🌱 Active Scout', town: 'Rosales', avatarSeed: 'rosales' },
  { rank: 17, username: 'SanCarlosMangoKing', points: 2210, quests: 14, badge: '🌱 Active Scout', town: 'San Carlos City', avatarSeed: 'mango' },
  { rank: 18, username: 'CalasiaoDelight', points: 1980, quests: 13, badge: '🌱 Active Scout', town: 'Calasiao', avatarSeed: 'delight' },
  { rank: 19, username: 'BugallonRidge', points: 1750, quests: 11, badge: '🌱 Active Scout', town: 'Bugallon', avatarSeed: 'ridge' },
  { rank: 20, username: 'BayambangStatue', points: 1540, quests: 10, badge: '🌱 Active Scout', town: 'Bayambang', avatarSeed: 'statue' },
];

const TOP_MUNICIPALITIES = [
  { name: 'Bolinao', questsLogged: 1420, activeScouts: 380, icon: '🏖️', share: 28 },
  { name: 'Alaminos City (Hundred Islands)', questsLogged: 1190, activeScouts: 340, icon: '🏝️', share: 24 },
  { name: 'Dagupan City', questsLogged: 980, activeScouts: 270, icon: '🐟', share: 19 },
  { name: 'Lingayen', questsLogged: 740, activeScouts: 210, icon: '🏛️', share: 15 },
  { name: 'Dasol', questsLogged: 520, activeScouts: 160, icon: '🧂', share: 10 },
  { name: 'Manaoag', questsLogged: 410, activeScouts: 130, icon: '⛪', share: 8 },
  { name: 'San Fabian', questsLogged: 360, activeScouts: 110, icon: '🌊', share: 7 },
  { name: 'Bani', questsLogged: 290, activeScouts: 90, icon: '🦇', share: 6 },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<'weekly' | 'allTime'>('weekly');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTown, setSelectedTown] = useState<string>('all');

  // Progressive batch rendering / Infinite scroll adaptation
  const [visibleCount, setVisibleCount] = useState<number>(15);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const rawList = timeframe === 'weekly' ? RAW_SCOUTS_WEEKLY : RAW_SCOUTS_ALL_TIME;

  // Extract unique towns for filtering
  const availableTowns = useMemo(() => {
    const set = new Set<string>();
    rawList.forEach((s) => set.add(s.town));
    return ['all', ...Array.from(set)];
  }, [rawList]);

  // Filter scouts by search query & town
  const filteredList = useMemo(() => {
    return rawList.filter((s) => {
      const matchTown = selectedTown === 'all' || s.town === selectedTown;
      const matchSearch =
        searchQuery === '' ||
        s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.town.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.badge.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTown && matchSearch;
    });
  }, [rawList, selectedTown, searchQuery]);

  // Reset pagination on filter or timeframe change
  useEffect(() => {
    setVisibleCount(15);
  }, [timeframe, selectedTown, searchQuery]);

  // Adaptive Infinite Scroll Sentinel Observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

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

  // Top 3 Podium Scouts (Rank 1, 2, 3)
  const topPodium = useMemo(() => {
    const first = rawList.find((s) => s.rank === 1);
    const second = rawList.find((s) => s.rank === 2);
    const third = rawList.find((s) => s.rank === 3);
    return { first, second, third };
  }, [rawList]);

  const maxPoints = rawList[0]?.points || 1;
  const paginatedList = filteredList.slice(0, visibleCount);
  const hasMoreToLoad = visibleCount < filteredList.length;

  const presentationBuild = process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE === 'true';

  return (
    <Navigation>
      <div className="w-full space-y-6 sm:space-y-8 pb-12">
        {presentationBuild && (
          <div role="status" className="rounded-2xl border-2 border-amber-500 bg-amber-100 p-4 text-sm font-bold text-amber-950">
            Presentation demo mode — Explorer leaderboards and civic rankings reflect prototype simulation. Demo JuanChoice voting activities do not contribute to official rankings.
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
                #—
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] block">
                  {user ? (user.displayName || user.email) : 'Guest Explorer'}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {user ? `${user.points || 0} PTS • Complete quests and verify visits to climb ranks` : 'Connect your wallet or account to record verified proof points'}
                </span>
              </div>
            </div>

            <Link
              href="/quests"
              className="py-2.5 px-4 rounded-xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
              <span>Explore Quests to Climb</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 🏆 Top 3 Podium Section (Maximizes Widescreen Space with Olympic Style) */}
        {topPodium.first && topPodium.second && topPodium.third && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-2">
            {/* 🥈 Rank 2 - Silver (Left) */}
            <div className="order-2 md:order-1 bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition relative group">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
                <span>🥈 2nd Place</span>
              </div>

              <div className="text-center space-y-2.5 pt-2">
                <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex items-center justify-center text-xl font-black text-slate-700 shadow-inner">
                  {topPodium.second.username.charAt(0)}
                </div>
                <div>
                  <Link
                    href={`/profile/${topPodium.second.username}`}
                    className="text-base font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                  >
                    @{topPodium.second.username}
                  </Link>
                  <p className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{topPodium.second.town}</span>
                  </p>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-700 text-[10px] font-bold border border-slate-200">
                  {topPodium.second.badge}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-[var(--color-text-muted)]">{topPodium.second.quests} quests</span>
                <span className="text-slate-800 font-black text-sm">{topPodium.second.points.toLocaleString()} PTS</span>
              </div>
            </div>

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
                  <Link
                    href={`/profile/${topPodium.first.username}`}
                    className="text-lg sm:text-xl font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                  >
                    @{topPodium.first.username}
                  </Link>
                  <p className="text-xs text-[var(--color-brand-primary)] font-bold flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{topPodium.first.town}</span>
                  </p>
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-black border border-amber-300/80">
                  {topPodium.first.badge}
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-amber-200 flex items-center justify-between text-xs font-bold">
                <span className="text-[var(--color-text-muted)]">{topPodium.first.quests} completed trails</span>
                <span className="text-[var(--color-brand-primary)] font-black text-base">{topPodium.first.points.toLocaleString()} PTS</span>
              </div>
            </div>

            {/* 🥉 Rank 3 - Bronze (Right) */}
            <div className="order-3 md:order-3 bg-white rounded-2xl border-2 border-orange-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition relative group">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-orange-800 text-[11px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
                <span>🥉 3rd Place</span>
              </div>

              <div className="text-center space-y-2.5 pt-2">
                <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-orange-100 to-orange-200 border-2 border-orange-300 flex items-center justify-center text-xl font-black text-orange-800 shadow-inner">
                  {topPodium.third.username.charAt(0)}
                </div>
                <div>
                  <Link
                    href={`/profile/${topPodium.third.username}`}
                    className="text-base font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                  >
                    @{topPodium.third.username}
                  </Link>
                  <p className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-orange-600" />
                    <span>{topPodium.third.town}</span>
                  </p>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-800 text-[10px] font-bold border border-orange-200">
                  {topPodium.third.badge}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between text-xs font-bold">
                <span className="text-[var(--color-text-muted)]">{topPodium.third.quests} quests</span>
                <span className="text-orange-900 font-black text-sm">{topPodium.third.points.toLocaleString()} PTS</span>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Split: Full Scout Table (8 cols) + Regional Activity & Perks (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Full Roster & Search Filter with Infinite Scroll */}
          <div className="lg:col-span-8 space-y-4">
            {/* Sticky Search & Filter Toolbar */}
            <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Medal className="w-4 h-4 text-[var(--color-brand-accent)]" />
                  <h2 className="text-xs sm:text-sm font-black text-[var(--color-brand-brown)] uppercase tracking-wider">
                    Scout Roster ({timeframe === 'weekly' ? 'This Week' : 'All-Time'})
                  </h2>
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

                  {/* Search Input */}
                  <div className="relative min-w-[160px] sm:min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search scout or town..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#2C221E] focus:outline-none focus:border-[#2D6A4F]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ranked Scout Rows */}
            {filteredList.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[var(--color-border-default)] text-center text-xs text-[var(--color-text-muted)] shadow-xs">
                No scouts match your search query or town filter.
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedList.map((scout) => {
                  const pct = Math.min(100, Math.round((scout.points / maxPoints) * 100));

                  return (
                    <div
                      key={scout.rank}
                      className={`p-3 sm:p-4 rounded-xl border flex items-center justify-between gap-3 transition ${
                        scout.rank === 1
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/profile/${scout.username}`}
                              className="text-xs sm:text-sm font-bold text-[var(--color-brand-brown)] hover:text-[var(--color-brand-primary)] transition truncate"
                            >
                              @{scout.username}
                            </Link>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-medium hidden sm:inline">
                              • Base: {scout.town}
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
                          {scout.points.toLocaleString()} PTS
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] block font-medium">
                          {scout.quests} quests
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
                      Showing {Math.min(visibleCount, filteredList.length)} of {filteredList.length} ranked scouts
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
                  8 LGUs Active
                </span>
              </div>

              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Pangasinan communities ranked by verified explorer trail check-ins and active scouts:
              </p>

              <div className="space-y-2 pt-1">
                {TOP_MUNICIPALITIES.map((muni, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/40 transition flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{muni.icon}</span>
                      <div className="min-w-0">
                        <span className="font-bold text-[var(--color-text-primary)] block truncate">{muni.name}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] block">
                          {muni.activeScouts} active scouts
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-black text-[var(--color-brand-primary)] block">
                        {muni.questsLogged.toLocaleString()} visits
                      </span>
                      <span className="text-[9px] text-[var(--color-text-muted)] font-medium">
                        {muni.share}% territory
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scout Rank Tiers Card */}
            <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--color-brand-accent)]" />
                <h4 className="text-xs font-black text-[var(--color-brand-brown)] uppercase tracking-wider">
                  Scout Ranks &amp; Milestones
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-[var(--color-text-secondary)]">
                <li className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                  <span className="font-bold">👑 Grandmaster Scout</span>
                  <span className="text-[10px] text-[var(--color-brand-primary)] font-black">10,000+ PTS</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                  <span className="font-bold">⚔️ Vanguard Scout</span>
                  <span className="text-[10px] text-[var(--color-brand-primary)] font-black">5,000+ PTS</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                  <span className="font-bold">🧭 Trailblazer</span>
                  <span className="text-[10px] text-[var(--color-brand-primary)] font-black">2,000+ PTS</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                  <span className="font-bold">🌱 Active Scout</span>
                  <span className="text-[10px] text-[var(--color-brand-primary)] font-black">500+ PTS</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Navigation>
  );
}
