'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, adminHandoffUrl } from '@/lib/auth';
import {
  Compass,
  MapPin,
  Route,
  Zap,
  ShoppingBag,
  Vote,
  User,
  LogOut,
  Menu,
  ShieldCheck,
  History,
  X,
  Award,
  Bell,
  Settings,
  ChevronDown,
  Sparkles,
  Smartphone,
  Store,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { SearchSuggestionsDropdown } from '@/components/SearchSuggestionsDropdown';
import { useSearchPreview } from '@/lib/use-search-preview';
import { normalizeSearchQuery, isProcessableQuery } from '@/lib/search';
import { findAreaByIdOrName, areaToHref } from '@/lib/areas';
import { CelebrationEffects, triggerCelebration } from '@/components/CelebrationEffects';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { PixelSearchIcon } from '@/components/PixelIcons';

export interface NavigationNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  href: string;
  read: boolean;
  type: 'quest' | 'dao' | 'system';
}

const INITIAL_NOTIFICATIONS: NavigationNotification[] = [
  {
    id: 'notif-1',
    title: 'Hundred Islands Trail Quest',
    description: 'New quest active! Visit Governor Island & Quezon Island to claim 150 mJDQ.',
    time: '25m ago',
    href: '/quests',
    read: false,
    type: 'quest',
  },
  {
    id: 'notif-2',
    title: 'Community DAO Proposal #2',
    description: 'Voting is open for Bolinao Heritage Trail preservation incentives.',
    time: '3h ago',
    href: '/vote',
    read: false,
    type: 'dao',
  },
  {
    id: 'notif-3',
    title: 'Welcome to JuanDerQuest',
    description: 'Your Pangasinan explorer profile and mJDQ governance wallet are active.',
    time: '1d ago',
    href: '/profile',
    read: true,
    type: 'system',
  },
];

