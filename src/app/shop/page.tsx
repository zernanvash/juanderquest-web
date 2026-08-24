'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { api, normalizeVoucher, normalizeRedemption, uuid, VoucherModel, RedemptionModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { Navigation } from '@/components/Navigation';
import { VoucherCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ShoppingBag, Award, Coins, CheckCircle2, Ticket, Sparkles, Gift, AlertCircle, Loader2 } from 'lucide-react';

export default function ShopPage() {
  const { user, refreshProfile } = useAuth();
  const { isReady } = useRequireAuth();
  const [vouchers, setVouchers] = useState<VoucherModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherModel | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redemption, setRedemption] = useState<RedemptionModel | null>(null);

  const fetchVouchers = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data: rawVouchers } = await fetchWithCache(
        'merchant_vouchers',
        async () => {
          const res = await api.get('/vouchers');
          if (!res.data?.success) throw new Error('Vouchers unavailable');
          return (res.data.data as Parameters<typeof normalizeVoucher>[0][]).map(normalizeVoucher);
        },
        { ttlMs: 120_000, forceRefresh }
      );
      setVouchers(rawVouchers);
    } catch {
      setFetchError('Could not reach the merchant server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleRedeem = async () => {
    if (!selectedVoucher) return;
    setRedeeming(true);
    setRedeemError(null);

    try {
      const res = await api.post(`/vouchers/${selectedVoucher.id}/redeem`, {
        idempotency_key: uuid(),
      });

      if (res.data?.success) {
        setRedemption(normalizeRedemption(res.data.data.redemption ?? res.data.data));
        // Server is the source of truth for points; refresh the profile balance.
        await refreshProfile();
      } else {
        setRedeemError(res.data?.error?.message || 'Redemption failed');
      }
    } catch (e: any) {
      setRedeemError(e.response?.data?.error?.message || 'Network error during redemption.');
    }
    setRedeeming(false);
  };

  const insufficient = (v: VoucherModel) => !user || user.points < v.costPoints;

  if (!isReady) return null;

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Merchant Vouchers">
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#7D5800] uppercase tracking-wider mb-1">
                <Gift className="w-4 h-4 text-[#FFB703]" />
                <span>COLLECTIBLE REWARDS BAZAAR</span>
              </div>
              <h1 className="text-3xl font-extrabold font-serif text-[#582F0E]">Merchant Vouchers</h1>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#D5C4AC]/50 flex items-center gap-3 shrink-0 shadow-sm">
              <Coins className="w-6 h-6 text-[#7D5800]" />
              <div>
                <div className="text-[10px] font-extrabold text-[#837560] uppercase">Reward Points</div>
                <div className="text-base font-black text-[#7D5800]">
                  {user ? `${user.points} PTS` : '—'}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true" aria-label="Loading vouchers">
              <VoucherCardSkeleton />
              <VoucherCardSkeleton />
              <VoucherCardSkeleton />
            </div>
          ) : fetchError ? (
            <div className="bg-white p-12 rounded-3xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560] space-y-4 shadow-xs">
              <p>{fetchError}</p>
              <button
                onClick={() => fetchVouchers(true)}
                className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {vouchers.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-3xl border-2 border-[#D5C4AC]/40 hover:border-[#FFB703] p-6 flex flex-col justify-between shadow-sm space-y-4 hover:shadow-xl transition transform hover:-translate-y-1 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-xl bg-[#2D6A4F]/10 text-[#2D6A4F]">
                      {v.merchantName || 'MERCHANT'}
                    </span>
                    <div className="flex items-center gap-1.5 text-white text-xs font-black gold-gradient px-3 py-1 rounded-xl shadow-sm">
                      <Award className="w-4 h-4" />
                      <span>-{v.costPoints} PTS</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold font-serif text-[#582F0E] group-hover:text-[#2D6A4F] transition">{v.title}</h3>
                  <p className="text-xs text-[#514532] leading-relaxed">{v.description}</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedVoucher(v);
                    setRedemption(null);
                    setRedeemError(null);
                  }}
                  disabled={insufficient(v)}
                  className={`w-full inline-flex items-center justify-center gap-2 font-black py-3 px-4 rounded-2xl text-xs shadow-md hover:scale-[1.02] transition ${
                    insufficient(v)
                      ? 'bg-[#EFEEEA] text-[#837560] cursor-not-allowed'
                      : 'gold-gradient text-[#582F0E]'
                  }`}
                  title={insufficient(v) ? (user ? 'Insufficient points' : 'Log in to redeem vouchers') : undefined}
                >
                  <Ticket className="w-4 h-4" />
                  <span>
                    {!user
                      ? 'Log in to redeem'
                      : user.points < v.costPoints
                      ? `Need ${v.costPoints - user.points} more PTS`
                      : 'Unwrap Voucher'}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Redeem Confirmation & Code Modal */}
        {selectedVoucher && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="redeem-dialog-title" className="bg-white max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl p-6 border border-[#D5C4AC] shadow-2xl space-y-5 text-center">
              {!redemption ? (
                <>
                  <div className="w-16 h-16 rounded-2xl gold-gradient text-white flex items-center justify-center mx-auto shadow-md animate-float">
                    <Gift className="w-8 h-8" />
                  </div>

                  <h3 id="redeem-dialog-title" className="text-lg font-bold font-serif text-[#582F0E]">
                    Unwrap Loot Voucher
                  </h3>

                  <p className="text-xs text-[#514532]">
                    Redeem "{selectedVoucher.title}" for <strong className="text-[#7D5800]">{selectedVoucher.costPoints} PTS</strong>?
                    Your balance is {user?.points ?? 0} PTS.
                  </p>

                  {redeemError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{redeemError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      autoFocus
                      onClick={() => setSelectedVoucher(null)}
                      disabled={redeeming}
                      className="flex-1 py-3 rounded-2xl border border-[#D5C4AC] text-xs font-bold text-[#582F0E]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRedeem}
                      disabled={redeeming}
                      className="flex-1 py-3 rounded-2xl bg-[#2D6A4F] text-white text-xs font-black hover:bg-[#1B4332] shadow-md disabled:opacity-60"
                    >
                      {redeeming ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Confirm (-${selectedVoucher.costPoints} PTS)`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <h3 id="redeem-dialog-title" className="text-lg font-bold font-serif text-[#582F0E]">
                    Voucher Unwrapped!
                  </h3>

                  <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#D5C4AC]/60 space-y-1">
                    <div className="text-[10px] text-[#837560] font-bold uppercase mb-1">Claimable Voucher Code</div>
                    <div className="text-lg font-mono font-black text-[#7D5800] tracking-wider select-all break-all">
                      {redemption.code}
                    </div>
                    <div className="text-[10px] text-[#837560] font-semibold">
                      {redemption.voucherTitle || selectedVoucher.title} · {redemption.merchantName || selectedVoucher.merchantName}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedVoucher(null)}
                    className="w-full py-3 rounded-2xl bg-[#582F0E] text-white text-xs font-black hover:bg-[#3d200a]"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      </ErrorBoundary>
    </Navigation>
  );
}
