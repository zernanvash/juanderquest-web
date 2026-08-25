'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { api, normalizeVoucher, normalizeRedemption, uuid, VoucherModel, RedemptionModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { Navigation } from '@/components/Navigation';
import { VoucherCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  ShoppingBag,
  Award,
  Coins,
  CheckCircle2,
  Ticket,
  Sparkles,
  Gift,
  AlertCircle,
  Loader2,
  Tag,
  Copy,
  ExternalLink,
} from 'lucide-react';

export default function ShopPage() {
  const { user, refreshProfile } = useAuth();
  const { isReady } = useRequireAuth();
  const [vouchers, setVouchers] = useState<VoucherModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // In-Page Active Redemption State (No Modals)
  const [activeUnwrapVoucherId, setActiveUnwrapVoucherId] = useState<string | null>(null);
  const [redemption, setRedemption] = useState<RedemptionModel | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchVouchers = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data: rawVouchers } = await fetchWithCache(
        'shop_vouchers',
        async () => {
          const res = await api.get('/vouchers');
          return (res.data.data as Parameters<typeof normalizeVoucher>[0][]).map(normalizeVoucher);
        },
        { ttlMs: 60_000, forceRefresh }
      );
      setVouchers(rawVouchers);
    } catch {
      setFetchError('Could not reach reward servers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleRedeem = async (voucher: VoucherModel) => {
    setRedeeming(true);
    setRedeemError(null);

    try {
      const res = await api.post(`/vouchers/${voucher.id}/redeem`, {
        idempotency_key: uuid(),
      });

      if (res.data?.success) {
        setRedemption(normalizeRedemption(res.data.data));
        refreshProfile();
      } else {
        setRedeemError(res.data?.error?.message || 'Redemption failed');
      }
    } catch (e: any) {
      setRedeemError(e.response?.data?.error?.message || 'Network error during voucher redemption.');
    }
    setRedeeming(false);
  };

  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const insufficient = (v: VoucherModel) => !user || user.points < v.costPoints;

  if (!isReady) return null;

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Merchant Shop">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header Banner */}
          <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#E3DFD5] shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFB703]" />
                  <span className="text-xs font-black tracking-wider text-[#7D5800] uppercase">
                    Pangasinan MSME Rewards Hub
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F]">
                    Local Merchant Loot
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black font-serif text-[#582F0E]">
                  Merchant Voucher Shop
                </h1>
                <p className="text-xs md:text-sm text-[#514532] max-w-xl leading-relaxed">
                  Redeem your earned JuanDerQuest Points for discount vouchers at verified local partner restaurants, souvenir craft shops, and homestays across Pangasinan.
                </p>
              </div>

              {/* Balance Widget */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-[#FFB703]/20 text-[#7D5800] flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Available Points</div>
                  <div className="text-lg font-black text-[#582F0E]">
                    {user?.points ?? 0} PTS
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Unwrapped Voucher Showcase (In-Page Banner) */}
          {redemption && (
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-900 to-[#1B4332] text-white shadow-xl space-y-4 animate-fade-in relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-300 flex items-center justify-center shrink-0">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                      Voucher Successfully Unwrapped!
                    </span>
                    <h2 className="text-lg font-black text-white">{redemption.voucherTitle || 'Merchant Voucher'}</h2>
                  </div>
                </div>

                <button
                  onClick={() => setRedemption(null)}
                  className="text-xs font-bold text-emerald-200 hover:text-white px-3 py-1.5 rounded-xl bg-white/10 self-start sm:self-auto cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-gray-300 uppercase font-bold block mb-1">
                    Present Code to Cashier / Merchant:
                  </span>
                  <span className="text-xl sm:text-2xl font-mono font-black text-amber-300 tracking-widest select-all">
                    {redemption.code}
                  </span>
                </div>

                <button
                  onClick={() => copyVoucherCode(redemption.code)}
                  className="px-5 py-2.5 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-md"
                >
                  {copiedCode ? <CheckCircle2 className="w-4 h-4 text-[#582F0E]" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Vouchers Grid Layout (Full 12 Columns / Multi-Column Cards) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black font-serif text-[#582F0E]">
                Available Local Vouchers ({vouchers.length})
              </h2>
              <span className="text-xs font-bold text-gray-500">Instant Redemption</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <VoucherCardSkeleton />
                <VoucherCardSkeleton />
                <VoucherCardSkeleton />
              </div>
            ) : fetchError ? (
              <div className="bg-white p-8 rounded-3xl border border-red-200 text-center text-xs text-[#BC4749] space-y-4 shadow-xs">
                <p className="font-bold">{fetchError}</p>
                <button
                  onClick={() => fetchVouchers(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-black cursor-pointer active:scale-95"
                >
                  Retry Loading
                </button>
              </div>
            ) : vouchers.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-[#E3DFD5] text-center text-xs text-gray-500 shadow-xs">
                No merchant vouchers listed at this moment. Check back soon!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {vouchers.map((v) => {
                  const isUnwrapOpen = activeUnwrapVoucherId === v.id;
                  const canAfford = user && user.points >= v.costPoints;

                  return (
                    <article
                      key={v.id}
                      className="bg-white rounded-3xl p-6 border border-[#E3DFD5] hover:border-[#2D6A4F]/40 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-4">
                        {/* Header Badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-amber-50 text-[#7D5800] border border-amber-200 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span>{v.merchantName}</span>
                          </span>
                          <span className="text-xs font-black text-[#2D6A4F]">
                            {v.costPoints} PTS
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-base font-black font-serif text-[#582F0E]">{v.title}</h3>
                          <p className="text-xs text-gray-500 font-bold">{v.merchantName}</p>
                        </div>

                        <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                          {v.description}
                        </p>

                        {/* Inline Unwrap Confirmation Box (No Modal) */}
                        {isUnwrapOpen && (
                          <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8DCB8] space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-[#582F0E]">
                                Unwrap for {v.costPoints} PTS?
                              </span>
                              <span className="text-[11px] text-gray-500">
                                Balance: {user?.points ?? 0} PTS
                              </span>
                            </div>

                            {redeemError && (
                              <div className="p-2 rounded-lg bg-red-50 text-red-700 text-[11px]">
                                {redeemError}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setActiveUnwrapVoucherId(null)}
                                className="py-2 px-3 rounded-xl border border-[#D5C4AC] text-xs font-bold text-gray-600 hover:bg-white cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRedeem(v)}
                                disabled={redeeming}
                                className="py-2 px-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {redeeming ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Action Button */}
                      {!isUnwrapOpen && (
                        <div>
                          <button
                            onClick={() => {
                              setRedeemError(null);
                              setActiveUnwrapVoucherId(v.id);
                            }}
                            disabled={!canAfford}
                            className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs ${
                              canAfford
                                ? 'bg-[#2D6A4F] hover:bg-[#1B4332] text-white'
                                : 'bg-[#FAF9F5] text-gray-400 border border-[#E3DFD5] cursor-not-allowed'
                            }`}
                          >
                            <Ticket className="w-4 h-4" />
                            <span>
                              {!user
                                ? 'Log in to Redeem'
                                : user.points < v.costPoints
                                ? `Need ${v.costPoints - user.points} more PTS`
                                : 'Unwrap Voucher'}
                            </span>
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
