'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Compass, ShieldCheck, MapPin, Sparkles, ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loginWithSeed, isLoading } = useAuth();
  const [selectedSeed, setSelectedSeed] = useState('user-1');

  const handleLogin = async (seedId: string) => {
    const ok = await loginWithSeed(seedId);
    if (ok) {
      router.push('/quests');
    }
  };

  return (
    <Navigation>
      <div className="space-y-8">
        {/* Banner Hero */}
        <div className="bg-gradient-to-r from-[#582F0E] via-[#7D5800] to-[#2D6A4F] text-white rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#FFB703]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wider text-[#FFB703] mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>EXPLORE PANGASINAN TOURISM</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-serif mb-4 leading-tight">
              Gamified Quests & Tourism Governance
            </h1>
            <p className="text-sm md:text-base text-amber-100/90 leading-relaxed mb-6">
              Welcome to JuanDerQuest! Discover eco-trails, cultural heritage spots, culinary destinations, vote on upcoming tourist locations, and earn reward vouchers.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/quests')}
                className="inline-flex items-center gap-2 bg-[#FFB703] text-[#582F0E] font-extrabold px-6 py-3 rounded-xl shadow-md hover:bg-amber-400 transition text-sm"
              >
                <span>Browse Quest Feed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push('/vote')}
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold px-6 py-3 rounded-xl backdrop-blur-md transition text-sm border border-white/20"
              >
                <Compass className="w-4 h-4 text-[#FFB703]" />
                <span>Tourism Spot Voting</span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Login Quick Selector Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#D5C4AC]/40 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-[#582F0E]">Seeded Demo Login</h2>
              <p className="text-xs text-[#514532]">Select a preset demo traveler account for instant E2E evaluation.</p>
            </div>
            {user && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2D6A4F]/10 text-[#2D6A4F] rounded-lg text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active: {user.displayName}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleLogin('user-1')}
              disabled={isLoading}
              className={`p-5 rounded-2xl border-2 text-left transition flex items-center justify-between ${
                selectedSeed === 'user-1'
                  ? 'border-[#2D6A4F] bg-[#2D6A4F]/5'
                  : 'border-[#D5C4AC]/40 hover:border-[#2D6A4F]/50 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center font-bold text-sm">
                  U1
                </div>
                <div>
                  <div className="font-bold text-[#582F0E] text-sm">Juan Dela Cruz (Traveler)</div>
                  <div className="text-xs text-[#514532]">Seed ID: user-1 • Verified active user</div>
                </div>
              </div>
              <UserCheck className="w-5 h-5 text-[#2D6A4F]" />
            </button>

            <button
              onClick={() => handleLogin('admin-1')}
              disabled={isLoading}
              className={`p-5 rounded-2xl border-2 text-left transition flex items-center justify-between ${
                selectedSeed === 'admin-1'
                  ? 'border-[#7D5800] bg-[#FFB703]/10'
                  : 'border-[#D5C4AC]/40 hover:border-[#7D5800]/50 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7D5800] text-white flex items-center justify-center font-bold text-sm">
                  A1
                </div>
                <div>
                  <div className="font-bold text-[#582F0E] text-sm">Administrator Seed</div>
                  <div className="text-xs text-[#514532]">Seed ID: admin-1 • Evaluation account</div>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-[#7D5800]" />
            </button>
          </div>
        </div>

        {/* Feature Grid Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#D5C4AC]/40 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-[#7D5800] flex items-center justify-center font-bold">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#582F0E]">Pangasinan Quest Trails</h3>
            <p className="text-xs text-[#514532] leading-relaxed">
              Explore Hundred Islands, Patar Beach, Bolinao Lighthouse, Sunflower Maze, and San Fabian heritage sites.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#D5C4AC]/40 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center font-bold">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#582F0E]">GPS & Simulated AR Proof</h3>
            <p className="text-xs text-[#514532] leading-relaxed">
              Scan simulated AR target markers, capture device coordinates, and submit location verification for review.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#D5C4AC]/40 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-[#7D5800] flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#582F0E]">Paid Governance Voting</h3>
            <p className="text-xs text-[#514532] leading-relaxed">
              Cast paid mJDQ binary votes (10 mJDQ per vote, 20% burn, 80% escrow) on next community tourism spots.
            </p>
          </div>
        </div>
      </div>
    </Navigation>
  );
}
