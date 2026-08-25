'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  ArrowRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  Zap,
  Award,
  ShoppingBag,
  Vote,
  Users,
  ChevronRight
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';

export default function HomePage() {
  const portals = [
    {
      title: 'Discover & Field Reports',
      desc: 'Explore authentic Pangasinan beaches, caves, heritage shrines, and culinary gems shared by verified local scouts.',
      href: '/explore',
      icon: Compass,
      badge: 'Community Feed',
      cta: 'Explore Feed',
    },
    {
      title: 'Quests & Pre-Events',
      desc: 'Complete GPS check-in trails and pre-register for municipal festivals with escrow-backed bounties and referral rewards.',
      href: '/quests',
      icon: Zap,
      badge: 'Bounties & Raids',
      cta: 'Start Quests',
    },
    {
      title: 'Interactive Map & Routing',
      desc: 'Turn-by-turn routing powered by open vector maps to navigate between coastal spots and avoid congested highways.',
      href: '/map',
      icon: MapPin,
      badge: 'Valhalla Navigation',
      cta: 'Open Map',
    },
    {
      title: 'Scout Hall of Fame',
      desc: 'Climb weekly leaderboards, earn Soulbound civic badges, and become a Master JuanDerer Explorer.',
      href: '/leaderboard',
      icon: Award,
      badge: 'Rankings',
      cta: 'View Leaderboard',
    },
    {
      title: 'MSME Partner Shop',
      desc: 'Redeem off-chain points for artisanal Dasol salt pouches, fresh Bangus delicacies, and local craft discounts.',
      href: '/shop',
      icon: ShoppingBag,
      badge: 'Vouchers Locker',
      cta: 'Browse Shop',
    },
    {
      title: 'Civic Governance DAO',
      desc: 'Cast off-chain votes on municipal eco-tourism proposals and regional conservation priorities.',
      href: '/vote',
      icon: Vote,
      badge: 'Community Voice',
      cta: 'Vote on Proposals',
    },
  ];

  return (
    <Navigation>
      <div className="max-w-6xl mx-auto space-y-12 pb-16">
        {/* Editorial Hero Banner */}
        <div className="bg-white rounded-xl border border-[#E3DFD5] p-6 sm:p-12 space-y-6 shadow-xs relative overflow-hidden">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[#2D6A4F] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
              <span>JuanDerQuest • Pangasinan Gamified Eco-Tourism</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#2C221E] leading-tight">
              Explore Pangasinan. Verify Visits. Empower Local Communities.
            </h1>

            <p className="text-xs sm:text-sm text-[#514532] leading-relaxed">
              A decentralized, gamified platform connecting travelers with authentic municipal destinations, time-limited festival raids, and local MSME partner merchants.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/explore"
                className="py-3 px-6 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xs transition active:scale-98"
              >
                <span>Start Exploring</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/quests"
                className="py-3 px-6 rounded-lg bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] text-[#582F0E] text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition active:scale-98"
              >
                <Zap className="w-4 h-4 text-[#FFB703]" />
                <span>Browse Quests &amp; Events</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#E8E5DE]">
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
              <span className="text-[10px] text-gray-500 uppercase font-medium block">Coverage</span>
              <span className="text-base sm:text-lg font-bold text-[#2C221E]">14 Municipalities</span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
              <span className="text-[10px] text-gray-500 uppercase font-medium block">Verification</span>
              <span className="text-base sm:text-lg font-bold text-[#2D6A4F]">GPS Radius &amp; AR</span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
              <span className="text-[10px] text-gray-500 uppercase font-medium block">Local Economy</span>
              <span className="text-base sm:text-lg font-bold text-[#B45309]">MSME Merchant Escrow</span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
              <span className="text-[10px] text-gray-500 uppercase font-medium block">Governance</span>
              <span className="text-base sm:text-lg font-bold text-[#582F0E]">Civic DAO Polling</span>
            </div>
          </div>
        </div>

        {/* Portals Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#2C221E]">Platform Portals</h2>
              <p className="text-xs text-gray-500">Each pillar designed with a clear, single purpose.</p>
            </div>
            <Link href="/about" className="text-xs font-bold text-[#2D6A4F] hover:underline">
              Read Research Vision →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {portals.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-[#E3DFD5] hover:border-[#2D6A4F]/60 p-6 flex flex-col justify-between space-y-4 shadow-xs transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#2D6A4F]" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-[#FAF9F5] border border-[#E3DFD5] px-2 py-0.5 rounded">
                        {p.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                      {p.title}
                    </h3>

                    <p className="text-xs text-[#514532] leading-relaxed">
                      {p.desc}
                    </p>
                  </div>

                  <Link
                    href={p.href}
                    className="pt-3 border-t border-[#E8E5DE] text-xs font-bold text-[#2D6A4F] flex items-center justify-between group-hover:translate-x-0.5 transition"
                  >
                    <span>{p.cta}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Navigation>
  );
}
