'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Compass,
  MapPin,
  Zap,
  ShoppingBag,
  Vote,
  User,
  LogOut,
  Menu,
  ShieldCheck,
  History,
  X,
  Search,
  Bookmark,
  Award,
  Eye,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { SearchOverlay } from '@/components/SearchOverlay';
import { EvaluatorBanner } from '@/components/EvaluatorBanner';

export const Navigation: React.FC<{ children?: React.ReactNode; fullBleed?: boolean }> = ({
  children,
  fullBleed = false,
}) => {
  const pathname = usePathname();
  const { user, wallet, logout, isPreviewActive, togglePreview } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close search overlay when pathname changes
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [pathname]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => searchInputRef.current?.focus(), 60);
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const navItems = [
    { label: 'Explore Feed', href: '/explore', icon: Compass, flair: 'Feed' },
    { label: 'Interactive Map', href: '/map', icon: MapPin },
    { label: 'Saved Places', href: '/saved', icon: Bookmark, flair: 'Logbook' },
    { label: 'Quests & Events', href: '/quests', icon: Zap, flair: 'Bounties' },
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

  return (
    <div className="min-h-screen bg-[var(--color-bg-canvas)] flex flex-col selection:bg-[var(--color-brand-accent)]/30 text-[var(--color-text-primary)]">
      <EvaluatorBanner />
      {/* Top Global Header Bar (Sticky Top) */}
      <header className="sticky top-0 z-50 shrink-0 h-16 bg-white/95 backdrop-blur-md border-b border-[var(--color-border-default)] px-3 sm:px-5 lg:px-8 flex items-center justify-between shadow-xs gap-3">
        {/* Brand Logo (Clean & Minimalist) */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/explore" className="flex items-center group shrink-0" title="JuanDerQuest — Pangasinan Exploration">
            <div className="w-10 h-10 rounded-xl bg-white border border-[var(--color-border-default)] p-1.5 flex items-center justify-center shadow-xs group-hover:border-[var(--color-brand-primary)]/60 transition-colors duration-200">
              <img src="/logo.png" alt="JuanDerQuest" width="28" height="28" className="w-7 h-7 object-contain" />
            </div>
            <span className="hidden sm:inline font-black text-sm text-[var(--color-brand-brown)] tracking-tight">
              JuanDerQuest
            </span>
          </Link>
        </div>

        {/* Spacious, Seamless Icon Navigation Bar with Minimized Expanding Search Pill (Desktop) */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex flex-1 items-center justify-center gap-1 lg:gap-2 px-2 min-w-0 max-w-3xl"
        >
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== '/explore' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center justify-center w-12 lg:w-16 h-11 rounded-xl transition-all duration-200 cursor-pointer select-none ${
                  isActive
                    ? 'bg-[var(--color-brand-primary)] text-white shadow-xs scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-subtle)] active:scale-95'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                    isActive ? 'text-[var(--color-brand-accent)]' : ''
                  }`}
                />
                {item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-brand-accent)] border-2 border-white shadow-xs" />
                )}
              </Link>
            );
          })}

          {/* Expanding Search Bar placed after tabs */}
          <div className="relative flex items-center ml-1">
            {!isSearchOpen ? (
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 60);
                }}
                className="flex items-center gap-2 h-10 px-3.5 rounded-full bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] hover:border-[#2D6A4F]/60 text-xs text-[#6B5E4C] hover:text-[#2D6A4F] font-medium transition-all duration-300 ease-out cursor-pointer shadow-2xs hover:shadow-xs group select-none active:scale-95"
                title="Search destinations (Ctrl+K)"
                aria-label="Open search dialog (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-[#837560] group-hover:text-[#2D6A4F] group-hover:scale-110 transition-all" />
                <span className="hidden lg:inline text-xs font-semibold">Search...</span>
                <kbd className="hidden xl:inline text-[9px] font-mono px-1 py-0.5 rounded bg-stone-200/70 text-stone-600 font-bold">
                  Ctrl+K
                </kbd>
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative flex items-center w-60 lg:w-80 xl:w-96 transition-all duration-300 ease-out">
                  <Search className="w-4 h-4 text-[#2D6A4F] absolute left-3.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Pangasinan spots, food, tags..."
                    aria-label="Search destinations"
                    className="w-full h-10 bg-white border-2 border-[#2D6A4F] focus:ring-4 focus:ring-[#2D6A4F]/10 rounded-full pl-10 pr-9 text-xs text-[#2B2319] placeholder:text-[#837560]/70 font-medium outline-none shadow-sm transition-all"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 w-5 h-5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer transition"
                      title="Clear query"
                      aria-label="Clear search query"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <kbd className="absolute right-3.5 text-[9px] font-mono text-stone-400 pointer-events-none uppercase font-bold">
                      ESC
                    </kbd>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-[#582F0E] flex items-center justify-center text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
                  title="Close Search (ESC)"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* User Pill, Wallet & Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Global Search Button (Always visible on mobile/tablet) */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 60);
            }}
            className="md:hidden p-2 rounded-xl text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-center cursor-pointer transition active:scale-95"
            aria-label="Open search dialog (Ctrl+K)"
          >
            <Search className="w-5 h-5 text-[var(--color-brand-primary)]" />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/50 transition shadow-xs"
                title="View explorer profile"
              >
                <div className="relative w-7 h-7 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center text-xs font-black overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col text-left pr-1">
                  <span className="text-xs font-extrabold text-[var(--color-brand-brown)] leading-tight">
                    {user.displayName}
                  </span>
                  <span className="text-[10px] text-[var(--color-brand-primary)] font-bold">
                    Lvl {currentLevel} • {wallet ? `${wallet.balanceMjdq.toLocaleString()} mJDQ` : 'Demo Explorer'}
                  </span>
                </div>
              </Link>

              <button
                onClick={logout}
                title="Logout"
                aria-label="Log out"
                className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-[#BC4749] hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-extrabold hover:bg-[var(--color-brand-primary-hover)] shadow-xs transition active:scale-95"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Connect Wallet / Login</span>
              <span className="sm:hidden">Login</span>
            </Link>
          )}

          {/* Drawer Trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 rounded-xl text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Dynamic Anywhere-Accessible Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          setSearchQuery('');
        }}
        query={searchQuery}
        setQuery={setSearchQuery}
      />

      {/* Main Content Area with Skip Link Target */}
      {children && (
        <main
          id="main-content"
          tabIndex={-1}
          className={
            fullBleed
              ? 'flex-none min-h-0 w-full relative h-[calc(100dvh-64px)] overflow-hidden flex flex-col focus:outline-none'
              : pathname === '/explore'
              ? 'w-full flex-1 min-h-0 px-2 sm:px-3 py-2 lg:flex-none lg:h-[calc(100dvh-64px)] lg:overflow-hidden focus:outline-none'
              : 'flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-20 lg:pb-10 focus:outline-none'
          }
        >
          {children}
        </main>
      )}

      {/* Global Footer (Rendered on standard non-fullscreen views) */}
      {!fullBleed && pathname !== '/explore' && <Footer />}

      {/* Floating Bottom Navigation Bar (5 Primary Destinations) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--color-border-default)] px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(43,35,25,0.06)] flex items-center justify-around"
      >
        {[
          { label: 'Explore', href: '/explore', icon: Compass },
          { label: 'Map', href: '/map', icon: MapPin },
          { label: 'Saved', href: '/saved', icon: Bookmark },
          { label: 'Quests', href: '/quests', icon: Zap },
        ].map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/explore' && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition min-w-[56px] min-h-[44px] ${
                isActive
                  ? 'text-[var(--color-brand-primary)] font-black'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-medium'
              }`}
            >
              <div className={`p-1 rounded-xl transition ${isActive ? 'bg-[var(--color-brand-primary)]/10' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-muted)]'}`} />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* 5th Bottom Item: More (opens full navigation drawer) */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open more menu"
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition min-w-[56px] min-h-[44px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-medium cursor-pointer"
        >
          <div className="p-1 rounded-xl">
            <Menu className="w-5 h-5 text-[var(--color-text-muted)]" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* Accessible Mobile Drawer */}
      {drawerOpen && (
        <div
          className="xl:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="ml-auto h-full w-[min(20rem,85vw)] bg-white p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-default)] mb-5">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="JuanDerQuest" width="28" height="28" className="w-7 h-7 object-contain" />
                  <span className="font-black text-base text-[var(--color-brand-brown)]">JuanDerQuest</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-brand-brown)] cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav aria-label="Drawer Links" className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition min-h-[44px] ${
                        isActive
                          ? 'bg-[var(--color-brand-primary)] text-white'
                          : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.flair && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-white/20 text-white' : 'bg-[var(--color-bg-subtle)] text-[var(--color-brand-accent-dark)]'
                          }`}
                        >
                          {item.flair}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
              <div className="pt-3 pb-2 border-t border-[var(--color-border-subtle)] mt-3">
                <button
                  type="button"
                  onClick={() => {
                    togglePreview();
                    setDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isPreviewActive
                      ? 'bg-amber-500/20 text-amber-900 border border-amber-500/30'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-amber-600" />
                    <span>Evaluator Mode</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800">
                    {isPreviewActive ? 'Active' : 'Off'}
                  </span>
                </button>
              </div>
            </div>

            {user && (
              <div className="pt-4 border-t border-[var(--color-border-default)]">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-[#BC4749] bg-red-50 hover:bg-red-100 transition min-h-[44px] cursor-pointer"
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
