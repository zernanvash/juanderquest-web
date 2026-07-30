'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { ShoppingBag, Award, Coins, CheckCircle2, Ticket, Sparkles } from 'lucide-react';

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
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">Merchant Vouchers</h1>
            <p className="text-xs text-[#514532]">Redeem demo reward points for discount vouchers with Pangasinan merchants.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-[#D5C4AC]/50 flex items-center gap-3 shrink-0 shadow-sm">
            <Coins className="w-5 h-5 text-[#7D5800]" />
            <div>
              <div className="text-[10px] font-bold text-[#837560] uppercase">Available Points</div>
              <div className="text-sm font-extrabold text-[#7D5800]">
                {user ? `${user.points} PTS` : '120 PTS'}
              </div>
            </div>
          </div>
        </div>

        {/* Vouchers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vouchers.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-2xl border border-[#D5C4AC]/40 p-6 flex flex-col justify-between shadow-sm space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#2D6A4F]/10 text-[#2D6A4F]">
                    {v.discountText}
                  </span>
                  <div className="flex items-center gap-1 text-[#7D5800] text-xs font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Award className="w-3.5 h-3.5" />
                    <span>-{v.pointsCost} PTS</span>
                  </div>
                </div>

                <div className="text-xs font-bold text-[#837560] uppercase tracking-wider">{v.merchantName}</div>
                <h3 className="text-base font-bold font-serif text-[#582F0E]">{v.title}</h3>
                <p className="text-xs text-[#514532] leading-relaxed">{v.description}</p>
              </div>

              <button
                onClick={() => {
                  setSelectedVoucher(v);
                  setRedeemedCode(null);
                }}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#FFB703] hover:bg-amber-400 text-[#582F0E] font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow-sm"
              >
                <Ticket className="w-4 h-4" />
                <span>Redeem Voucher</span>
              </button>
            </div>
          ))}
        </div>

        {/* Redeem Confirmation Modal */}
        {selectedVoucher && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-[#D5C4AC] shadow-2xl space-y-5 text-center">
              {!redeemedCode ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-100 text-[#7D5800] flex items-center justify-center mx-auto">
                    <Ticket className="w-8 h-8" />
                  </div>

                  <h3 className="text-lg font-bold font-serif text-[#582F0E]">
                    Confirm Voucher Redemption
                  </h3>

                  <p className="text-xs text-[#514532]">
                    Redeem "{selectedVoucher.title}" for <strong className="text-[#7D5800]">{selectedVoucher.pointsCost} PTS</strong>?
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedVoucher(null)}
                      className="flex-1 py-2.5 rounded-xl border border-[#D5C4AC] text-xs font-bold text-[#582F0E]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRedeem}
                      className="flex-1 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#1B4332]"
                    >
                      Confirm (-{selectedVoucher.pointsCost} PTS)
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#2D6A4F] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <h3 className="text-lg font-bold font-serif text-[#582F0E]">
                    Voucher Redeemed Successfully!
                  </h3>

                  <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#D5C4AC]/60">
                    <div className="text-[10px] text-[#837560] font-bold uppercase mb-1">Your Redemption Code</div>
                    <div className="text-base font-mono font-extrabold text-[#7D5800] tracking-wider select-all">
                      {redeemedCode}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedVoucher(null)}
                    className="w-full py-2.5 rounded-xl bg-[#582F0E] text-white text-xs font-bold hover:bg-[#3d200a]"
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
