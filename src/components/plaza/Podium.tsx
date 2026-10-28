'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Crown, MapPin } from 'lucide-react';
import type { StandingEntry } from '@/lib/plaza-api';
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import { DisplayName } from '@/components/cosmetics/DisplayName';
import { ProfileBanner } from '@/components/cosmetics/ProfileBanner';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/animations/gsap';

interface PodiumProps {
  podium: StandingEntry[];
}

export const Podium: React.FC<PodiumProps> = ({ podium }) => {
  const containerRef = useRef<HTMLElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const crownRef = useRef<HTMLDivElement>(null);

  const first = podium.find((p) => p.rank === 1) || podium[0];
  const second = podium.find((p) => p.rank === 2) || podium[1];
  const third = podium.find((p) => p.rank === 3) || podium[2];

  useGSAP(
    () => {
      if (!first) return;

      const reduced = prefersReducedMotion();
      const narrow = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches;
      if (reduced) {
        // Reduced motion: subtle opacity fade only (<= 150ms)
        const targets = [card2Ref.current, card3Ref.current, card1Ref.current, crownRef.current].filter(Boolean);
        gsap.from(targets, {
          opacity: 0,
          duration: 0.15,
          ease: 'power1.out',
        });
        return;
      }

      // Full animation timeline: total duration <= 1.2s
      // Staggered rise in order: 2nd -> 3rd -> 1st with elastic overshoot, then crown drop on 1st
      const tl = gsap.timeline();

      if (card2Ref.current) {
        tl.from(card2Ref.current, {
          y: narrow ? 0 : 40,
          opacity: 0,
          duration: 0.45,
          ease: 'back.out(1.8)',
        });
      }

      if (card3Ref.current) {
        tl.from(
          card3Ref.current,
          {
            y: narrow ? 0 : 40,
            opacity: 0,
            duration: 0.45,
            ease: 'back.out(1.8)',
          },
          '-=0.3'
        );
      }

      if (card1Ref.current) {
        tl.from(
          card1Ref.current,
          {
            y: narrow ? 0 : 55,
            opacity: 0,
            duration: 0.55,
            ease: 'back.out(2)',
          },
          '-=0.3'
        );
      }

      if (crownRef.current) {
        tl.from(
          crownRef.current,
          {
            y: narrow ? 0 : -24,
            scale: 0.8,
            opacity: 0,
            duration: 0.35,
            ease: 'bounce.out',
          },
          '-=0.15'
        );
      }
    },
    { scope: containerRef, dependencies: [] }
  );

  if (!first) return null;

  return (
    <section ref={containerRef} aria-label="Top 3 podium" className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-2">
      {/* 🥈 Rank 2 - Silver (Left) */}
      {second ? (
        <div ref={card2Ref} className="order-2 md:order-1 bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition relative group">
          {second.cosmetics?.banner && <ProfileBanner asset={second.cosmetics.banner.asset as any} seed={second.cosmetics.banner.seed} motion="still" aspect={4} className="mb-3 h-12 rounded-lg" />}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
            <span>🥈 2nd Place</span>
          </div>

          <div className="text-center space-y-2.5 pt-2">
            <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex items-center justify-center text-xl font-black text-slate-700 shadow-inner overflow-hidden">
              <CosmeticAvatar src={second.avatar_url} name={second.display_name} frame={second.cosmetics?.frame} size="md" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {second.handle ? (
                  <Link
                    href={`/profile/${second.handle}`}
                    className="text-base font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                  >
                    @{second.handle}
                  </Link>
                ) : (
                  <span className="text-base font-black text-[var(--color-brand-brown)]">
                    <DisplayName name={second.display_name} title={second.cosmetics?.title} nameColor={second.cosmetics?.nameColor} />
                  </span>
                )}
              </div>
              {second.home_town && (
                <p className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>{second.home_town}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--color-text-muted)]">{second.quests} Eco-Quests</span>
            <span className="text-slate-800 font-black text-sm">{second.score.toLocaleString()} pts</span>
          </div>
        </div>
      ) : (
        <div className="hidden md:block order-2 md:order-1" />
      )}

      {/* 🥇 Rank 1 - Gold Champion (Center / Spotlight) */}
      <div ref={card1Ref} className="order-1 md:order-2 bg-gradient-to-b from-amber-50/90 via-white to-white rounded-2xl border-2 border-amber-300 p-6 sm:p-7 flex flex-col justify-between shadow-md hover:shadow-lg transition relative group md:-translate-y-2">
        {first.cosmetics?.banner && <ProfileBanner asset={first.cosmetics.banner.asset as any} seed={first.cosmetics.banner.seed} motion="still" aspect={4} className="mb-3 h-12 rounded-lg" />}
        <div ref={crownRef} className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 fill-current" />
          <span>1st Place Champion</span>
        </div>

        <div className="text-center space-y-3 pt-3">
          <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-amber-200 to-amber-400 border-4 border-white flex items-center justify-center text-3xl font-black text-amber-950 shadow-md overflow-hidden">
            {first.avatar_url ? (
              <img src={first.avatar_url} alt={first.display_name} className="w-full h-full object-cover" />
            ) : (
              '👑'
            )}
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {first.handle ? (
                <Link
                  href={`/profile/${first.handle}`}
                  className="text-lg sm:text-xl font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                >
                  @{first.handle}
                </Link>
              ) : (
                <span className="text-lg sm:text-xl font-black text-[var(--color-brand-brown)]">
                  <DisplayName name={first.display_name} title={first.cosmetics?.title} nameColor={first.cosmetics?.nameColor} />
                </span>
              )}
            </div>
            {first.home_town && (
              <p className="text-xs text-[var(--color-brand-primary)] font-bold flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{first.home_town}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-amber-200 flex items-center justify-between text-xs font-bold">
          <span className="text-[var(--color-text-muted)]">{first.quests} Eco-Quests</span>
          <span className="text-[var(--color-brand-primary)] font-black text-base">{first.score.toLocaleString()} pts</span>
        </div>
      </div>

      {/* 🥉 Rank 3 - Bronze (Right) */}
      {third ? (
        <div ref={card3Ref} className="order-3 md:order-3 bg-white rounded-2xl border-2 border-orange-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition relative group">
          {third.cosmetics?.banner && <ProfileBanner asset={third.cosmetics.banner.asset as any} seed={third.cosmetics.banner.seed} motion="still" aspect={4} className="mb-3 h-12 rounded-lg" />}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-orange-800 text-[11px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
            <span>🥉 3rd Place</span>
          </div>

          <div className="text-center space-y-2.5 pt-2">
            <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-orange-100 to-orange-200 border-2 border-orange-300 flex items-center justify-center text-xl font-black text-orange-800 shadow-inner overflow-hidden">
              <CosmeticAvatar src={third.avatar_url} name={third.display_name} frame={third.cosmetics?.frame} size="md" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {third.handle ? (
                  <Link
                    href={`/profile/${third.handle}`}
                    className="text-base font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                  >
                    @{third.handle}
                  </Link>
                ) : (
                  <span className="text-base font-black text-[var(--color-brand-brown)]">
                    <DisplayName name={third.display_name} title={third.cosmetics?.title} nameColor={third.cosmetics?.nameColor} />
                  </span>
                )}
              </div>
              {third.home_town && (
                <p className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-orange-600" />
                  <span>{third.home_town}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--color-text-muted)]">{third.quests} Eco-Quests</span>
            <span className="text-orange-900 font-black text-sm">{third.score.toLocaleString()} pts</span>
          </div>
        </div>
      ) : (
        <div className="hidden md:block order-3 md:order-3" />
      )}
    </section>
  );
};
