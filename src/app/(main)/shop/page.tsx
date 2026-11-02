'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { api, normalizeVoucher, normalizeRedemption, uuid, VoucherModel, RedemptionModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { VoucherCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  ShoppingBag,
  Coins,
  CheckCircle2,
  Ticket,
  Sparkles,
  Gift,
  Loader2,
  Tag,
  Copy,
} from 'lucide-react';
import { VoucherRippingOverlay } from '@/components/VoucherRippingOverlay';
import { AnimatedCounter } from '@/components/AnimatedCounter';

type ShopSection = 'cosmetics' | 'vouchers' | 'coming-soon' | 'my-items';
type CosmeticCategory = 'Banner' | 'Avatar frame' | 'Title' | 'Name colours';

const cosmeticItems: Array<{
  id: string;
  name: string;
  category: CosmeticCategory;
  cost: number;
  rarity: 'Common' | 'Rare';
  preview: string;
  accent: string;
  animated?: boolean;
}> = [
  { id: 'lingayen-sunset', name: 'Lingayen Sunset', category: 'Banner', cost: 150, rarity: 'Common', preview: 'sunset', accent: '#F6A25D', animated: true },
  { id: 'hundred-islands', name: 'Hundred Islands', category: 'Banner', cost: 400, rarity: 'Rare', preview: 'seafoam', accent: '#48C7B4', animated: true },
  { id: 'capiz-heritage', name: 'Capiz Heritage', category: 'Banner', cost: 400, rarity: 'Rare', preview: 'heritage', accent: '#D5AF6C' },
  { id: 'mangrove-tide', name: 'Mangrove Tide', category: 'Banner', cost: 250, rarity: 'Common', preview: 'mangrove', accent: '#3D8065' },
  { id: 'deep-sea-current', name: 'Deep Sea Current', category: 'Banner', cost: 400, rarity: 'Rare', preview: 'deep-sea', accent: '#08718A', animated: true },
  { id: 'patar-gold', name: 'Patar Golden Hour', category: 'Banner', cost: 400, rarity: 'Rare', preview: 'golden-hour', accent: '#F07818' },
  { id: 'bamboo-ring', name: 'Bamboo Ring', category: 'Avatar frame', cost: 120, rarity: 'Common', preview: 'frame', accent: '#34845D' },
  { id: 'coral-ring', name: 'Coral Ring', category: 'Avatar frame', cost: 350, rarity: 'Rare', preview: 'frame', accent: '#FB7185' },
  { id: 'sea-glass', name: 'Sea Glass', category: 'Avatar frame', cost: 350, rarity: 'Rare', preview: 'frame', accent: '#55A9C0' },
  { id: 'sunrise-frame', name: 'Sunrise Frame', category: 'Avatar frame', cost: 500, rarity: 'Rare', preview: 'frame', accent: '#F8CC59' },
  { id: 'island-hopper', name: 'Island Hopper', category: 'Title', cost: 100, rarity: 'Common', preview: 'title', accent: '#B65C18' },
  { id: 'bangus-buff', name: 'Bangus Buff', category: 'Title', cost: 100, rarity: 'Common', preview: 'title', accent: '#B65C18' },
  { id: 'pangasinan-pioneer', name: 'Pangasinan Pioneer', category: 'Title', cost: 0, rarity: 'Rare', preview: 'title', accent: '#B65C18' },
  { id: 'civic-voice', name: 'Civic Voice', category: 'Title', cost: 0, rarity: 'Rare', preview: 'title', accent: '#B65C18' },
  { id: 'mangrove-green', name: 'Mangrove Green', category: 'Name colours', cost: 80, rarity: 'Common', preview: 'name', accent: '#36775D' },
  { id: 'sunset-orange', name: 'Sunset Orange', category: 'Name colours', cost: 250, rarity: 'Rare', preview: 'name', accent: '#D74715' },
  { id: 'deep-sea-blue', name: 'Deep Sea Blue', category: 'Name colours', cost: 250, rarity: 'Rare', preview: 'name', accent: '#315FDF' },
  { id: 'orchid-violet', name: 'Orchid Violet', category: 'Name colours', cost: 250, rarity: 'Rare', preview: 'name', accent: '#8B2FD4' },
];

