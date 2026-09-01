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
  Zap,
  Sparkles,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Search,
  MessageSquare,
  Flame,
  Award,
  Bell
} from 'lucide-react';
import { Footer } from '@/components/Footer';

export const Navigation: React.FC<{ children?: React.ReactNode; fullBleed?: boolean }> = ({ children, fullBleed = false }) => {

  const pathname = usePathname();
  const { user, wallet, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { label: 'Community Feed', href: '/explore', icon: Compass, flair: 'Feed' },
    { label: 'Quests & Events', href: '/quests', icon: Zap, flair: 'Bounties' },
    { label: 'Interactive Map', href: '/map', icon: MapPin },
    { label: 'Merchant Shop', href: '/shop', icon: ShoppingBag },
    { label: 'Governance DAO', href: '/vote', icon: Vote, badge: 'DAO' },
    { label: 'Leaderboard', href: '/leaderboard', icon: Award },
    { label: 'About Project', href: '/about', icon: ShieldCheck },
    { label: 'My Submissions', href: '/history', icon: History },
    { label: 'Traveler Profile', href: '/profile', icon: User },
  ];

  // Compute Gamified Level & XP (Level = points / 50 + 1)
  const currentPoints = user?.points ?? 0;
  const currentLevel = Math.floor(currentPoints / 50) + 1;
  const xpProgress = Math.min(100, Math.max(10, ((currentPoints % 50) / 50) * 100));

  // Circular progress ring calculations
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (xpProgress / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#F4F3EE] flex flex-col selection:bg-[#FFB703]/30 text-[#2B2319]">
      {/* Top Global Header Bar */}
      <header className="h-16 bg-white border-b border-[#E3DFD5] px-3 sm:px-5 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs gap-3">
        {/* Brand Logo & Sticky Search Bar (Facebook-style) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xs sm:max-w-sm md:max-w-md min-w-0">
          <Link href="/explore" className="flex items-center group shrink-0" title="JuanDerQuest">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E3DFD5] p-1.5 flex items-center justify-center shadow-xs group-hover:border-[#2D6A4F]/60 transition-colors duration-200">
              <img src="/logo.png" alt="JuanDerQuest" width="28" height="28" className="w-7 h-7 object-contain" />
            </div>
          </Link>

          {/* Sticky Facebook-style Search Bar next to logo */}
          <form action="/search" method="GET" className="flex-1 min-w-0">
            <div className="relative flex items-center w-full">
              <Search className="w-3.5 h-3.5 text-[#837560] absolute left-3 pointer-events-none" />
              <input
                type="text"
                name="q"
                placeholder="Search Pangasinan destinations..."
                className="w-full bg-[#FAF9F5] hover:bg-[#F2EFE9] focus:bg-white border border-[#E3DFD5] focus:border-[#2D6A4F] rounded-full pl-8.5 pr-3 py-1.5 text-xs text-[#2B2319] placeholder:text-[#837560] font-medium outline-none transition-all duration-200"
              />
            </div>
          </form>
        </div>

        {/* Spacious, Seamless Icon Navigation Bar (Blended White, Generous Spacing) */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 px-2 shrink-0">

          {navItems.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/explore' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#2D6A4F] text-white shadow-xs scale-105'
                    : 'text-[#6B5E4C] hover:text-[#2D6A4F] hover:bg-gray-100/60 active:scale-95'
                }`}
              >
                <Icon
                  className={`w-6 h-6 shrink-0 transition-transform duration-200 ${
                    isActive ? 'text-[#FFB703]' : ''
                  }`}
                />

                {item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FFB703] border-2 border-white shadow-xs" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Pill, Wallet & Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F]/40 transition shadow-xs"
              >
                <div className="relative w-7 h-7 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-xs font-black overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col text-left pr-1">
                  <span className="text-xs font-extrabold text-[#582F0E] leading-tight">
                    {user.displayName}
                  </span>
                  <span className="text-[10px] text-[#2D6A4F] font-bold">
                    Lvl {currentLevel} • {wallet ? `${(wallet.balanceMjdq / 1000).toFixed(0)} JDQ` : '100 JDQ'}
                  </span>
                </div>
              </Link>

              <button
                onClick={logout}
                title="Logout"
                aria-label="Log out"
                className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-[#BC4749] hover:bg-red-50 border border-transparent hover:border-red-200 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-extrabold hover:bg-[#1B4332] shadow-xs transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Connect Wallet / Login</span>
            </Link>
          )}

          {/* Mobile Drawer Trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 rounded-xl text-[#582F0E] hover:bg-[#FAF9F5] border border-[#E3DFD5]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {children && (
        <main
          className={
            fullBleed
              ? 'flex-1 w-full relative h-[calc(100dvh-64px)] overflow-hidden flex flex-col'
              : 'flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-12 lg:pb-10'
          }
        >
          {children}
        </main>
      )}

      {/* Global Footer (Rendered on standard non-fullscreen views) */}
      {!fullBleed && <Footer />}


      {/* Floating Bottom Navigation Bar (Mobile / Tablet < 1024px) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E3DFD5] px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-around"
      >
        {[
          { label: 'Explore', href: '/explore', icon: Compass },
          { label: 'Quests', href: '/quests', icon: Zap },
          { label: 'Map', href: '/map', icon: MapPin },
          { label: 'DAO', href: '/vote', icon: Vote },
          { label: 'Shop', href: '/shop', icon: ShoppingBag },
          { label: 'Profile', href: '/profile', icon: User },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/explore' && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[50px] ${
                isActive
                  ? 'text-[#2D6A4F] font-black'
                  : 'text-[#837560] hover:text-[#582F0E] font-medium'
              }`}
            >
              <div className={`p-1 rounded-xl transition ${isActive ? 'bg-[#2D6A4F]/10' : ''}`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#2D6A4F]' : 'text-[#837560]'}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="xl:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" onClick={() => setDrawerOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            className="ml-auto h-full w-[min(20rem,85vw)] bg-white p-6 shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E3DFD5] mb-5">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="JuanDerQuest" width="28" height="28" className="w-7 h-7 object-contain" />
                  <span className="font-serif font-black text-sm text-[#582F0E]">JuanDerQuest</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[#FAF9F5] text-[#582F0E]"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition ${
                        isActive
                          ? 'bg-[#2D6A4F] text-white'
                          : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.flair && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#FAF9F5] text-[#7D5800]'}`}>
                          {item.flair}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {user && (
              <div className="pt-4 border-t border-[#E3DFD5]">
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-[#BC4749] bg-red-50 hover:bg-red-100 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
