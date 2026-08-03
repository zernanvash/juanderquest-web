'use client';

import React, { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';

export const Navigation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { user, wallet, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { label: 'Quests', href: '/quests', icon: Compass },
    { label: 'Map', href: '/map', icon: MapPin },
    { label: 'Voting', href: '/vote', icon: Vote, badge: 'mJDQ' },
    { label: 'Shop', href: '/shop', icon: ShoppingBag },
    { label: 'History', href: '/history', icon: History },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  // Compute Gamified Level & XP (Level = points / 50 + 1)
  const currentPoints = user?.points ?? 0;
  const currentLevel = Math.floor(currentPoints / 50) + 1;
  const xpProgress = Math.min(100, Math.max(10, ((currentPoints % 50) / 50) * 100));

  // Circular progress ring calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (xpProgress / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col lg:flex-row">
      {/* Compact Icon-Only Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-20 bg-white/95 backdrop-blur-md border-r border-[#D5C4AC]/40 flex-col items-center py-5 shrink-0 justify-between shadow-sm">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Logo Icon */}
          <Link href="/" title="JuanDerQuest" className="hover:scale-105 transition transform">
            <img src="/logo.png" alt="JuanDerQuest" className="w-10 h-10 object-contain drop-shadow-md" />
          </Link>

          {/* Gamified Cornered Level Box with SVG Circular Progress Ring */}
          <div
            title={`Level ${currentLevel} Adventurer (${currentPoints} XP)`}
            className="relative w-14 h-14 flex items-center justify-center group cursor-pointer"
          >
            {/* SVG Circular Progress Ring */}
            <svg className="w-14 h-14 transform -rotate-90 pointer-events-none">
              <circle
                cx="28"
                cy="28"
                r={radius}
                className="stroke-[#D5C4AC]/30"
                strokeWidth="3.5"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                className="stroke-[#FFB703] transition-all duration-700 ease-out"
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Inner Cornered Box */}
            <div className="absolute inset-1.5 bg-gradient-to-br from-[#582F0E] to-[#2D6A4F] rounded-xl flex flex-col items-center justify-center text-white shadow-md group-hover:scale-105 transition">
              <span className="text-[9px] font-black uppercase tracking-tighter text-amber-200">LVL</span>
              <span className="text-xs font-black text-white leading-none">{currentLevel}</span>
            </div>
          </div>

          {/* Icon-Only Navigation Items */}
          <nav className="flex flex-col items-center gap-3 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#2D6A4F] text-[#FFB703] shadow-lg scale-105'
                      : 'text-[#582F0E] hover:bg-[#FAF9F5] hover:text-[#2D6A4F]'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-[#FFB703]' : 'text-[#582F0E] group-hover:text-[#2D6A4F]'}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FFB703] border-2 border-white" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Wallet & Logout Action */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {user && (
            <button
              onClick={logout}
              title="Logout"
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#BC4749] hover:bg-red-50 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-[#D5C4AC]/40 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          {/* Top Left Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFB703]/20 text-[#582F0E] text-xs font-black border border-[#FFB703]/30">
              <Zap className="w-4 h-4 text-[#FFB703] fill-[#FFB703]" />
              <span className="font-extrabold tracking-wide">Pangasinan Tourism Gamified Web</span>
            </div>
          </div>

          {/* Top Right User Info & Profile Badge */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-[#2D6A4F]/10 border border-[#2D6A4F]/20 text-xs shadow-sm">
                <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                <span className="font-extrabold text-[#582F0E]">{user.displayName}</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[#2D6A4F] text-white text-[10px] font-black">
                  {wallet ? `${(wallet.balanceMjdq / 1000).toFixed(1)} JDQ` : '100 JDQ'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-[#7D5800] text-xs font-bold border border-amber-200">
                <User className="w-4 h-4 text-[#FFB703]" />
                <span>Guest Traveler</span>
              </div>
            )}

            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#582F0E] hover:bg-[#FAF9F5]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav aria-label="Primary navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#D5C4AC]/50 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 max-w-xl mx-auto">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-[10px] font-extrabold ${isActive ? 'text-[#2D6A4F]' : 'text-[#837560]'}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#FFB703]' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setDrawerOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-nav-title"
            className="ml-auto h-full w-[min(20rem,85vw)] bg-white p-5 shadow-2xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 id="mobile-nav-title" className="font-serif font-extrabold text-[#582F0E]">Navigation</h2>
              <button autoFocus onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu" className="p-2 rounded-xl hover:bg-[#FAF9F5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-extrabold ${isActive ? 'bg-[#2D6A4F] text-white' : 'text-[#582F0E] hover:bg-[#FAF9F5]'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 p-3 bg-[#2D6A4F]/10 rounded-2xl text-xs font-bold break-words">
              {wallet ? `${(wallet.balanceMjdq / 1000).toFixed(1)} JDQ` : '100 JDQ'}
            </div>
            {user && (
              <button onClick={logout} className="mt-3 w-full py-3 rounded-xl text-xs font-bold text-[#BC4749] hover:bg-[#BC4749]/10">
                Logout
              </button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
