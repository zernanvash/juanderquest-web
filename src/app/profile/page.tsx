'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { User, Wallet, Award, CheckCircle2, History, Shield, Sparkles, Leaf, Utensils, Landmark } from 'lucide-react';

export default function ProfilePage() {
  const { user, wallet } = useAuth();

  const badges = [
    { name: 'Eco Pioneer', icon: Sparkles, unlocked: true, desc: 'Completed Hundred Islands Eco Quest' },
    { name: 'Heritage Keeper', icon: Landmark, unlocked: true, desc: 'Completed Manaoag Shrine Cultural Trail' },
    { name: 'Food Explorer', icon: Utensils, unlocked: false, desc: 'Complete Dagupan Bangus Culinary Tour' },
  ];

  return (
    <Navigation>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl p-8 border border-[#D5C4AC]/40 shadow-sm text-center flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-4 border-[#FFB703] overflow-hidden bg-amber-100 flex items-center justify-center font-bold text-2xl text-[#582F0E] shadow-md mb-4">
            {user ? user.displayName.charAt(0) : 'J'}
          </div>

          <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">
            {user ? user.displayName : 'Juan Dela Cruz'}
          </h1>
          <p className="text-xs text-[#514532] mt-1">{user ? user.email : 'juan@juanderquest.ph'}</p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3F6653]/15 text-[#3F6653] text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>PANGASINAN EXPLORER</span>
          </div>
        </div>

        {/* Stats & Wallet Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#D5C4AC]/40 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2D6A4F]/15 text-[#2D6A4F] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#837560] uppercase">mJDQ Governance Wallet</div>
                <div className="text-sm font-extrabold text-[#2D6A4F]">
                  {wallet ? `${wallet.balance_mjdq} mJDQ (${wallet.balance_jdq} JDQ)` : '1,000 mJDQ (1.00 JDQ)'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#D5C4AC]/40 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#7D5800] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#837560] uppercase">Demo Reward Points</div>
                <div className="text-sm font-extrabold text-[#7D5800]">
                  {user ? `${user.points} PTS` : '120 PTS'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Action Tile */}
        <Link
          href="/history"
          className="bg-white p-5 rounded-2xl border border-[#D5C4AC]/40 flex items-center justify-between shadow-sm hover:border-[#3F6653] transition group block"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFEEEA] text-[#7D5800] flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#582F0E]">Submissions & Proof History</div>
              <div className="text-xs text-[#837560]">View status of submitted quest proof verifications</div>
            </div>
          </div>
          <span className="text-xs font-bold text-[#3F6653] group-hover:translate-x-1 transition">View History &rarr;</span>
        </Link>

        {/* Live Explorer Badges */}
        <div className="bg-white rounded-3xl p-6 border border-[#D5C4AC]/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-serif text-[#582F0E]">Explorer Achievement Badges</h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              LIVE PROGRESS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {badges.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.name}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center space-y-2 ${
                    b.unlocked
                      ? 'bg-amber-50/50 border-[#FFB703]'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      b.unlocked
                        ? 'bg-[#FFB703]/20 border-[#FFB703] text-[#7D5800]'
                        : 'bg-gray-200 border-gray-300 text-gray-400'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-[#582F0E]">{b.name}</div>
                  <div className="text-[10px] text-[#837560]">{b.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Navigation>
  );
}
