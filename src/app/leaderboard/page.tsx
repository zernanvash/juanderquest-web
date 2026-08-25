'use client';

import React, { useState } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<'weekly' | 'allTime'>('weekly');

  const topScoutsWeekly = [
    { rank: 1, username: 'PangasinanExplorer', points: 3420, quests: 24, badge: '👑 Grandmaster Scout', town: 'Bolinao' },
    { rank: 2, username: 'BolinaoWave', points: 2890, quests: 19, badge: '⚔️ Vanguard Scout', town: 'Bolinao' },
    { rank: 3, username: 'HeritageSeeker', points: 2150, quests: 15, badge: '🧭 Trailblazer', town: 'Manaoag' },
    { rank: 4, username: 'SaltHarvester_01', points: 1840, quests: 12, badge: '🧭 Trailblazer', town: 'Dasol' },
    { rank: 5, username: 'HundredIslandsFan', points: 1620, quests: 11, badge: '🌱 Active Scout', town: 'Alaminos City' },
    { rank: 6, username: 'LingayenRider', points: 1390, quests: 9, badge: '🌱 Active Scout', town: 'Lingayen' },
    { rank: 7, username: 'DagupanFoodie', points: 1150, quests: 8, badge: '🌱 Active Scout', town: 'Dagupan City' },
  ];

  const topScoutsAllTime = [
    { rank: 1, username: 'PangasinanExplorer', points: 18450, quests: 112, badge: '👑 Grandmaster Scout', town: 'Bolinao' },
    { rank: 2, username: 'HundredIslandsFan', points: 14200, quests: 94, badge: '👑 Grandmaster Scout', town: 'Alaminos City' },
    { rank: 3, username: 'BolinaoWave', points: 12890, quests: 82, badge: '⚔️ Vanguard Scout', town: 'Bolinao' },
    { rank: 4, username: 'HeritageSeeker', points: 9650, quests: 61, badge: '⚔️ Vanguard Scout', town: 'Manaoag' },
    { rank: 5, username: 'SaltHarvester_01', points: 7840, quests: 49, badge: '🧭 Trailblazer', town: 'Dasol' },
  ];

  const activeList = timeframe === 'weekly' ? topScoutsWeekly : topScoutsAllTime;

  const topMunicipalities = [
    { name: 'Bolinao', questsLogged: 1420, activeScouts: 380, icon: '🏖️' },
    { name: 'Alaminos City (Hundred Islands)', questsLogged: 1190, activeScouts: 340, icon: '🏝️' },
    { name: 'Dagupan City', questsLogged: 980, activeScouts: 270, icon: '🐟' },
    { name: 'Lingayen', questsLogged: 740, activeScouts: 210, icon: '🏛️' },
    { name: 'Dasol', questsLogged: 520, activeScouts: 160, icon: '🧂' },
  ];

  return (
    <Navigation>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Header Hero */}
        <div className="bg-white rounded-xl border border-[#E3DFD5] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-[#B45309] text-xs font-semibold">
                <Trophy className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>Scout Hall of Fame</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2C221E]">
                Pangasinan Scout Leaderboard
              </h1>
              <p className="text-xs sm:text-sm text-[#514532] leading-relaxed">
                Celebrating the top travelers, heritage documenters, and community explorers verifying destinations across Pangasinan.
              </p>
            </div>

            {/* Timeframe Toggle */}
            <div className="inline-flex p-1 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] self-start sm:self-center">
              <button
                onClick={() => setTimeframe('weekly')}
                className={`px-4 py-2 rounded-md text-xs font-bold transition cursor-pointer active:scale-98 ${
                  timeframe === 'weekly'
                    ? 'bg-[#2D6A4F] text-white shadow-xs'
                    : 'text-[#582F0E] hover:bg-white'
                }`}
              >
                Weekly Sprint
              </button>
              <button
                onClick={() => setTimeframe('allTime')}
                className={`px-4 py-2 rounded-md text-xs font-bold transition cursor-pointer active:scale-98 ${
                  timeframe === 'allTime'
                    ? 'bg-[#2D6A4F] text-white shadow-xs'
                    : 'text-[#582F0E] hover:bg-white'
                }`}
              >
                All-Time Legends
              </button>
            </div>
          </div>

          {/* User's Current Rank Banner */}
          <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2D6A4F] text-[#FFB703] flex items-center justify-center font-bold text-sm">
                #{user ? '12' : '—'}
              </div>
              <div>
                <span className="text-xs font-bold text-[#2C221E] block">
                  {user ? user.displayName : 'Guest Explorer'}
                </span>
                <span className="text-[10px] text-gray-500">
                  {user ? `${user.points || 0} PTS • Active Explorer` : 'Connect wallet or login to track your global ranking'}
                </span>
              </div>
            </div>

            <Link
              href="/quests"
              className="py-2 px-3.5 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-98"
            >
              <span>Complete Quests to Climb</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2-Column Split: Scout Table on Left (7 cols), Municipal Rankings on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Top Scouts Ranking Table */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E3DFD5] p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-3">
              <div className="flex items-center gap-2">
                <Medal className="w-4 h-4 text-[#FFB703]" />
                <h2 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                  Top Ranked JuanDerer Scouts ({timeframe === 'weekly' ? 'This Week' : 'All-Time'})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-gray-400">Live Sync</span>
            </div>

            <div className="space-y-2">
              {activeList.map((scout) => (
                <div
                  key={scout.rank}
                  className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 transition ${
                    scout.rank === 1
                      ? 'bg-amber-50/50 border-amber-200'
                      : scout.rank === 2
                      ? 'bg-slate-50/70 border-slate-200'
                      : scout.rank === 3
                      ? 'bg-orange-50/50 border-orange-200'
                      : 'bg-[#FAF9F5] border-[#E3DFD5]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 bg-white border border-[#E3DFD5]">
                      {scout.rank === 1 ? '🥇' : scout.rank === 2 ? '🥈' : scout.rank === 3 ? '🥉' : scout.rank}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#2C221E] truncate block">
                        @{scout.username}
                      </span>
                      <span className="text-[10px] text-gray-500 block truncate">
                        {scout.badge} • Base: {scout.town}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#2D6A4F] block">
                      {scout.points.toLocaleString()} PTS
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {scout.quests} quests
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Municipal Activity Ranking */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white rounded-xl border border-[#E3DFD5] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#2D6A4F]" />
                  <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                    Most Active Municipalities
                  </h3>
                </div>
              </div>

              <p className="text-xs text-[#514532] leading-relaxed">
                Towns with the highest concentration of verified tourist check-ins and eco-actions:
              </p>

              <div className="space-y-2.5 pt-1">
                {topMunicipalities.map((muni, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{muni.icon}</span>
                      <span className="font-bold text-[#2C221E]">{muni.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#2D6A4F]">
                      {muni.questsLogged} visits
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Navigation>
  );
}
