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
        <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-accent)]/15 border border-[var(--color-brand-accent)]/30 text-[var(--color-brand-accent-dark)] text-xs font-semibold">
                <Trophy className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
                <span>Scout Hall of Fame</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-brand-brown)] font-serif">
                Pangasinan Scout Leaderboard
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Celebrating the top travelers, heritage documenters, and community explorers verifying destinations across Pangasinan.
              </p>
            </div>

            {/* Timeframe Toggle */}
            <div className="inline-flex p-1 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] self-start sm:self-center">
              <button
                onClick={() => setTimeframe('weekly')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
                  timeframe === 'weekly'
                    ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                    : 'text-[var(--color-brand-brown)] hover:bg-white'
                }`}
              >
                Weekly Sprint
              </button>
              <button
                onClick={() => setTimeframe('allTime')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
                  timeframe === 'allTime'
                    ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                    : 'text-[var(--color-brand-brown)] hover:bg-white'
                }`}
              >
                All-Time Legends
              </button>
            </div>
          </div>

          {/* User's Current Rank Banner */}
          <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-brand-primary)] text-[var(--color-brand-accent)] flex items-center justify-center font-bold text-sm">
                #{user ? '12' : '—'}
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--color-text-primary)] block">
                  {user ? user.displayName : 'Guest Explorer'}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {user ? `${user.points || 0} PTS • Active Explorer` : 'Connect wallet or login to track your global ranking'}
                </span>
              </div>
            </div>

            <Link
              href="/quests"
              className="py-2 px-3.5 rounded-xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-98 shadow-xs"
            >
              <span>Complete Quests to Climb</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2-Column Split: Scout Table on Left (7 cols), Municipal Rankings on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Top Scouts Ranking Table */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Medal className="w-4 h-4 text-[var(--color-brand-accent)]" />
                <h2 className="text-xs font-bold text-[var(--color-brand-brown)] uppercase tracking-wider">
                  Top Ranked JuanDerer Scouts ({timeframe === 'weekly' ? 'This Week' : 'All-Time'})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Live Sync</span>
            </div>

            <div className="space-y-2">
              {activeList.map((scout) => (
                <div
                  key={scout.rank}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                    scout.rank === 1
                      ? 'bg-amber-50/70 border-amber-200 shadow-2xs'
                      : scout.rank === 2
                      ? 'bg-slate-50/70 border-slate-200'
                      : scout.rank === 3
                      ? 'bg-orange-50/50 border-orange-200'
                      : 'bg-[var(--color-bg-subtle)] border-[var(--color-border-default)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 bg-white border border-[var(--color-border-default)] shadow-2xs">
                      {scout.rank === 1 ? '🥇' : scout.rank === 2 ? '🥈' : scout.rank === 3 ? '🥉' : scout.rank}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] truncate block">
                        @{scout.username}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] block truncate">
                        {scout.badge} • Base: {scout.town}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[var(--color-brand-primary)] block">
                      {scout.points.toLocaleString()} PTS
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] block">
                      {scout.quests} quests
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Municipal Activity Ranking */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--color-brand-primary)]" />
                  <h3 className="text-xs font-bold text-[var(--color-brand-brown)] uppercase tracking-wider">
                    Most Active Municipalities
                  </h3>
                </div>
              </div>

              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Towns with the highest concentration of verified tourist check-ins and eco-actions:
              </p>

              <div className="space-y-2.5 pt-1">
                {topMunicipalities.map((muni, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{muni.icon}</span>
                      <span className="font-bold text-[var(--color-text-primary)]">{muni.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[var(--color-brand-primary)]">
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
