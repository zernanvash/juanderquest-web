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
  Coins,
  LogOut,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

export const Navigation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { user, wallet, logout } = useAuth();

  const navItems = [
    { label: 'Quests Feed', href: '/quests', icon: Compass },
    { label: 'Quest Map', href: '/map', icon: MapPin },
    { label: 'Tourism Spot Voting', href: '/vote', icon: Vote, badge: 'COMMUNITY' },
    { label: 'Merchant Shop', href: '/shop', icon: ShoppingBag },
    { label: 'Submissions History', href: '/history', icon: History },
    { label: 'Traveler Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col md:flex-row">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="w-full md:w-64 bg-white border-r border-[#D5C4AC]/40 flex flex-col shrink-0">
        <div className="p-6 border-b border-[#D5C4AC]/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB703] to-[#7D5800] flex items-center justify-center text-white shadow-md font-extrabold text-lg">
            JQ
          </div>
          <div>
            <h1 className="font-serif font-extrabold text-lg text-[#582F0E] leading-none">
              JuanDerQuest
            </h1>
            <span className="text-[10px] font-bold text-[#3F6653] uppercase tracking-wider">
              Traveler Web Platform
            </span>
          </div>
        </div>

        {/* User Card */}
        {user ? (
          <div className="p-4 mx-4 my-4 bg-[#FAF9F5] rounded-2xl border border-[#D5C4AC]/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#FFB703] overflow-hidden bg-amber-100 flex items-center justify-center font-bold text-xs">
              {user.displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#582F0E] truncate">{user.displayName}</div>
              <div className="text-xs text-[#514532] truncate">{user.email}</div>
            </div>
          </div>
        ) : (
          <div className="p-4 mx-4 my-4 bg-amber-50 rounded-2xl border border-[#FFB703]/40 text-xs text-[#7D5800] font-medium">
            Demo Mode Active. Select a preset traveler on the login screen.
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition duration-150 ${
                  isActive
                    ? 'bg-[#3F6653] text-white shadow-sm'
                    : 'text-[#582F0E] hover:bg-[#EFEEEA] hover:text-[#2D6A4F]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFB703]' : 'text-[#7D5800]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                    isActive ? 'bg-[#FFB703] text-[#582F0E]' : 'bg-[#3F6653]/15 text-[#3F6653]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Wallet & Logout Section */}
        <div className="p-4 border-t border-[#D5C4AC]/30 space-y-3">
          <div className="p-3 bg-[#2D6A4F]/10 rounded-xl border border-[#2D6A4F]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#2D6A4F]" />
              <span className="text-xs font-bold text-[#582F0E]">mJDQ Wallet:</span>
            </div>
            <span className="text-xs font-extrabold text-[#2D6A4F]">
              {wallet ? `${wallet.balance_mjdq} mJDQ` : '1,000 mJDQ'}
            </span>
          </div>

          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#7D5800]" />
              <span className="text-xs font-bold text-[#582F0E]">Demo Points:</span>
            </div>
            <span className="text-xs font-extrabold text-[#7D5800]">
              {user ? `${user.points} PTS` : '120 PTS'}
            </span>
          </div>

          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-[#BC4749] bg-[#BC4749]/10 hover:bg-[#BC4749]/20 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Desktop Bar */}
        <header className="h-16 bg-white border-b border-[#D5C4AC]/40 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs text-[#837560]">
            <Sparkles className="w-4 h-4 text-[#FFB703]" />
            <span className="font-semibold">Pangasinan Tourism Gamified Platform</span>
            <span className="text-gray-300">•</span>
            <span className="text-[#3F6653] font-bold">Desktop E2E Testing Mode</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://jdq.zernanvash.dev/app-debug.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#1B4332] transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Get Android App APK</span>
            </a>
          </div>
        </header>

        {/* Page Children */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