export default function ShopPage() {
  const { user, refreshProfile } = useAuth();
  const { isReady } = useRequireAuth();
  const [vouchers, setVouchers] = useState<VoucherModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // In-Page Active Redemption State
  const [activeUnwrapVoucherId, setActiveUnwrapVoucherId] = useState<string | null>(null);
  const [redemption, setRedemption] = useState<RedemptionModel | null>(null);
  const [claimedVoucher, setClaimedVoucher] = useState<{
    voucher: VoucherModel;
    redemption: RedemptionModel;
  } | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeSection, setActiveSection] = useState<ShopSection>('cosmetics');
  const [activeCategory, setActiveCategory] = useState<CosmeticCategory | 'All'>('All');
  const [liveAnimations, setLiveAnimations] = useState(true);

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
        const red = normalizeRedemption(res.data.data);
        setRedemption(red);
        setClaimedVoucher({ voucher, redemption: red });
        setActiveUnwrapVoucherId(null);
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

  if (!isReady) return null;

  return (
    <ErrorBoundary fallbackTitle="Unable to display Merchant Shop">
        <div className="w-full space-y-6">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white p-5 shadow-xs md:px-6 md:py-5">
            <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#087357]">Traveler Shop</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[#582F0E] md:text-[34px]">
                  Make your profile yours
                </h1>
                <p className="mt-1 text-xs leading-relaxed text-[#756F69] md:text-sm">
                  Collect Pangasinan-inspired cosmetics, partner offers, and upcoming experiences.
                </p>
              </div>

              {/* Balance Widget */}
              <div className="flex shrink-0 items-center gap-2 rounded-full bg-[#FFF9E9] px-4 py-3 text-[#88450F]">
                <Coins className="h-4 w-4" />
                <div className="text-sm font-black">
                  <AnimatedCounter value={user?.points ?? 0} suffix=" points" />
                </div>
              </div>
            </div>
          </div>

          <nav aria-label="Shop sections" className="flex flex-wrap gap-2">
            {([
              ['cosmetics', 'Cosmetics'],
              ['vouchers', 'Vouchers'],
              ['coming-soon', 'Coming soon'],
              ['my-items', 'My items'],
            ] as const).map(([section, label]) => (
              <button
                key={section}
                type="button"
                aria-pressed={activeSection === section}
                onClick={() => setActiveSection(section)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  activeSection === section
                    ? 'border-[#006B50] bg-[#006B50] text-white'
                    : 'border-[#DDD8D1] bg-white text-[#514B45] hover:border-[#006B50] hover:text-[#006B50]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {activeSection === 'cosmetics' && (
            <section aria-label="Cosmetic catalog" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {(['All', 'Banner', 'Avatar frame', 'Title', 'Name colours'] as const).map((category) => (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={activeCategory === category}
                      onClick={() => setActiveCategory(category)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        activeCategory === category
                          ? 'border-[#FFD02F] bg-[#FFD02F] text-[#51350B]'
                          : 'border-[#E3DFD5] bg-white text-[#514B45] hover:border-[#D9AE4E]'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-pressed={liveAnimations}
                  onClick={() => setLiveAnimations((enabled) => !enabled)}
                  className="rounded-full bg-[#006B50] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#00543F]"
                >
                  ✨ Live animations: {liveAnimations ? 'On' : 'Off'}
                </button>
              </div>

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cosmeticItems
                  .filter((item) => activeCategory === 'All' || item.category === activeCategory)
                  .map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-3xl border border-[#E8E5E0] bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div
                        className={`relative flex aspect-[2.4/1] items-center justify-center overflow-hidden ${
                          liveAnimations && item.animated ? 'animate-[pulse_8s_ease-in-out_infinite]' : ''
                        }`}
                        style={{
                          background:
                            item.preview === 'sunset'
                              ? 'linear-gradient(180deg,#40356D 0%,#C46B7C 42%,#FDBD75 70%,#27335E 71%,#1F2949 100%)'
                              : item.preview === 'seafoam'
                                ? 'radial-gradient(circle at 20% 30%,#FFFFFFAA 0 1px,transparent 2px),radial-gradient(circle at 70% 65%,#FFFFFF99 0 1px,transparent 2px),linear-gradient(120deg,#8FE3D4,#E2FFF2 45%,#51C8B2)'
                                : item.preview === 'heritage'
                                  ? 'linear-gradient(135deg,#DFC083,#CFA75E)'
                                  : item.preview === 'mangrove'
                                    ? 'linear-gradient(135deg,#6FAF91,#33775B)'
                                    : item.preview === 'deep-sea'
                                      ? 'repeating-linear-gradient(72deg,#07516A 0 26px,#0C6074 27px 48px,#064458 49px 70px)'
                                      : item.preview === 'golden-hour'
                                        ? 'linear-gradient(135deg,#FF9B13,#EA4C19)'
                                        : item.preview === 'frame'
                                          ? 'linear-gradient(145deg,#E8FFF5,#FFF9E8)'
                                          : '#FAFAFA',
                        }}
                      >
                        {item.preview === 'sunset' && (
                          <>
                            <span className="absolute bottom-[28%] left-[20%] h-10 w-10 rounded-full bg-[#FFE49A] shadow-[0_0_30px_#FFD273]" />
                            <span className="absolute bottom-0 h-[29%] w-full border-t-2 border-[#FFC06D]/60 bg-[#253158]/80" />
                            {liveAnimations && <span className="absolute right-8 top-3 h-12 w-12 rounded-full border-2 border-white/15" />}
                          </>
                        )}
                        {item.preview === 'deep-sea' && (
                          <span className="text-4xl tracking-widest text-white/80" aria-hidden="true">〰 🐟 〰</span>
                        )}
                        {item.preview === 'frame' && (
                          <div
                            className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full border-[5px] bg-white p-1 shadow-sm"
                            style={{ borderColor: item.accent }}
                          >
                            <div aria-label={`${item.name} avatar frame preview`} className="grid h-full w-full grid-cols-2 grid-rows-2 overflow-hidden rounded-full border border-[#486B78]">
                              <span className="bg-[#54707A]" />
                              <span className="bg-[#F2F1E9]" />
                              <span className="bg-[#F2F1E9]" />
                              <span className="bg-[#54707A]" />
                            </div>
                          </div>
                        )}
                        {item.preview === 'title' && (
                          <div className="flex items-center gap-2 font-black text-[#633B1D]">
                            <span className="text-sm">{user?.handle || 'juantraveler'}</span>
                            <span className="text-xs" style={{ color: item.accent }}>{item.name}</span>
                          </div>
                        )}
                        {item.preview === 'name' && (
                          <span className="text-lg font-black" style={{ color: item.accent }}>
                            {user?.handle || 'juantraveler'}
                          </span>
                        )}
                        {item.preview !== 'frame' && item.preview !== 'title' && item.preview !== 'name' && item.animated && (
                          <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-1 text-[9px] font-bold text-white">
                            Procedural · animated
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="truncate text-base font-black text-[#633B1D]">{item.name}</h2>
                          <span className="shrink-0 rounded-full bg-[#E8FBF3] px-2.5 py-1 text-[10px] font-black uppercase text-[#006B50]">
                            {item.rarity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#817A73]">{item.category}</p>
                        <p className="mt-2 text-sm font-extrabold text-[#423A34]">
                          {item.cost > 0 ? `${item.cost} points` : `Unlock: ${item.name}`}
                        </p>
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          )}

          {activeSection === 'coming-soon' && (
            <section className="rounded-3xl border border-[#E3DFD5] bg-white p-8 text-center shadow-xs">
              <Sparkles className="mx-auto h-8 w-8 text-[#D99D1B]" />
              <h2 className="mt-3 text-lg font-black text-[#582F0E]">More ways to explore are on the way</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-[#756F69]">
                We’re preparing new Pangasinan experiences and partner rewards for the Traveler Shop.
              </p>
            </section>
          )}

          {activeSection === 'my-items' && (
            <section className="rounded-3xl border border-[#E3DFD5] bg-white p-8 text-center shadow-xs">
              <ShoppingBag className="mx-auto h-8 w-8 text-[#087357]" />
              <h2 className="mt-3 text-lg font-black text-[#582F0E]">Your items will appear here</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-[#756F69]">
                Cosmetics you collect and vouchers you redeem will be gathered in your collection.
              </p>
            </section>
          )}

          {activeSection === 'vouchers' && (
            <>
          {/* Ripping Ticket Celebration Overlay */}
          {claimedVoucher && (
            <VoucherRippingOverlay
              isOpen={Boolean(claimedVoucher)}
              onClose={() => setClaimedVoucher(null)}
              voucherTitle={claimedVoucher.voucher.title}
              merchantName={claimedVoucher.voucher.merchantName}
              costPoints={claimedVoucher.voucher.costPoints}
              redemptionCode={claimedVoucher.redemption.code}
              description={claimedVoucher.voucher.description}
              userPointsLeft={(user?.points ?? 0) - claimedVoucher.voucher.costPoints}
            />
          )}

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

          {/* Vouchers Grid Layout (Responsive Multi-Column Cards) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-[#582F0E]">
                Available Local Vouchers ({vouchers.length})
              </h2>
              <span className="text-xs font-bold text-gray-500">Instant Redemption</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5">
                <VoucherCardSkeleton />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 items-start">
                {vouchers.map((v) => {
                  const isUnwrapOpen = activeUnwrapVoucherId === v.id;
                  const canAfford = user && user.points >= v.costPoints;

                  return (
                    <article
                      key={v.id}
                      className="card-alive bg-white rounded-3xl p-6 border border-[#E3DFD5] hover:border-[#2D6A4F]/40 shadow-xs hover:shadow-md flex flex-col justify-between space-y-5"
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
                          <h3 className="text-base font-black text-[#582F0E]">{v.title}</h3>
                          <p className="text-xs text-gray-500 font-bold">{v.merchantName}</p>
                        </div>

                        <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                          {v.description}
                        </p>

                        {/* Inline Unwrap Confirmation Box (No Modal) */}
                        {isUnwrapOpen && (
                          <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#E8DCB8] space-y-3 animate-fade-in shadow-inner">
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
                                className="btn-tactile py-2 px-3 rounded-xl border border-[#D5C4AC] text-xs font-bold text-gray-600 hover:bg-white cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRedeem(v)}
                                disabled={redeeming}
                                className="btn-tactile btn-sheen py-2 px-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
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
                            className={`btn-tactile w-full py-3.5 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                              canAfford
                                ? 'btn-sheen bg-[#2D6A4F] hover:bg-[#1B4332] text-white'
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
            </>
          )}
        </div>
      </ErrorBoundary>
  );
}
