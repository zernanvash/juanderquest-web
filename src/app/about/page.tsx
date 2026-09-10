'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  ShieldCheck,
  Award,
  Users,
  MapPin,
  Sparkles,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  ExternalLink,
  ChevronRight,
  Zap,
  Vote,
  ShoppingBag
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';

export default function AboutPage() {
  const teamMembers = [
    { name: 'Ana Victoria V. Alentajan', role: 'Research & UX Architect' },
    { name: 'Zernan Vash L. Arive', role: 'Lead Full-Stack Architect' },
    { name: 'Clarissa Angel A. Gutlay', role: 'Documentation & QA Lead' },
    { name: 'Carl Jacob Lavaro', role: 'Frontend & Mobile Engineer' },
    { name: 'Alyana Soriano', role: 'Domain & Tourism Advisor' },
  ];

  const pillars = [
    {
      icon: MapPin,
      title: 'GPS Proof-of-Arrival',
      desc: 'Server-verified Haversine geolocation ensures points and civic badges are rewarded only when travelers physically visit registered landmarks.',
    },
    {
      icon: Zap,
      title: 'Anti-Overtourism Routing',
      desc: 'Dynamic crowd estimation algorithms detect peak density at popular hubs and reward travelers with point multipliers for visiting serene, hidden gems.',
    },
    {
      icon: Sparkles,
      title: 'Municipal Pre-Events',
      desc: 'Local governments lock escrow reward pools to host eco-cleanups and cultural festivals with viral social referral attribution.',
    },
    {
      icon: ShoppingBag,
      title: 'MSME Merchant Escrow',
      desc: 'Tourists redeem earned reward tokens for exclusive discounts at local Pangasinan craft salt makers, seafood grills, and artisan shops.',
    },
    {
      icon: Vote,
      title: 'Civic Governance DAO',
      desc: 'Community travelers and local stakeholders propose and vote on tourism initiatives and eco-preservation priorities.',
    },
    {
      icon: ShieldCheck,
      title: 'Authentic Heritage First',
      desc: 'Designed specifically for the municipalities of Pangasinan to celebrate cultural identity and empower local communities.',
    },
  ];

  return (
    <Navigation>
      <div className="max-w-4xl mx-auto space-y-10 pb-12">
        {/* Header Hero */}
        <div className="theme-card p-6 sm:p-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[var(--color-brand-primary)] text-xs font-semibold">
            <GraduationCap className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
            <span>Academic Capstone Research</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-brand-brown)]">
            JuanDerQuest: Gamified Tourism for Pangasinan
          </h1>

          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            A gamified system engineered to promote tourist destinations, preserve heritage, and stimulate local micro, small, and medium enterprises (MSMEs) across the province of Pangasinan.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[var(--color-brand-brown)] uppercase tracking-wider">
            System Pillars & Innovations
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div key={idx} className="theme-card p-5 space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{pillar.title}</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{pillar.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tri-Party Flywheel */}
        <div className="theme-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-brand-brown)]">The Tri-Party Tourism Flywheel</h2>
          </div>

          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            JuanDerQuest aligns incentives between three key regional stakeholders:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] space-y-1.5">
              <span className="text-xs font-bold text-[var(--color-brand-primary)] block">1. Travelers</span>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Discover curated trails, check-in for verified bounties, and redeem points for partner deals.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] space-y-1.5">
              <span className="text-xs font-bold text-[var(--color-brand-accent-dark)] block">2. MSME Merchants</span>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Gain foot traffic from verified check-ins and accept digital reward vouchers.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] space-y-1.5">
              <span className="text-xs font-bold text-[var(--color-brand-brown)] block">3. Municipal LGUs</span>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Balance tourist congestion, sponsor festivals, and gather transparent field reports.
              </p>
            </div>
          </div>
        </div>

        {/* Authors & Institutional Provenance */}
        <div className="theme-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[var(--color-brand-brown)]">Authors & Research Team</h2>
              <span className="text-xs text-[var(--color-text-muted)]">School of Information Technology Education, Universidad de Dagupan</span>
            </div>
            <span className="text-[10px] font-bold text-[var(--color-brand-primary)] bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
              Dagupan City, Pangasinan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)]">{member.name}</h4>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{member.role}</span>
                </div>
                <Users className="w-4 h-4 text-[var(--color-text-muted)]" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)]">
          <span className="text-xs text-[var(--color-text-muted)] font-medium">Ready to explore Pangasinan?</span>
          <div className="flex items-center gap-3">
            <Link
              href="/explore"
              className="theme-btn-primary"
            >
              Browse Destinations
            </Link>
            <Link
              href="/quests"
              className="theme-btn-secondary"
            >
              View Quests & Events
            </Link>
          </div>
        </div>
      </div>
    </Navigation>
  );
}
