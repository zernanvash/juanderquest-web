'use client';

// Gamified JuanChoice booth pieces: the live election arena with a ticking countdown,
// rank medals, vote-share bars and the vote-power meter.
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Crown, Flame, Share2, Sparkles, Swords, Timer, Users, Zap } from 'lucide-react';
import { serverAlignedNow, type JuanChoiceCampaign } from '@/lib/juanchoice';

/** Ticks once a second from a trusted server timestamp; null until mounted (no hydration mismatch). */
export function useLiveServerNow(serverTime: string | null | undefined, receivedAtMono: number | null | undefined) {
  const [mono, setMono] = useState<number | null>(null);
  useEffect(() => {
    const first = window.setTimeout(() => setMono(performance.now()), 0);
    const timer = window.setInterval(() => setMono(performance.now()), 1000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);
  if (mono === null || !serverTime || receivedAtMono == null) return null;
  return serverAlignedNow(serverTime, receivedAtMono, mono);
}

export function CountdownBlocks({ msLeft, urgent = false }: { msLeft: number; urgent?: boolean }) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const parts: [number, string][] = [[Math.floor(total / 86400), 'Days'], [Math.floor((total % 86400) / 3600), 'Hrs'],
    [Math.floor((total % 3600) / 60), 'Min'], [total % 60, 'Sec']];
  return (
    <div className="flex items-stretch gap-1 sm:gap-2" role="timer"
      aria-label={`${parts[0][0]} days ${parts[1][0]} hours ${parts[2][0]} minutes left`}>
      {parts.map(([value, label], index) => (
        <div key={label} className="flex items-stretch gap-1 sm:gap-2">
          {index > 0 && <span className={`self-center text-xl font-black sm:text-2xl ${urgent ? 'text-red-200' : 'text-amber-200/70'}`} aria-hidden="true">:</span>}
          <div className={`min-w-[52px] rounded-xl px-1.5 py-1.5 text-center shadow-inner sm:min-w-[68px] sm:px-2 ${urgent ? 'bg-red-950/50 ring-1 ring-red-300/40' : 'bg-black/25 ring-1 ring-white/10'}`}>
            <span className={`block text-2xl font-black tabular-nums sm:text-4xl ${urgent ? 'text-red-100' : 'text-white'}`}>{String(value).padStart(2, '0')}</span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-white/60">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const STATS = [
  { key: 'votes', label: 'Votes', Icon: Zap },
  { key: 'voters', label: 'Voters', Icon: Users },
  { key: 'contenders', label: 'Contenders', Icon: Swords },
] as const;

/** The live election banner: round badge, ticking countdown, week progress and turnout. */
export function RoundArena({ campaign, status, nowMs, totalVotes, totalVoters, contenders, shareHref, children }: {
  campaign: JuanChoiceCampaign; status: string | null; nowMs: number | null; totalVotes: number | null; totalVoters: number | null;
  contenders: number; shareHref: string; children?: ReactNode;
}) {
  const opens = Date.parse(campaign.opens_at);
  const closes = Date.parse(campaign.closes_at);
  const live = status === 'voting';
  const msLeft = nowMs === null ? null : (status === 'scheduled' ? opens : closes) - nowMs;
  const urgent = live && msLeft !== null && msLeft <= 86_400_000;
  const progress = nowMs === null ? 0 : Math.min(100, Math.max(0, ((nowMs - opens) / (closes - opens)) * 100));
  const week = /-W(\d{2})/.exec(campaign.slug)?.[1];
  const special = campaign.round_tier === 'special_festival';
  const stats = { votes: totalVotes, voters: totalVoters, contenders };
  const theme = urgent ? 'from-[#7F1D1D] via-[#9A3412] to-[#582F0E]'
    : special ? 'from-[#4C1D95] via-[#7C3AED] to-[#B45309]' : 'from-[#1B4332] via-[#2D6A4F] to-[#7D5800]';
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme} p-5 text-white shadow-lg sm:p-7`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-amber-300/20 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-emerald-300/10 blur-2xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {live && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 motion-safe:animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>
            Live</span>}
          {week && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ring-1 ring-white/20">Week {Number(week)}</span>}
          {special && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F6C344] to-[#E09F1F] px-2.5 py-1 text-[11px] font-black uppercase text-[#4A2E00] shadow">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> {campaign.festival_name ? `${campaign.festival_name} special` : 'Special round'}</span>}
          {urgent && <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black uppercase text-red-800 motion-safe:animate-pulse">
            <Flame className="h-3 w-3" aria-hidden="true" /> Final hours</span>}
        </div>
        <Link href={shareHref} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25 hover:bg-white/25">
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Share round</Link>
      </div>
      <p className="relative mt-4 text-xs font-black uppercase tracking-[0.2em] text-amber-200">{campaign.region} election · {status}</p>
      <h2 id="round-heading" className="relative mt-1 text-3xl font-black leading-tight sm:text-4xl">{campaign.theme}</h2>
      {children && <div className="relative">{children}</div>}
      <div className="relative mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/75">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />{status === 'scheduled' ? 'Voting opens in' : live ? 'Polls close in' : 'Polls closed'}</p>
          {msLeft !== null && (live || status === 'scheduled')
            ? <CountdownBlocks msLeft={msLeft} urgent={urgent} />
            : <p className="text-2xl font-black">{live || status === 'scheduled' ? '··:··:··' : 'Counting finished'}</p>}
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {STATS.map(({ key, label, Icon }) => (
            <div key={key} className="min-w-[72px] rounded-xl bg-white/10 px-2 py-2 ring-1 ring-white/15">
              <dt className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/70"><Icon className="h-3 w-3" aria-hidden="true" />{label}</dt>
              <dd className="text-xl font-black tabular-nums">{stats[key] === null ? '🔒' : stats[key]}</dd>
            </div>
          ))}
        </dl>
      </div>
      {live && <div className="relative mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-black/25" aria-hidden="true">
          <div className={`h-full rounded-full transition-[width] duration-1000 ${urgent ? 'bg-gradient-to-r from-amber-300 to-red-400' : 'bg-gradient-to-r from-emerald-300 to-amber-300'}`} style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-[11px] font-semibold text-white/65">{Math.floor(progress)}% of the week gone · the winner reigns all next week</p>
      </div>}
    </div>
  );
}

const MEDALS = [
  'bg-gradient-to-br from-[#FDE68A] to-[#D97706] text-[#4A2E00] ring-amber-200',
  'bg-gradient-to-br from-[#F1F5F9] to-[#94A3B8] text-[#1E293B] ring-slate-200',
  'bg-gradient-to-br from-[#FED7AA] to-[#B45309] text-[#431407] ring-orange-200',
];

export function RankMedal({ rank, hidden = false }: { rank: number; hidden?: boolean }) {
  if (hidden) {
    return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-black text-violet-800 ring-2 ring-violet-200" aria-hidden="true">?</span>;
  }
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black shadow ring-2 ${MEDALS[rank - 1] ?? 'bg-[#F3F0E8] text-[#6F6352] ring-[#E3DFD5]'}`} aria-hidden="true">
      {rank === 1 ? <Crown className="h-5 w-5" /> : rank}
    </span>
  );
}

/** Vote share for one contender; a shimmering mystery bar while the tally is blind. */
export function ShareBar({ votes, total, leading = false, compact = false }: { votes: number | null; total: number; leading?: boolean; compact?: boolean }) {
  if (votes === null) {
    return <div className={`${compact ? 'mt-2 h-2' : 'mt-3 h-2.5'} overflow-hidden rounded-full bg-violet-100`} aria-hidden="true">
      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-200 via-violet-400 to-violet-200 motion-safe:animate-pulse" /></div>;
  }
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
  const fill = leading ? 'bg-gradient-to-r from-amber-300 to-amber-500' : 'bg-gradient-to-r from-emerald-300 to-[#2D6A4F]';
  if (compact) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F3F0E8]" role="progressbar" aria-label="Vote share" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full transition-[width] duration-700 ${fill}`} style={{ width: `${Math.max(pct, votes > 0 ? 4 : 0)}%` }} />
        </div>
        <span className={`w-9 text-right text-xs font-black tabular-nums ${leading ? 'text-amber-700' : 'text-[#2C221E]'}`}>{pct}%</span>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-xs font-bold text-[#514532]">
        <span>Vote share</span><span className={`text-sm font-black tabular-nums ${leading ? 'text-amber-700' : 'text-[#2C221E]'}`}>{pct}%</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#F3F0E8]" role="progressbar" aria-label="Vote share" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-[width] duration-700 ${leading ? 'bg-gradient-to-r from-amber-300 to-amber-500' : 'bg-gradient-to-r from-emerald-300 to-[#2D6A4F]'}`}
          style={{ width: `${Math.max(pct, votes > 0 ? 4 : 0)}%` }} />
      </div>
    </div>
  );
}

export function VotePower({ weight }: { weight: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Vote power ${weight} of 5`}>
      {[1, 2, 3, 4, 5].map(step => <Zap key={step} aria-hidden="true" className={`h-3.5 w-3.5 ${step <= weight ? 'fill-amber-400 text-amber-500' : 'text-[#D6D0C4]'}`} />)}
    </span>
  );
}
