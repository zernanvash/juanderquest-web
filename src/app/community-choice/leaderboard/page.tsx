import Link from 'next/link';
import {
  Award,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Info,
  MapPin,
  ShieldCheck,
  Trophy,
  Sparkles,
  ArrowRight,
  Vote,
  CheckCircle2
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { communityChoicePreview } from '@/lib/community';

export default function CommunityChoiceLeaderboardPage() {
  const totalVotes = communityChoicePreview.entries.reduce((sum, entry) => sum + entry.votes, 0);
  const topThree = communityChoicePreview.entries.slice(0, 3);
  const remainingEntries = communityChoicePreview.entries.slice(3);

  return (
    <Navigation>
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Hero Header with Community Emblem */}
        <header className="relative overflow-hidden rounded-3xl border border-[#E3DFD5] bg-gradient-to-br from-white via-[#FAF9F5] to-amber-50/60 p-6 sm:p-8 shadow-xs">
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-amber-200/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#7D5800] border border-amber-300/80 shadow-2xs">
                  <Trophy className="h-3.5 w-3.5 text-[#FFB703] fill-[#FFB703]" />
                  Community Choice Awards 2026
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-bold text-[#2D6A4F] border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" />
                  Equal-Weight Balloting
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black text-[#2C221E] tracking-tight">
                Destination Leaderboard
              </h1>
              <p className="text-xs sm:text-sm leading-relaxed text-[#514532]">
                Recognizing Pangasinan’s most cherished cultural landmarks, serene beaches, and eco-tourism marvels. Every verified traveler casts one equal-weight ballot per monthly cycle.
              </p>
            </div>

            {/* Countdown / Round Badge */}
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-2xs backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-[#7D5800]">
                <CalendarDays className="h-5 w-5 text-[#B45309]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#837560]">Current Round</p>
                <p className="text-xs font-black text-[#582F0E]">{communityChoicePreview.round}</p>
                <p className="text-[10px] font-semibold text-[#2D6A4F]">{communityChoicePreview.closesLabel}</p>
              </div>
            </div>
          </div>

          {/* Decorative Corner Background Icon */}
          <Trophy className="pointer-events-none absolute -bottom-10 -right-10 h-52 w-52 text-[#FFB703]/10 rotate-12 select-none" />
        </header>

        {/* 3 Metric Stat Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#E3DFD5] bg-white p-4 shadow-xs flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-[#2D6A4F]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#837560]">Voting Cycle</p>
              <p className="text-sm font-black text-[#582F0E]">{communityChoicePreview.round}</p>
              <p className="text-[10px] text-[#2D6A4F] font-semibold">Active Voting Window</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E3DFD5] bg-white p-4 shadow-xs flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100/70 text-[#7D5800]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#837560]">Total Valid Ballots</p>
              <p className="text-sm sm:text-base font-black text-[#582F0E]">{totalVotes.toLocaleString()} Votes</p>
              <p className="text-[10px] text-[#837560] font-medium">Sample verified counts</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E3DFD5] bg-white p-4 shadow-xs flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100/70 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#837560]">Democratic Consensus</p>
              <p className="text-sm font-black text-[#582F0E]">1 Traveler = 1 Vote</p>
              <p className="text-[10px] text-blue-700 font-semibold">Zero Financial Pay-to-Win</p>
            </div>
          </div>
        </section>

        {/* Top 3 Podium Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-base font-black text-[#582F0E] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FFB703]" />
              <span>Current Podium Standings</span>
            </h2>
            <span className="text-[11px] text-[#837560] font-medium">Top Community Picks</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topThree.map((entry) => {
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              const medalEmoji = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
              const rankColor = isFirst
                ? 'border-amber-300/90 bg-gradient-to-b from-amber-50/80 to-white'
                : isSecond
                ? 'border-stone-300 bg-gradient-to-b from-stone-50/90 to-white'
                : 'border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white';

              return (
                <Link
                  key={entry.slug}
                  href={`/spots/${entry.slug}`}
                  className={`group relative overflow-hidden rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all duration-300 ease-out flex flex-col justify-between ${rankColor}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl drop-shadow-2xs">{medalEmoji}</span>
                      <span className="rounded-full bg-white/90 border border-[#E3DFD5] px-2.5 py-0.5 text-[10px] font-black text-[#582F0E]">
                        Rank #{entry.rank}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif text-base font-black text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                        {entry.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#2D6A4F]">
                        <MapPin className="h-3 w-3" />
                        {entry.municipality} · Pangasinan
                      </p>
                    </div>

                    {/* Progress Share Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#837560] font-medium">Community Share</span>
                        <span className="font-black text-[#2D6A4F]">{entry.share}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#2D6A4F] to-[#52B788] transition-all duration-500"
                          style={{ width: `${entry.share}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#837560] font-semibold text-right">
                        {entry.votes.toLocaleString()} verified ballots
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F2EFE9] flex items-center justify-between text-xs font-bold text-[#2D6A4F] group-hover:underline">
                    <span>Explore Place</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Full Standings List */}
        <section className="overflow-hidden rounded-2xl border border-[#E3DFD5] bg-white shadow-xs">
          <div className="border-b border-[#E8E5DE] px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base font-black text-[#582F0E]">Full Leaderboard Standings</h2>
              <p className="text-[11px] text-[#837560]">Ranked by total verified community ballots</p>
            </div>
            <span className="rounded-md bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-[#582F0E]">
              {communityChoicePreview.entries.length} Destinations
            </span>
          </div>

          <div className="divide-y divide-[#E8E5DE]">
            {communityChoicePreview.entries.map((entry) => (
              <Link
                key={entry.slug}
                href={`/spots/${entry.slug}`}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 transition hover:bg-[#FAF9F5] sm:px-6 group"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black shadow-2xs ${
                    entry.rank === 1
                      ? 'bg-amber-100 text-[#7D5800] border border-amber-300'
                      : entry.rank === 2
                      ? 'bg-stone-200 text-stone-700 border border-stone-300'
                      : entry.rank === 3
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-stone-100 text-[#6B5E4C]'
                  }`}
                >
                  {entry.rank <= 3 ? (entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉') : `#${entry.rank}`}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-xs sm:text-sm font-black text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                      {entry.name}
                    </h3>
                  </div>
                  <p className="flex items-center gap-1 text-[10px] text-[#837560]">
                    <MapPin className="h-3 w-3 text-[#2D6A4F]" />
                    {entry.municipality} · Pangasinan
                  </p>
                  
                  {/* Share Progress Indicator */}
                  <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-[#2D6A4F]"
                      style={{ width: `${entry.share}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-xs sm:text-sm font-black text-[#582F0E]">{entry.votes.toLocaleString()}</p>
                    <p className="text-[10px] text-[#2D6A4F] font-bold">{entry.share}% share</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#837560] group-hover:text-[#2D6A4F] group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Democratic Integrity Principles */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#1B4332]">
              <ShieldCheck className="h-4 w-4 text-[#2D6A4F]" />
              <span>Sybil-Resistant Identity</span>
            </div>
            <p className="text-[11px] text-[#514532] leading-relaxed">
              Only verified traveler passports with authenticated presence can cast ballots, preventing automated bots and vote manipulation.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#7D5800]">
              <Vote className="h-4 w-4 text-[#B45309]" />
              <span>Zero Pay-to-Win Staking</span>
            </div>
            <p className="text-[11px] text-[#514532] leading-relaxed">
              Ballots are 100% free and equal. Big wallets cannot buy extra vote power; every Pangasinan resident and visitor holds equal voice.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-blue-900">
              <Trophy className="h-4 w-4 text-blue-600" />
              <span>LGU Tourism Spotlight</span>
            </div>
            <p className="text-[11px] text-[#514532] leading-relaxed">
              Winning destinations receive verified community spotlight badges, featured municipal campaigns, and eco-preservation micro-grants.
            </p>
          </div>
        </section>

        {/* Prototype Transparency Disclosure */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5 text-xs leading-relaxed text-blue-950 flex items-start gap-3 shadow-2xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
          <div className="space-y-1">
            <p className="font-bold text-blue-900">
              Prototype Demonstration Phase
            </p>
            <p className="text-[11px] text-blue-900/90 leading-relaxed">
              The figures displayed here are calibrated sample records for UI layout and usability verification. Real-world on-chain settlement and cryptographic ballot tallies will activate in Phase 2 on Base L2 smart contracts.
            </p>
          </div>
        </div>

      </div>
    </Navigation>
  );
}
