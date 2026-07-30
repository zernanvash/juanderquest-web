'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Compass,
  MapPin,
  Vote,
  ShoppingBag,
  User,
  History,
  Wallet,
  Zap,
  Sparkles,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const Navigation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { user, wallet, logout } = useAuth();

  const navItems = [
    { label: 'Quests', href: '/quests', icon: Compass },
    { label: 'Map', href: '/map', icon: MapPin },
    { label: 'Voting', href: '/vote', icon: Vote, badge: 'mJDQ' },
    { label: 'Shop', href: '/shop', icon: ShoppingBag },
    { label: 'History', href: '/history', icon: History },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  // Compute Gamified Level & XP (Level = points / 50 + 1)
  const currentPoints = user?.points ?? 120;
  const currentLevel = Math.floor(currentPoints / 50) + 1;
  const xpProgress = ((currentPoints % 50) / 50) * 100;

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col md:flex-row">
      {/* Gamified Sidebar (Desktop) */}
      <aside className="w-full md:w-64 bg-white/90 backdrop-blur-md border-r border-[#D5C4AC]/40 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-[#D5C4AC]/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gold-gradient flex items-center justify-center text-white shadow-md font-extrabold text-lg animate-float">
            JQ
          </div>
          <div>
            <h1 className="font-serif font-extrabold text-lg text-[#582F0E] leading-none">
              JuanDerQuest
            </h1>
            <span className="text-[10px] font-bold text-[#3F6653] uppercase tracking-wider flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-[#FFB703]" />
              <span>Adventure Hub</span>
            </span>
          </div>
        </div>

        {/* Gamified Level & XP Card */}
        <div className="p-4 mx-4 my-4 bg-gradient-to-br from-[#FAF9F5] to-amber-50/50 rounded-2xl border border-[#FFB703]/40 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFB703] text-[#582F0E] flex items-center justify-center font-extrabold text-xs shadow-sm">
                L{currentLevel}
              </div>
              <div>
                <div className="text-xs font-extrabold text-[#582F0E]">
                  {user ? user.displayName : 'Explorer'}
                </div>
                <div className="text-[10px] text-[#7D5800] font-bold">Level {currentLevel} Adventurer</div>
              </div>
            </div>
            <span className="text-[11px] font-extrabold text-[#7D5800]">{currentPoints} XP</span>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full h-2 bg-[#D5C4AC]/30 rounded-full overflow-hidden">
            <div
              className="h-full gold-gradient transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(10, xpProgress))}%` }}
            />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#2D6A4F] text-white shadow-md scale-[1.02]'
                    : 'text-[#582F0E] hover:bg-[#FAF9F5] hover:text-[#2D6A4F]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFB703]' : 'text-[#7D5800]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold ${
                    isActive ? 'bg-[#FFB703] text-[#582F0E]' : 'bg-[#3F6653]/15 text-[#3F6653]'
                  }`}>
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 opacity-40 ${isActive ? 'opacity-100 text-white' : ''}`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Wallet & Logout Section */}
        <div className="p-4 border-t border-[#D5C4AC]/30 space-y-2">
          <div className="p-3 bg-[#2D6A4F]/10 rounded-2xl border border-[#2D6A4F]/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#2D6A4F]" />
              <span className="font-bold text-[#582F0E]">mJDQ Coin:</span>
            </div>
            <span className="font-extrabold text-[#2D6A4F]">
              {wallet ? `${wallet.balance_mjdq} mJDQ` : '1,000 mJDQ'}
            </span>
          </div>

          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-[#BC4749] hover:bg-[#BC4749]/10 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navigation */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[#D5C4AC]/40 px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFB703]/20 text-[#7D5800] text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-[#FFB703] fill-[#FFB703]" />
              <span>Pangasinan Tourism Gamified Web</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#FAF9F5] px-3 py-1.5 rounded-full border border-[#D5C4AC]/50 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
              <span className="font-bold text-[#582F0E]">{user ? user.displayName : 'Guest Traveler'}</span>
            </div>
          </div>
        </header>

        {/* Page View */}
        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
