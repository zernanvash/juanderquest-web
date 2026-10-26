'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Crown,
  Flame,
  Gift,
  Loader2,
  Shield,
  ShoppingBag,
  Sparkles,
  Stamp,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import {
  DailyStamps,
  StampHistory,
  StampHistoryItem,
  fetchDailyStamps,
  fetchStampHistory,
  notifyStampsUpdated,
  spendStreakShield,
  stampSourceLabel,
} from '@/lib/stamps-api';

function HistoryRow({ item }: { item: StampHistoryItem }) {
  const positive = item.delta > 0;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F2EFE9] last:border-b-0">
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs font-bold text-[#2C221E] truncate">{stampSourceLabel(item.source, item.reason)}</p>
        <p className="text-[9px] text-[#837560]">{item.manila_date}</p>
      </div>
      <span className={`shrink-0 text-xs font-black px-2 py-0.5 rounded-lg ${
        positive ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
      }`}>
        {positive ? '+' : ''}{item.delta}
      </span>
    </div>
  );
}

export function StampsClient() {
  const { user } = useAuth();
  const [daily, setDaily] = useState<DailyStamps | null>(null);
  const [history, setHistory] = useState<StampHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setDaily(null);
      setHistory(null);
      setLoading(false);
      return;
    }
    try {
      const [dailyData, historyData] = await Promise.all([fetchDailyStamps(), fetchStampHistory(null, 25)]);
      setDaily(dailyData);
      setHistory(historyData);
      setError('');
    } catch {
      setError('Passport stamps are unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const loadMore = async () => {
    if (!history?.next_cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchStampHistory(history.next_cursor, 25);
      setHistory({ ...next, items: [...history.items, ...next.items] });
    } catch {
      setError('Could not load more history.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleBuyShield = async () => {
    if (!daily || buying) return;
    if (daily.streak.shields_held >= daily.streak.shields_max) return;
    if (daily.balance < daily.streak.shield_price) return;
    setBuying(true);
    setNotice('');
    setError('');
    try {
      await spendStreakShield();
      await load();
      notifyStampsUpdated();
      setNotice('Streak shield added. It will protect your streak on the first missed day.');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not buy a streak shield.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <Navigation>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#2C221E] flex items-center gap-2">
              <Stamp className="w-6 h-6 text-amber-700" /> Passport Stamps
            </h1>
            <p className="text-[11px] sm:text-xs text-[#837560]">
              Earned through daily play. Non-transferable and never convertible to points.
            </p>
          </div>
          <Link href="/dashboard" className="text-[11px] font-bold text-[#2D6A4F] hover:underline inline-flex items-center gap-1">
            Back to Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!user && (
          <section className="bg-white rounded-3xl border border-[#E3DFD5] p-6 shadow-xs text-center space-y-3">
            <Stamp className="w-10 h-10 mx-auto text-amber-500" />
            <p className="text-sm font-bold text-[#2C221E]">Sign in to see your stamp balance and history.</p>
            <Link href="/login" className="inline-flex px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition">
              Sign in
            </Link>
          </section>
        )}

        {user && loading && !daily && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-busy="true">
            {[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl bg-white border border-[#E3DFD5] animate-pulse" />)}
          </div>
        )}

        {user && daily && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 rounded-2xl p-4 shadow-xs">
                <p className="text-[10px] font-black uppercase tracking-wide">Balance</p>
                <p className="text-2xl font-black flex items-center gap-1.5"><Stamp className="w-5 h-5" />{daily.balance.toLocaleString()}</p>
                <p className="text-[9px] font-bold opacity-80">stamps</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E3DFD5] p-4 shadow-xs">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#837560]">Streak</p>
                <p className="text-2xl font-black text-[#2C221E] flex items-center gap-1.5"><Flame className="w-5 h-5 text-orange-600" />{daily.streak.current}</p>
                <p className="text-[9px] text-[#837560]">Best {daily.streak.best} days</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E3DFD5] p-4 shadow-xs">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#837560]">Shields</p>
                <p className="text-2xl font-black text-[#2C221E] flex items-center gap-1.5"><Shield className="w-5 h-5 text-sky-700" />{daily.streak.shields_held}<span className="text-sm text-[#837560]">/{daily.streak.shields_max}</span></p>
                <p className="text-[9px] text-[#837560]">Protect your streak</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#E3DFD5] p-4 shadow-xs">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#837560]">This week</p>
                <p className="text-2xl font-black text-[#2C221E]">{daily.week.used}<span className="text-sm text-[#837560]">/{daily.week.cap}</span></p>
                <p className="text-[9px] text-[#837560]">{daily.week.remaining} stamps left</p>
              </div>
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-black text-[#2C221E] flex items-center gap-2"><Gift className="w-4 h-4 text-amber-700" /> What stamps buy</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-[#E3DFD5] p-4 shadow-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-sky-700" />
                    <h3 className="text-xs font-black text-[#2C221E]">Streak shield</h3>
                  </div>
                  <p className="text-[10px] text-[#837560] flex-1">
                    Consumed automatically on the first missed day. It keeps the streak number only and never grants missed stamps.
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-amber-900">{daily.streak.shield_price} stamps</span>
                    <button
                      type="button"
                      onClick={handleBuyShield}
                      disabled={buying || daily.streak.shields_held >= daily.streak.shields_max || daily.balance < daily.streak.shield_price}
                      className="px-3 py-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] disabled:bg-stone-200 disabled:text-stone-500 text-white text-[10px] font-bold transition inline-flex items-center gap-1 min-h-[32px]"
                    >
                      {buying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingBag className="w-3 h-3" />}
                      {daily.streak.shields_held >= daily.streak.shields_max
                        ? 'Max held'
                        : daily.balance < daily.streak.shield_price
                        ? 'Need more'
                        : 'Buy shield'}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E3DFD5] p-4 shadow-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-600" />
                    <h3 className="text-xs font-black text-[#2C221E]">Juander Pass</h3>
                  </div>
                  <p className="text-[10px] text-[#837560] flex-1">
                    Seven days of VIP perks, including an extra weekly shield. Arrives with Phase 2.
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-amber-900">600 stamps</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">Coming soon</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E3DFD5] p-4 shadow-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-700" />
                    <h3 className="text-xs font-black text-[#2C221E]">Cosmetics</h3>
                  </div>
                  <p className="text-[10px] text-[#837560] flex-1">
                    Shop items flagged with a stamp price will appear here. Stamps stay separate from points and tJDQ.
                  </p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 self-start">Later phase</span>
                </div>
              </div>
            </section>

            {notice && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
                <Check className="w-3.5 h-3.5" /> {notice}
              </p>
            )}
            {error && <p role="alert" className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

            <section className="bg-white rounded-3xl border border-[#E3DFD5] shadow-xs overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-[#F2EFE9] flex items-center justify-between">
                <h2 className="text-sm font-black text-[#2C221E]">Stamp history</h2>
                <span className="text-[10px] text-[#837560]">Newest first</span>
              </div>
              <div className="px-4 sm:px-5">
                {history?.items.length ? (
                  history.items.map((item) => <HistoryRow key={item.id} item={item} />)
                ) : (
                  <p className="py-8 text-center text-xs text-[#837560]">No stamps yet. Claim today&apos;s reward on the dashboard.</p>
                )}
              </div>
              {history?.next_cursor && (
                <div className="px-4 sm:px-5 pb-4">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full py-2 rounded-xl border border-[#E3DFD5] text-[11px] font-bold text-[#2D6A4F] hover:bg-[#FAF9F5] transition inline-flex items-center justify-center gap-1.5 min-h-[38px]"
                  >
                    {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Load more
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Navigation>
  );
}
