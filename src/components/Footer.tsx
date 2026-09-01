'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  MapPin,
  Zap,
  ShoppingBag,
  Vote,
  Award,
  ShieldCheck,
  Download,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Heart,
  PlusCircle,
  History,
  User,
  Search,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-[#E3DFD5] mt-auto text-[#514532]">
      {/* Top Banner / Mission Callout */}
      <div className="border-b border-[#E3DFD5]/60 bg-[#FAF9F5]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-[#2D6A4F] text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-[#FFB703]" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#582F0E]">
                Empowering Pangasinan Tourism & Local MSMEs
              </p>
              <p className="text-xs text-[#837560]">
                Explore hidden gems, support local merchants, and participate in civic preservation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/spots/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#1B4332] shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#FFB703]" />
              <span>Share Destination</span>
            </Link>
            <a
              href="/download/juanderquest-latest.apk"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#2D6A4F] text-[#2D6A4F] text-xs font-bold hover:bg-emerald-50/70 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get Android App</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Links Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 sm:gap-10">
          {/* Col 1 & 2: Brand & Academic Research */}
          <div className="sm:col-span-2 space-y-4">
            <Link href="/explore" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] p-1.5 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <img
                  src="/logo.png"
                  alt="JuanDerQuest"
                  width="28"
                  height="28"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <span className="font-serif font-black text-xl text-[#582F0E] tracking-tight">
                JuanDerQuest
              </span>
            </Link>

            <p className="text-xs text-[#6B5E4C] leading-relaxed max-w-sm">
              A gamified blockchain-based system promoting tourist destinations, anti-overtourism routing,
              and sustainable local commerce across the province of Pangasinan.
            </p>

            {/* Academic Attribution Badge */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5 max-w-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-[#2D6A4F] uppercase tracking-wide">
                <GraduationCap className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>Universidad de Dagupan</span>
              </div>
              <p className="text-[11px] text-[#837560] leading-snug">
                School of Information Technology Education — Capstone Research Project
              </p>
              <p className="text-[10px] text-[#A39682]">
                Authors: Alentajan, Arive, Gutlay, Lavaro, Soriano
              </p>
            </div>
          </div>

          {/* Col 3: Discover */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#582F0E]">
              Discover
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link
                  href="/explore"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <Compass className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Community Feed</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/quests"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <Zap className="w-3.5 h-3.5 text-[#FFB703]" />
                  <span>Quests & Events</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/map"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Interactive Map</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <Search className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Search Destinations</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/spots/new"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Contribute a Spot</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Ecosystem */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#582F0E]">
              Ecosystem
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link
                  href="/shop"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Merchant Vouchers</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/vote"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <Vote className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Governance DAO</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/leaderboard"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <Award className="w-3.5 h-3.5 text-[#FFB703]" />
                  <span>Scout Leaderboard</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <User className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Explorer Profile</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/history"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <History className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>My Submissions</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Platform & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#582F0E]">
              Platform
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link
                  href="/about"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>About Project</span>
                </Link>
              </li>
              <li>
                <a
                  href="https://admin.jdq.zernanvash.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <span>Admin Moderation</span>
                  <ExternalLink className="w-3 h-3 text-[#A39682]" />
                </a>
              </li>
              <li>
                <a
                  href="/download/juanderquest-latest.apk"
                  className="flex items-center gap-1.5 text-[#6B5E4C] hover:text-[#2D6A4F] transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Download APK</span>
                </a>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-[#6B5E4C] hover:text-[#2D6A4F] transition block"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[#6B5E4C] hover:text-[#2D6A4F] transition block"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Sovereignty Notice */}
        <div className="mt-10 pt-6 border-t border-[#E3DFD5] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#837560] pb-24 lg:pb-6">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 text-center sm:text-left">
            <span>© 2026 JuanDerQuest.</span>
            <span>All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <span>Crafted for Pangasinan, Philippines.</span>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF9F5] border border-[#E3DFD5]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Sovereign OSM & Valhalla Engine
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
