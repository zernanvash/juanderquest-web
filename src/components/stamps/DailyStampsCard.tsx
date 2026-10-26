'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  Flame,
  Gift,
  Heart,
  HelpCircle,
  MapPin,
  Shield,
  Sparkles,
  Stamp,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { gsap, motionDuration } from '@/lib/animations/gsap';
import {
  DailyStamps,
  STAMPS_UPDATED_EVENT,
  claimDailyStamps,
  fetchDailyStamps,
  formatStampCountdown,
  missionIconKind,
} from '@/lib/stamps-api';

function MissionIcon({ kind }: { kind: string }) {
  const className = 'w-4 h-4';
  switch (missionIconKind(kind)) {
    case 'qotd': return <HelpCircle className={className} />;
    case 'cheer': return <Heart className={className} />;
    case 'story': return <BookOpen className={className} />;
    case 'checkin': return <MapPin className={className} />;
    default: return <Zap className={className} />;
  }
}

export function DailyStampsCard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [data, setData] = useState<DailyStamps | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const cardRef = useRef<HTMLElement | null>(null);
  const burstRef = useRef<HTMLSpanElement | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const next = await fetchDailyStamps();
      setData(next);
      setError('');
    } catch {
      setError('Daily stamps are unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener(STAMPS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(STAMPS_UPDATED_EVENT, handler);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = data?.next_reset_at ? formatStampCountdown(data.next_reset_at, now) : '--:--';

  const animateClaim = () => {
    const duration = motionDuration(0.7);
    if (duration === 0) return;
    if (burstRef.current) {
      gsap.fromTo(burstRef.current,
        { scale: 0.35, opacity: 0, rotate: -14 },
        { scale: 1, opacity: 1, rotate: 0, duration, ease: 'back.out(1.8)' });
    }
    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { boxShadow: '0 0 0 0 rgba(255,183,3,0)' },
        { boxShadow: '0 0 0 7px rgba(255,183,3,0.22)', duration: duration * 0.7, yoyo: true, repeat: 1, clearProps: 'boxShadow' });
    }
  };

  const handleClaim = async () => {
    if (!data || data.claim.claimed_today || claiming) return;
    setClaiming(true);
    setError('');
    try {
      await claimDailyStamps();
      await load();
      animateClaim();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not claim today\'s stamps.');
    } finally {
      setClaiming(false);
    }
  };

  if (!user) {
    return (
      <section className="bg-white rounded-3xl border border-[#E3DFD5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
            <Stamp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#2C221E]">Passport Stamps &amp; Daily Rewards</h2>
            <p className="text-[11px] text-[#837560]">Sign in to claim daily stamps, finish missions and keep your streak alive.</p>
          </div>
        </div>
        <Link href="/login" className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition text-center">
          Sign in
        </Link>
      </section>
    );
  }

  if (loading && !data) {
    return (
      <section className="bg-white rounded-3xl border border-[#E3DFD5] p-5 sm:p-6 shadow-xs space-y-3" aria-busy="true">
        <div className="h-5 w-40 rounded-lg bg-stone-100 animate-pulse" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-14 rounded-xl bg-stone-50 animate-pulse" />)}
        </div>
        <div className="h-10 rounded-xl bg-stone-50 animate-pulse" />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="bg-white rounded-3xl border border-[#E3DFD5] p-5 sm:p-6 shadow-xs text-xs text-[#837560]">
        {error || 'Daily stamps are unavailable right now.'}
      </section>
    );
  }

  const claimed = data.claim.claimed_today;
  const currentDay = data.claim.cycle_day;
  const shieldsRemaining = Math.max(0, data.streak.shields_max - data.streak.shields_held);

  return (
    <section
      ref={(node) => { cardRef.current = node; }}
      aria-labelledby="daily-stamps-title"
      className="bg-white rounded-3xl border border-[#E3DFD5] p-4 sm:p-6 shadow-xs space-y-5 overflow-hidden"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
            <Stamp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 id="daily-stamps-title" className="text-sm sm:text-base font-black text-[#2C221E]">
              Daily Passport Stamps
            </h2>
            <p className="text-[10px] sm:text-[11px] text-[#837560] flex items-center gap-1.5 flex-wrap">
              <CalendarDays className="w-3 h-3" /> {data.date}
              <span className="text-[#C4BAA8]">•</span>
              <Clock className="w-3 h-3" /> Resets in {countdown}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-extrabold">
            <Stamp className="w-3.5 h-3.5" />
            {data.balance.toLocaleString()}
            <span className="sr-only">stamps</span>
          </span>
          <Link href="/stamps" className="text-[11px] font-bold text-[#2D6A4F] hover:underline inline-flex items-center gap-1">
            History <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-7 gap-1.5" role="list" aria-label="Seven-day stamp calendar">
            {data.claim.calendar.map((day) => {
              const isCurrent = day.day === currentDay && !claimed;
              return (
                <div
                  key={day.day}
                  role="listitem"
                  className={`rounded-xl border px-1 py-2 text-center transition ${
                    day.claimed
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : isCurrent
                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-200'
                      : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#837560]'
                  }`}
                >
                  <div className="text-[9px] font-black uppercase tracking-wide">D{day.day}</div>
                  <div className="h-5 flex items-center justify-center">
                    {day.claimed ? <Check className="w-3.5 h-3.5" aria-label="claimed" /> : <span className="text-[10px] font-bold">+{day.stamps}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={handleClaim}
              disabled={claimed || claiming}
              className={`w-full min-h-[44px] rounded-xl px-4 py-2.5 text-xs font-black transition flex items-center justify-center gap-2 ${
                claimed
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                  : 'bg-[#2D6A4F] hover:bg-[#1B4332] text-white shadow-sm'
              }`}
            >
              {claimed ? (
                <><Check className="w-4 h-4" /> Claimed today · Day {currentDay}</>
              ) : claiming ? (
                <>Claiming…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Claim +{data.claim.nominal_stamps} stamps</>
              )}
            </button>
            <span
              ref={burstRef}
              aria-hidden="true"
              className="pointer-events-none absolute -top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black shadow opacity-0"
            >
              +{data.claim.awarded || data.claim.nominal_stamps} stamps
            </span>
          </div>

          {claimed && data.claim.capped && (
            <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              Weekly cap reached — today&apos;s claim recorded but no stamps were added.
            </p>
          )}

          <div className="rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#582F0E]">
              <span>Weekly cap</span>
              <span>{data.week.used.toLocaleString()} / {data.week.cap.toLocaleString()}</span>
            </div>
            <div
              className="h-1.5 rounded-full bg-white border border-[#E3DFD5] overflow-hidden"
              role="progressbar"
              aria-label="Weekly stamp cap used"
              aria-valuemin={0}
              aria-valuemax={data.week.cap}
              aria-valuenow={data.week.used}
            >
              <div
                className="h-full rounded-full bg-amber-500 transition-[width] duration-500"
                style={{ width: `${data.week.cap > 0 ? Math.min(100, (data.week.used / data.week.cap) * 100) : 0}%` }}
              />
            </div>
            <p className="text-[9px] text-[#837560]">Stamps are earned only, non-transferable, and never convert to points.</p>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-[#837560]">Today&apos;s missions</h3>
              <span className="text-[10px] text-[#837560]">{data.missions?.filter((mission) => mission.completed).length ?? 0}/3 done</span>
            </div>
            <div className="space-y-2">
              {(data.missions ?? []).map((mission) => (
                <div
                  key={mission.id}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                    mission.completed ? 'bg-emerald-50/60 border-emerald-200' : 'bg-[#FAF9F5] border-[#E3DFD5]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    mission.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-white border border-[#E3DFD5] text-[#2D6A4F]'
                  }`}>
                    {mission.completed ? <Check className="w-4 h-4" /> : <MissionIcon kind={mission.kind} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] sm:text-xs font-bold text-[#2C221E] leading-snug line-clamp-2">{mission.title}</p>
                    <p className="text-[9px] text-[#837560]">
                      {mission.on_site ? 'On-site · server verified' : 'At home · server verified'}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                    mission.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>+{mission.stamps}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] p-3 space-y-2">
              <div className="flex items-center gap-2 text-[#582F0E]">
                <Gift className="w-4 h-4 text-amber-700" />
                <span className="text-[11px] font-black">Weekly chest</span>
                {data.chest.earned && <Check className="w-3.5 h-3.5 text-emerald-700 ml-auto" />}
              </div>
              <div className="h-1.5 rounded-full bg-white border border-[#E3DFD5] overflow-hidden" role="progressbar"
                aria-label="Weekly chest progress" aria-valuemin={0} aria-valuemax={data.chest.required}
                aria-valuenow={Math.min(data.chest.completed_missions, data.chest.required)}>
                <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, (data.chest.completed_missions / data.chest.required) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-[#837560]">
                {data.chest.earned
                  ? 'Chest earned this week'
                  : `${data.chest.completed_missions}/${data.chest.required} missions · +${data.chest.stamps} stamps`}
              </p>
            </div>

            <div className="rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] p-3 space-y-2">
              <div className="flex items-center gap-2 text-[#582F0E]">
                <Flame className="w-4 h-4 text-orange-600" />
                <span className="text-[11px] font-black">{data.streak.current}-day streak</span>
                <span className="ml-auto text-[9px] text-[#837560]">Best {data.streak.best}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.from({ length: data.streak.shields_max }).map((_, index) => (
                  <Shield
                    key={index}
                    className={`w-4 h-4 ${index < data.streak.shields_held ? 'text-sky-700' : 'text-stone-300'}`}
                    aria-label={index < data.streak.shields_held ? 'Shield held' : 'Empty shield slot'}
                  />
                ))}
                <span className="text-[9px] text-[#837560]">
                  {data.streak.shields_held}/{data.streak.shields_max} shields
                </span>
              </div>
              <Link href="/stamps" className="text-[10px] font-bold text-[#2D6A4F] hover:underline inline-flex items-center gap-1">
                {shieldsRemaining > 0 ? `Get a shield · ${data.streak.shield_price} stamps` : 'View shields'} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{error}</p>}
    </section>
  );
}
