'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { ShoppingBag, Award, Coins, CheckCircle2, Ticket, Sparkles, Gift } from 'lucide-react';

interface VoucherItem {
  id: string;
  merchantName: string;
  title: string;
  description: string;
  pointsCost: number;
  discountText: string;
}

export default function ShopPage() {
  const { user, deductPointsLocally } = useAuth();
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherItem | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);

  const vouchers: VoucherItem[] = [
    {
      id: 'v_1',
      merchantName: 'Bonuan Seafood Restaurant',
      title: '20% OFF Grilled Bangus Meal',
      description: 'Valid for dine-in orders at Bonuan Blue Beach seafood hub, Dagupan City.',
      pointsCost: 50,
      discountText: '20% DISCOUNT',
    },
    {
      id: 'v_2',
      merchantName: 'Bolinao Kayak Rentals',
      title: '₱100 Discount on Balingasay River Kayak',
      description: 'Redeem at Balingasay River Eco-Station for kayak rental services.',
      pointsCost: 40,
      discountText: '₱100 VOUCHER',
    },
    {
      id: 'v_3',
      merchantName: 'Pangasinan Craft Souvenirs',
      title: 'Free Bamboo Craft Token',
      description: 'Claim a complimentary hand-crafted Pangasinan souvenir token.',
      pointsCost: 30,
      discountText: 'FREE GIFT',
    },
  ];

  const handleRedeem = () => {
    if (!selectedVoucher || !user) return;
    if (user.points < selectedVoucher.pointsCost) {
      alert('Insufficient points to redeem this voucher.');
      return;
    }

    deductPointsLocally(selectedVoucher.pointsCost);
    const code = `JDQ-${selectedVoucher.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setRedeemedCode(code);
  };

  return (
    <Navigation>
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
              <div className="text-[10px] font-extrabold text-[#837560] uppercase">XP Reward Points</div>
              <div className="text-base font-black text-[#7D5800]">
                {user ? `${user.points} PTS` : '120 PTS'}
              </div>
            </div>
          </div>
        </div>

        {/* Collectible Vouchers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vouchers.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-3xl border-2 border-[#D5C4AC]/40 hover:border-[#FFB703] p-6 flex flex-col justify-between shadow-sm space-y-4 hover:shadow-xl transition transform hover:-translate-y-1 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase px-3 py-1 rounded-xl bg-[#2D6A4F]/10 text-[#2D6A4F]">
                    {v.discountText}
                  </span>
                  <div className="flex items-center gap-1.5 text-white text-xs font-black gold-gradient px-3 py-1 rounded-xl shadow-sm">
                    <Award className="w-4 h-4" />
                    <span>-{v.pointsCost} PTS</span>
                  </div>
                </div>

                <div className="text-[10px] font-extrabold text-[#837560] uppercase tracking-wider">{v.merchantName}</div>
                <h3 className="text-base font-bold font-serif text-[#582F0E] group-hover:text-[#2D6A4F] transition">{v.title}</h3>
                <p className="text-xs text-[#514532] leading-relaxed">{v.description}</p>
              </div>

              <button
                onClick={() => {
                  setSelectedVoucher(v);
                  setRedeemedCode(null);
                }}
                className="w-full inline-flex items-center justify-center gap-2 gold-gradient text-[#582F0E] font-black py-3 px-4 rounded-2xl text-xs shadow-md hover:scale-[1.02] transition"
              >
                <Ticket className="w-4 h-4" />
                <span>Unwrap Voucher</span>
              </button>
            </div>
          ))}
        </div>

        {/* Redeem Confirmation & Code Modal */}
        {selectedVoucher && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-[#D5C4AC] shadow-2xl space-y-5 text-center">
              {!redeemedCode ? (
                <>
                  <div className="w-16 h-16 rounded-2xl gold-gradient text-white flex items-center justify-center mx-auto shadow-md animate-float">
                    <Gift className="w-8 h-8" />
                  </div>

                  <h3 className="text-lg font-bold font-serif text-[#582F0E]">
                    Unwrap Loot Voucher
                  </h3>

                  <p className="text-xs text-[#514532]">
                    Redeem "{selectedVoucher.title}" for <strong className="text-[#7D5800]">{selectedVoucher.pointsCost} PTS</strong>?
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedVoucher(null)}
                      className="flex-1 py-3 rounded-2xl border border-[#D5C4AC] text-xs font-bold text-[#582F0E]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRedeem}
                      className="flex-1 py-3 rounded-2xl bg-[#2D6A4F] text-white text-xs font-black hover:bg-[#1B4332] shadow-md"
                    >
                      Confirm (-{selectedVoucher.pointsCost} PTS)
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <h3 className="text-lg font-bold font-serif text-[#582F0E]">
                    Voucher Unwrapped!
                  </h3>

                  <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#D5C4AC]/60">
                    <div className="text-[10px] text-[#837560] font-bold uppercase mb-1">Claimable Voucher Code</div>
                    <div className="text-lg font-mono font-black text-[#7D5800] tracking-wider select-all">
                      {redeemedCode}
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
    </Navigation>
  );
}