export const Navigation: React.FC<{
  children?: React.ReactNode;
  fullBleed?: boolean;
  theater?: boolean;
  sidePanel?: React.ReactNode;
  sidePanelTitle?: string;
}> = ({
  children,
  fullBleed = false,
  theater = false,
  sidePanel,
  sidePanelTitle = 'Highlights',
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, wallet, token, logout } = useAuth();
  const adminDashboardUrl =
    user?.role === 'admin' ? (token ? adminHandoffUrl(token) : 'https://admin.juanderquest.app') : null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NavigationNotification[]>(INITIAL_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [logoutError, setLogoutError] = useState('');
  const [rewardToast, setRewardToast] = useState<{ diff: number; total: number } | null>(null);

  useEffect(() => {
    const handleReward = (e: Event) => {
      const custom = e as CustomEvent<{ diff: number; total: number }>;
      if (custom.detail) {
        setRewardToast(custom.detail);
        triggerCelebration({ type: 'poppers', playAudio: true });
        setTimeout(() => {
          setRewardToast(null);
        }, 6000);
      }
    };
    window.addEventListener('jdq:reward-received', handleReward);
    return () => window.removeEventListener('jdq:reward-received', handleReward);
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Hydrate read notifications from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('juanderquest_read_notif_ids');
      if (stored) {
        const readIds = new Set(JSON.parse(stored) as string[]);
        setNotifications((prev) =>
          prev.map((item) => (readIds.has(item.id) ? { ...item, read: true } : item))
        );
      }
    } catch {
      // ignore localStorage parse errors
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      localStorage.setItem(
        'juanderquest_read_notif_ids',
        JSON.stringify(notifications.map((n) => n.id))
      );
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      const stored = localStorage.getItem('juanderquest_read_notif_ids');
      const readIds = new Set(stored ? (JSON.parse(stored) as string[]) : []);
      readIds.add(id);
      localStorage.setItem('juanderquest_read_notif_ids', JSON.stringify(Array.from(readIds)));
    } catch {
      // ignore
    }
    setIsNotificationsOpen(false);
  };

  const { groups, matchedAreas, loading, error, flatItems, executeSearch } = useSearchPreview(
    searchQuery,
    isSearchOpen
  );

  const handleLogout = async () => {
    setLogoutError('');
    try { await logout(); }
    catch { setLogoutError('Could not sign out. Please retry.'); }
  };

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
  }, []);

  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
    setSelectedIndex(-1);
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        searchInputRef.current?.focus();
      } else {
        mobileSearchInputRef.current?.focus();
      }
    }, 60);
  }, []);

  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    setSelectedIndex(-1);
  };

  const handleSelectChip = (chipText: string) => {
    setSearchQuery(chipText);
    setSelectedIndex(-1);
    executeSearch(chipText);
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      searchInputRef.current?.focus();
    } else {
      mobileSearchInputRef.current?.focus();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const max = flatItems.length;
        if (max === 0) return -1;
        return prev < max ? prev + 1 : 0;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const max = flatItems.length;
        if (max === 0) return -1;
        return prev > 0 ? prev - 1 : max;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const normalized = normalizeSearchQuery(searchQuery);
      if (!isProcessableQuery(normalized)) return;

      if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
        const target = flatItems[selectedIndex];
        handleCloseSearch();
        router.push(target.href);
        return;
      }

      // Smart geographic area detection (e.g. Pangasinan, Bolinao, Alaminos, Dagupan, or live OSM)
      const areaMatch =
        findAreaByIdOrName(normalized) ||
        (matchedAreas && matchedAreas.length > 0 ? matchedAreas[0] : null);
      if (areaMatch) {
        handleCloseSearch();
        router.push(areaToHref(areaMatch));
        return;
      }

      handleCloseSearch();
      router.push(`/search?q=${encodeURIComponent(normalized)}&type=all`);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (searchQuery) {
        setSearchQuery('');
        setSelectedIndex(-1);
      } else {
        handleCloseSearch();
      }
    }
  };

  // Close search, profile menu, notifications, and drawers when pathname changes
  useEffect(() => {
    handleCloseSearch();
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
    setSidePanelOpen(false);
    setDrawerOpen(false);
  }, [pathname, handleCloseSearch]);

  // Click-outside listener for search, profile menu, and notifications
  useEffect(() => {
    if (!isSearchOpen && !isProfileOpen && !isNotificationsOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (isSearchOpen) {
        const insideDesktop = desktopSearchContainerRef.current?.contains(target);
        const insideMobile = mobileSearchContainerRef.current?.contains(target);
        if (!insideDesktop && !insideMobile) {
          handleCloseSearch();
        }
      }

      if (isProfileOpen && !profileMenuRef.current?.contains(target)) {
        setIsProfileOpen(false);
      }

      if (isNotificationsOpen && !notificationsRef.current?.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isSearchOpen, isProfileOpen, isNotificationsOpen, handleCloseSearch]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpenSearch();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleOpenSearch]);

  // Close overlays on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isProfileOpen) setIsProfileOpen(false);
        if (isNotificationsOpen) setIsNotificationsOpen(false);
        if (drawerOpen) setDrawerOpen(false);
        if (sidePanelOpen) setSidePanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileOpen, isNotificationsOpen, drawerOpen, sidePanelOpen]);

  const navItems = [
    { label: 'Explore Feed', href: '/explore', icon: Compass, flair: 'Feed' },
    { label: 'Interactive Map', href: '/map', icon: MapPin },
    { label: 'The Trail', href: '/trail', icon: Route, flair: 'Soon' },
    { label: 'Quests & Events', href: '/quests', icon: Zap, flair: 'Bounties' },
    { label: 'JuanChoice', href: '/choice', icon: Award, flair: 'Free vote' },
    { label: 'Merchant Shop', href: '/shop', icon: ShoppingBag },
    { label: 'Governance DAO', href: '/vote', icon: Vote, badge: 'DAO' },
    { label: 'Leaderboard', href: '/leaderboard', icon: Award },
    { label: 'Download App', href: '/download', icon: Smartphone, flair: 'APK' },
    { label: 'Merchant Hub', href: '/affiliate', icon: Store, flair: 'Soon' },
    { label: 'About Project', href: '/about', icon: ShieldCheck },
    { label: 'My Submissions', href: '/history', icon: History },
    { label: 'Traveler Profile', href: '/profile', icon: User },
    { label: 'Explorer Settings', href: '/settings', icon: Settings },
  ];

  // Compute Gamified Level & XP (Level = points / 50 + 1)
  const currentPoints = user?.points ?? 0;
  const currentLevel = Math.floor(currentPoints / 50) + 1;

  const userProfileHref = user?.handle
    ? `/profile/${user.handle.replace(/^@/, '')}`
    : user?.seedId || user?.id
    ? `/profile/${user.seedId || user.id}`
    : '/profile';

  const isExplore = pathname === '/explore' || pathname.startsWith('/explore/');
  const isAppWorkstation = isExplore || fullBleed;

  const isPrimaryBottomTab =
    pathname === '/explore' ||
    pathname.startsWith('/explore/') ||
    pathname === '/map' ||
    pathname.startsWith('/map/') ||
    pathname === '/trail' ||
    pathname.startsWith('/trail/') ||
    pathname === '/quests' ||
    pathname.startsWith('/quests/');
  const isMenuTabActive = !isPrimaryBottomTab || drawerOpen;

  return (
    <div
      className={`min-h-screen bg-[var(--color-bg-canvas)] flex flex-col selection:bg-[var(--color-brand-accent)]/30 text-[var(--color-text-primary)] ${
        isAppWorkstation ? 'lg:h-dvh lg:max-h-dvh lg:overflow-hidden' : ''
      }`}
    >
      {/* Global Interactive Celebration & Party Poppers Engine */}
      <CelebrationEffects />

      {/* Real-time Cross-Device Reward Celebration Toast */}
      {rewardToast && (
        <aside
          aria-live="polite"
          className="fixed top-20 right-4 sm:right-8 z-50 animate-in slide-in-from-top-4 fade-in duration-300 max-w-sm w-full"
        >
          <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white p-4 sm:p-5 rounded-2xl border border-emerald-400/50 shadow-2xl flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#FFB703] animate-bounce" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  Quest Verified On Mobile!
                </span>
                <button
                  type="button"
                  onClick={() => setRewardToast(null)}
                  className="text-stone-300 hover:text-white cursor-pointer"
                  aria-label="Dismiss toast"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-white font-bold">
                +{rewardToast.diff} mJDQ Tokens Added!
              </p>
              <p className="text-[11px] text-emerald-200">
                Your new balance is {rewardToast.total.toLocaleString()} mJDQ.
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* Top Global Header Bar (Sticky Top) */}
      <header className="sticky top-0 z-50 shrink-0 h-16 bg-white/95 backdrop-blur-md border-b border-[var(--color-border-default)] px-3 sm:px-5 lg:px-8 flex items-center justify-between shadow-xs gap-3">
        {/* Brand Logo (Clean & Minimalist) */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/explore" className="flex items-center group shrink-0" title="JuanDerQuest — Explore destinations">
            <div className="w-10 h-10 rounded-xl bg-white border border-[var(--color-border-default)] p-1.5 flex items-center justify-center shadow-xs group-hover:border-[var(--color-brand-primary)]/60 transition-colors duration-200">
              <img src="/logo.png" alt="JuanDerQuest" width="28" height="28" className="w-7 h-7 object-contain" />
            </div>
            <span className="hidden sm:inline font-black text-sm text-[var(--color-brand-brown)] tracking-tight">
              JuanDerQuest
            </span>
          </Link>
        </div>

        {/* Spacious, Seamless Icon Navigation Bar with Extending Search Pill (Desktop) */}
        <nav
          aria-label="Main Navigation"
          className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-2 px-2 min-w-0 max-w-3xl"
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
                className={`relative flex items-center justify-center w-12 xl:w-16 h-11 rounded-xl transition-all duration-200 cursor-pointer select-none ${
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

          {/* Smart Global Search Bar (Desktop) */}
          <div ref={desktopSearchContainerRef} className="relative flex items-center ml-2">
            <div
              className={`relative flex items-center transition-all duration-300 ease-out ${
                isSearchOpen
                  ? 'w-72 lg:w-88 xl:w-96'
                  : 'w-52 lg:w-64 xl:w-72'
              }`}
            >
              <PixelSearchIcon
                className="w-4 h-4 absolute left-3.5 pointer-events-none select-none transition-transform duration-200"
                size={18}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (!isSearchOpen) handleOpenSearch();
                }}
                onChange={(e) => {
                  if (!isSearchOpen) setIsSearchOpen(true);
                  handleQueryChange(e.target.value);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search Pangasinan, areas, spots..."
                aria-label="Search destinations, areas, or scouts"
                className={`w-full h-10 rounded-full pl-10 pr-14 text-xs font-medium outline-none transition-all duration-200 ${
                  isSearchOpen
                    ? 'bg-white border-2 border-[#2D6A4F] text-[#2B2319] shadow-sm ring-4 ring-[#2D6A4F]/10'
                    : 'bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] hover:border-[#2D6A4F]/50 text-[#6B5E4C] placeholder:text-[#837560]/70 shadow-2xs hover:shadow-xs'
                }`}
              />

              {/* Action badges: Clear / Close / Ctrl+K badge */}
              <div className="absolute right-2.5 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleQueryChange('');
                      searchInputRef.current?.focus();
                    }}
                    className="w-5 h-5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer transition"
                    title="Clear query"
                    aria-label="Clear search query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : !isSearchOpen ? (
                  <kbd className="hidden xl:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-600 font-bold pointer-events-none">
                    Ctrl+K
                  </kbd>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseSearch}
                    className="w-5 h-5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center cursor-pointer transition"
                    title="Close search (ESC)"
                    aria-label="Close search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions Dropdown (Desktop) */}
            <SearchSuggestionsDropdown
              isOpen={isSearchOpen}
              onClose={handleCloseSearch}
              query={searchQuery}
              setQuery={setSearchQuery}
              selectedIndex={selectedIndex}
              setSelectedIndex={setSelectedIndex}
              flatItems={flatItems}
              matchedAreas={matchedAreas}
              groups={groups}
              loading={loading}
              error={error}
              onRetry={() => executeSearch(searchQuery)}
              onSelectChip={handleSelectChip}
              className="absolute top-full mt-2.5 right-0 w-[460px] lg:w-[480px] max-w-[calc(100vw-2rem)]"
            />
          </div>
        </nav>

        {/* User Pill, Wallet & Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile Global Search Button (Always visible on mobile/tablet) */}
          <button
            type="button"
            onClick={handleOpenSearch}
            className="lg:hidden p-2 rounded-xl text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-center cursor-pointer transition active:scale-95 min-h-[40px] min-w-[40px]"
            aria-label="Open search (Ctrl+K)"
          >
            <PixelSearchIcon className="w-5 h-5" size={20} />
          </button>

          {/* Notification Button (Always immediately to the left of the profile button) */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
                setIsProfileOpen(false);
                setIsSearchOpen(false);
              }}
              className={`relative p-2 rounded-xl border transition cursor-pointer select-none min-h-[40px] min-w-[40px] flex items-center justify-center ${
                isNotificationsOpen
                  ? 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]'
                  : 'text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] border-[var(--color-border-default)]'
              }`}
              aria-label="Notifications"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E76F51] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {isNotificationsOpen && (
              <div
                role="region"
                aria-label="Notifications panel"
                className="absolute top-full mt-2.5 right-0 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-[var(--color-border-default)] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-[var(--color-border-default)]">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    <span className="text-xs font-extrabold text-[var(--color-brand-brown)]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E76F51]/10 text-[#E76F51]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-bold text-[var(--color-brand-primary)] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="divide-y divide-[var(--color-border-default)]/60 max-h-72 overflow-y-auto my-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-stone-400">
                      <Bell className="w-6 h-6 mx-auto mb-1 text-stone-300" />
                      <p className="text-xs font-semibold">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => handleNotificationClick(item.id)}
                        className={`flex items-start gap-2.5 py-2.5 px-2 rounded-xl transition ${
                          item.read
                            ? 'hover:bg-[var(--color-bg-subtle)] opacity-75'
                            : 'bg-emerald-50/40 hover:bg-emerald-50/70 font-medium'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center shrink-0 mt-0.5">
                          {item.type === 'quest' && <Zap className="w-3.5 h-3.5 text-amber-600" />}
                          {item.type === 'dao' && <Vote className="w-3.5 h-3.5 text-emerald-700" />}
                          {item.type === 'system' && <Compass className="w-3.5 h-3.5 text-stone-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-[var(--color-brand-brown)] truncate">
                              {item.title}
                            </span>
                            {!item.read && <span className="w-2 h-2 rounded-full bg-[#E76F51] shrink-0" />}
                          </div>
                          <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 mt-0.5 leading-tight">
                            {item.description}
                          </p>
                          <span className="text-[9px] text-stone-400 block mt-1 font-mono">{item.time}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--color-border-default)] flex items-center justify-between text-[11px]">
                  <Link
                    href="/quests"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs font-bold text-[var(--color-brand-primary)] hover:underline flex items-center gap-1"
                  >
                    <span>View all quests</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-[10px] text-stone-400 hover:text-stone-700"
                  >
                    Settings
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Trigger: On mobile, direct link to traveler passport (no dropdown). On desktop, expandable dropdown with full page directory */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              {/* Mobile Direct Profile Link (Navigates directly to profile, avoiding dropdown on mobile) */}
              <Link
                href={userProfileHref}
                className="lg:hidden flex items-center justify-center p-1 rounded-2xl border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/50 bg-[var(--color-bg-subtle)] transition shadow-xs active:scale-95 min-h-[40px] min-w-[40px]"
                aria-label="View your traveler passport"
                title="View your profile"
              >
                <div className="relative w-7 h-7 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center text-xs font-black overflow-hidden shrink-0 shadow-xs">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </Link>

              {/* Desktop Expandable Profile Button */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen((prev) => !prev);
                  setIsNotificationsOpen(false);
                  setIsSearchOpen(false);
                }}
                className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition shadow-xs cursor-pointer select-none group min-h-[40px] ${
                  isProfileOpen
                    ? 'bg-[var(--color-brand-primary)]/10 border-[var(--color-brand-primary)]'
                    : 'bg-[var(--color-bg-subtle)] border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/50'
                }`}
                aria-expanded={isProfileOpen}
                aria-haspopup="menu"
                aria-label="User account menu"
              >
                <div className="relative w-7 h-7 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center text-xs font-black overflow-hidden shrink-0 shadow-xs">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col text-left pr-0.5">
                  <span className="text-xs font-extrabold text-[var(--color-brand-brown)] leading-tight group-hover:text-[var(--color-brand-primary)] transition max-w-[120px] truncate">
                    {user.displayName}
                  </span>
                  <span className="text-[10px] text-[var(--color-brand-primary)] font-bold">
                    Lvl {currentLevel} • {wallet ? <><AnimatedCounter value={wallet.balanceMjdq} /> mJDQ</> : 'Demo Explorer'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 transition-transform duration-200 ${
                    isProfileOpen ? 'rotate-180 text-[var(--color-brand-primary)]' : ''
                  }`}
                />
              </button>

              {/* Desktop Profile Panel with Full Pages Directory (like the mobile hamburger menu) */}
              {isProfileOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="hidden lg:block absolute top-full mt-2.5 right-0 w-80 max-h-[85vh] overflow-y-auto bg-white rounded-2xl border border-[var(--color-border-default)] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* User Identity Header Card */}
                  <Link
                    href={userProfileHref}
                    onClick={() => setIsProfileOpen(false)}
                    className="block p-2.5 rounded-xl bg-[var(--color-bg-subtle)]/70 hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]/60 mb-2 transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-9 h-9 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center text-sm font-black overflow-hidden shrink-0 shadow-xs">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{user.displayName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="text-xs font-extrabold text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition truncate">
                            {user.displayName}
                          </div>
                          {user.role === 'admin' && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 border border-amber-500/30 shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] truncate font-mono">
                          {user.seedId || 'demo-traveler'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[var(--color-border-default)]/50 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[var(--color-brand-primary)]">
                        Level {currentLevel}
                      </span>
                      <span className="font-extrabold text-[var(--color-brand-brown)]">
                        {wallet ? `${wallet.balanceMjdq.toLocaleString()} mJDQ` : '500 mJDQ'}
                      </span>
                    </div>
                  </Link>

                  {/* Account Quick Links */}
                  <div className="space-y-0.5 mb-2">
                    {adminDashboardUrl && (
                      <a
                        href={adminDashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="menuitem"
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition mb-1"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <span>Admin Control Room</span>
                        </div>
                        <span className="text-[10px] text-amber-700 font-extrabold uppercase">
                          Launch ↗
                        </span>
                      </a>
                    )}
                    <Link
                      href={userProfileHref}
                      onClick={() => setIsProfileOpen(false)}
                      role="menuitem"
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-brand-primary)] transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <span>Traveler Profile</span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-normal">Passport →</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      role="menuitem"
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-brand-primary)] transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                          <Settings className="w-4 h-4" />
                        </div>
                        <span>Explorer Settings</span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-normal">Preferences →</span>
                    </Link>
                  </div>

                  {/* Explorer Directory Section (like the mobile hamburger menu) */}
                  <div className="pt-2 pb-1 border-t border-[var(--color-border-default)]">
                    <div className="px-2.5 pb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-brand-accent-dark)]">
                        Explorer Directory
                      </span>
                      <span className="text-[9px] font-bold text-[var(--color-text-muted)]">Pages</span>
                    </div>

                    <div className="space-y-0.5">
                      {[
                        { label: 'Merchant Voucher Shop', href: '/shop', icon: ShoppingBag, flair: 'Rewards' },
                        { label: 'Merchant Hub', href: '/affiliate', icon: Store, flair: 'Soon' },
                        { label: 'Governance DAO', href: '/vote', icon: Vote, flair: 'mJDQ' },
                        { label: 'Hall of Scouts', href: '/leaderboard', icon: Award, flair: 'Rankings' },
                        { label: 'JuanChoice Voting', href: '/choice', icon: Award, flair: 'Free vote' },
                        { label: 'My Submissions', href: '/history', icon: History, flair: 'Proofs' },
                        { label: 'About Project', href: '/about', icon: ShieldCheck, flair: 'Story' },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsProfileOpen(false)}
                            role="menuitem"
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                              isActive
                                ? 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]'
                                : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-[var(--color-brand-primary)] text-white' : 'bg-stone-100 text-stone-600'
                              }`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span>{item.label}</span>
                            </div>
                            {item.flair && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-brand-accent-dark)]">
                                {item.flair}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Log Out */}
                  <div className="pt-1.5 border-t border-[var(--color-border-default)]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        void handleLogout();
                      }}
                      role="menuitem"
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[#BC4749] hover:bg-red-50 hover:text-red-700 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-red-100/70 text-[#BC4749] flex items-center justify-center shrink-0">
                          <LogOut className="w-3.5 h-3.5" />
                        </div>
                        <span>Log Out</span>
                      </div>
                      <span className="text-[10px] text-red-400 font-normal">End session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-extrabold hover:bg-[var(--color-brand-primary-hover)] shadow-xs transition active:scale-95 min-h-[40px]"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Connect Wallet / Login</span>
              <span className="sm:hidden">Login</span>
            </Link>
          )}

          {/* Mobile Page Side-Panel Trigger (Exclusive to mobile when active page provides side panels) */}
          {sidePanel && (
            <button
              type="button"
              onClick={() => {
                setSidePanelOpen(true);
                setIsProfileOpen(false);
                setIsNotificationsOpen(false);
                setIsSearchOpen(false);
              }}
              className="lg:hidden relative p-2 rounded-xl text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center transition active:scale-95 group"
              aria-label={`Open ${sidePanelTitle}`}
              title={`Open ${sidePanelTitle}`}
            >
              <Menu className="w-5 h-5 text-[var(--color-brand-primary)]" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FFB703] border-2 border-white shadow-xs animate-pulse" />
            </button>
          )}
        </div>

        {/* Mobile Header Bar Extended Search Mode (Extends directly across top bar) */}
        {isSearchOpen && (
          <div
            ref={mobileSearchContainerRef}
            className="lg:hidden absolute inset-y-2 inset-x-2 sm:inset-x-4 flex items-center gap-2 bg-white rounded-2xl border-2 border-[#2D6A4F] px-3 shadow-md z-50 animate-in fade-in duration-200"
          >
            <PixelSearchIcon className="w-5 h-5 shrink-0" size={20} />
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search places, food, tags, @users..."
              aria-label="Search destinations, users or quests"
              className="flex-1 bg-transparent text-xs sm:text-sm font-semibold text-[#2C221E] placeholder:text-[#837560]/70 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                className="w-5 h-5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer transition"
                title="Clear query"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseSearch}
              className="text-xs font-bold text-[#582F0E] hover:text-[#2D6A4F] px-2 py-1 rounded-lg transition active:scale-95 cursor-pointer"
            >
              Cancel
            </button>

            {/* Suggestions Dropdown (Mobile - attached directly to the bottom of the mobile top bar) */}
            <SearchSuggestionsDropdown
              isOpen={isSearchOpen}
              onClose={handleCloseSearch}
              query={searchQuery}
              setQuery={setSearchQuery}
              selectedIndex={selectedIndex}
              setSelectedIndex={setSelectedIndex}
              flatItems={flatItems}
              matchedAreas={matchedAreas}
              groups={groups}
              loading={loading}
              error={error}
              onRetry={() => executeSearch(searchQuery)}
              onSelectChip={handleSelectChip}
              className="absolute top-full mt-2 left-0 right-0 max-h-[calc(100dvh-5.5rem)]"
            />
          </div>
        )}
      </header>

      {/* Subtle Backdrop Scrim for Focus & Click-Outside (renders below the sticky top bar) */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/20 backdrop-blur-[1px] z-40 transition-opacity animate-in fade-in duration-150"
          onClick={handleCloseSearch}
          aria-hidden="true"
        />
      )}

      {logoutError && <p role="alert" className="z-40 bg-red-50 px-4 py-2 text-center text-sm text-red-800">{logoutError}</p>}

      {/* Main Content Area with Skip Link Target */}
      {children && (
        <main
          id="main-content"
          tabIndex={-1}
          className={
            fullBleed
              ? 'flex-none min-h-0 w-full relative h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] overflow-hidden flex flex-col focus:outline-none'
              : theater
              ? 'flex-1 w-full min-h-0 pb-20 lg:pb-12 focus:outline-none'
              : isExplore
              ? 'w-full flex-1 min-h-0 px-2 sm:px-3 py-2 lg:flex-none lg:h-[calc(100dvh-64px)] lg:max-h-[calc(100dvh-64px)] lg:overflow-hidden focus:outline-none'
              : 'flex-1 w-full max-w-7xl 2xl:max-w-[1560px] 3xl:max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-20 lg:pb-10 focus:outline-none'
          }
        >
          {children}
        </main>
      )}

      {/* Global Footer (Rendered on standard non-fullscreen views) */}
      {!fullBleed && !isExplore && <Footer />}

      {/* Floating Bottom Navigation Bar (4 primary destinations plus More) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--color-border-default)] px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(43,35,25,0.06)] flex items-center justify-around gap-0.5"
      >
        {[
          { label: 'Explore', href: '/explore', icon: Compass },
          { label: 'Map', href: '/map', icon: MapPin },
          { label: 'Trail', href: '/trail', icon: Route },
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
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition min-h-[44px] ${
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

        {/* Menu opens the full navigation drawer */}
        <button
          type="button"
          onClick={() => {
            setSidePanelOpen(false);
            setDrawerOpen((prev) => !prev);
          }}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition min-h-[44px] cursor-pointer ${
            isMenuTabActive
              ? 'text-[var(--color-brand-primary)] font-black'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${isMenuTabActive ? 'bg-[var(--color-brand-primary)]/10' : ''}`}>
            <Menu className={`w-5 h-5 ${isMenuTabActive ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-muted)]'}`} />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </nav>

      {/* Accessible Mobile Drawer */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="ml-auto h-full w-[min(20rem,85vw)] bg-white p-5 sm:p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-[var(--color-border-default)] mb-4">
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

              {/* Mobile Passport Card / Login Card */}
              {user ? (
                <div className="mb-4 p-3 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] shadow-2xs">
                  <Link
                    href={userProfileHref}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2.5 group"
                  >
                    <div className="relative w-10 h-10 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center text-sm font-black overflow-hidden shrink-0 shadow-xs">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{user.displayName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="text-xs font-extrabold text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition truncate">
                          {user.displayName}
                        </div>
                        {user.role === 'admin' && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 border border-amber-500/30 shrink-0">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)] truncate font-mono">
                        {user.seedId || 'demo-traveler'}
                      </div>
                    </div>
                  </Link>
                  <div className="mt-2.5 pt-2 border-t border-[var(--color-border-default)]/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--color-brand-primary)]">
                      Level {currentLevel}
                    </span>
                    <span className="font-extrabold text-[var(--color-brand-brown)]">
                      {wallet ? `${wallet.balanceMjdq.toLocaleString()} mJDQ` : '500 mJDQ'}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[var(--color-border-default)]/40 flex items-center justify-between text-[11px]">
                    <Link
                      href={userProfileHref}
                      onClick={() => setDrawerOpen(false)}
                      className="text-[var(--color-brand-primary)] hover:underline font-bold flex items-center gap-1"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Passport</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setDrawerOpen(false)}
                      className="text-[var(--color-brand-brown)] hover:text-[var(--color-brand-primary)] font-bold flex items-center gap-1"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Settings</span>
                    </Link>
                  </div>
                  {adminDashboardUrl && (
                    <div className="mt-2 pt-2 border-t border-[var(--color-border-default)]/40">
                      <a
                        href={adminDashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-extrabold text-amber-900 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-700" />
                          <span>Admin Control Room</span>
                        </div>
                        <span className="text-[10px] text-amber-700 font-extrabold uppercase">Launch ↗</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
                  <p className="text-xs text-[var(--color-brand-brown)] font-medium mb-2.5">
                    Connect wallet or sign in to save badges and Pangasinan quests.
                  </p>
                  <Link
                    href="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-bold hover:bg-[var(--color-brand-primary-hover)] transition"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Connect / Sign In</span>
                  </Link>
                </div>
              )}

              <nav aria-label="Drawer Links" className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/explore'
                      ? pathname === '/explore'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const targetHref = item.href === '/profile' ? userProfileHref : item.href;
                  return (
                    <Link
                      key={item.href}
                      href={targetHref}
                      onClick={() => setDrawerOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition min-h-[44px] ${
                        isActive
                          ? 'bg-[var(--color-brand-primary)] text-white'
                          : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
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
            </div>

            {user && (
              <div className="pt-4 border-t border-[var(--color-border-default)] mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    void handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-[#BC4749] bg-red-50 hover:bg-red-100 transition min-h-[44px] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Accessible Mobile Page Side-Panel Drawer */}
      {sidePanel && sidePanelOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSidePanelOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={sidePanelTitle}
            className="ml-auto h-full w-[min(22rem,88vw)] bg-white p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-[var(--color-border-default)] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[var(--color-brand-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[var(--color-brand-brown)] leading-tight">
                      {sidePanelTitle}
                    </h3>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Page Discovery &amp; Shortcuts</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSidePanelOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-bg-subtle)] text-[var(--color-brand-brown)] cursor-pointer"
                  aria-label="Close side panels"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Container with Page Side Panels */}
              <div className="space-y-4 pb-12">
                {sidePanel}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
