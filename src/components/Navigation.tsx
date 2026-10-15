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
  Sparkles,
  Smartphone,
  Store,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { SearchSuggestionsDropdown } from '@/components/SearchSuggestionsDropdown';
import { useSearchPreview } from '@/lib/use-search-preview';
import { normalizeSearchQuery, isProcessableQuery } from '@/lib/search';
import { findAreaByIdOrName, areaToHref } from '@/lib/areas';
import { CelebrationEffects, triggerCelebration } from '@/components/CelebrationEffects';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { PixelSearchIcon } from '@/components/PixelIcons';
import { fetchMerchantMe, fetchMyAffiliateApplication } from '@/lib/api';

export interface NavigationNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  href: string;
  read: boolean;
  type: 'quest' | 'dao' | 'system';
}

const INITIAL_NOTIFICATIONS: NavigationNotification[] = [];

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
  const { user, logout } = useAuth();
  const adminDashboardUrl = user?.role === 'admin' ? adminHandoffUrl() : null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [isDesktopDrawerCollapsed, setIsDesktopDrawerCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NavigationNotification[]>(INITIAL_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [logoutError, setLogoutError] = useState('');
  const [rewardToast, setRewardToast] = useState<{ diff: number; total: number } | null>(null);
  const [hasMerchantOwnership, setHasMerchantOwnership] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (user) {
      fetchMerchantMe()
        .then((me) => {
          if (active && me.has_merchant) {
            setHasMerchantOwnership(true);
          }
        })
        .catch(() => {});
    } else {
      setHasMerchantOwnership(false);
    }
    return () => {
      active = false;
    };
  }, [user]);

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

  // Hydrate read notifications and desktop drawer preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('juanderquest_read_notif_ids');
      if (stored) {
        const readIds = new Set(JSON.parse(stored) as string[]);
        setNotifications((prev) =>
          prev.map((item) => (readIds.has(item.id) ? { ...item, read: true } : item))
        );
      }
      const storedNavCollapse = localStorage.getItem('juanderquest_nav_collapsed');
      if (storedNavCollapse !== null) {
        setIsDesktopDrawerCollapsed(storedNavCollapse === 'true');
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

  interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    flair?: string;
  }

  interface NavGroup {
    label?: string;
    items: NavItem[];
  }

  // Primary destinations stay unlabeled at the top; secondary areas are grouped
  // so the rail stays scannable. Only availability flair (Soon) survives.
  const navGroups: NavGroup[] = [
    {
      items: [
        { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Explore Feed', href: '/explore', icon: Compass },
        { label: 'Interactive Map', href: '/map', icon: MapPin },
        { label: 'The Trail', href: '/trail', icon: Route, flair: 'Soon' },
        { label: 'Quests', href: '/quests', icon: Zap },
        { label: 'JuanChoice', href: '/choice', icon: Award },
      ],
    },
    {
      label: 'Community',
      items: [
        { label: 'Shop', href: '/shop', icon: ShoppingBag },
        { label: 'Leaderboard', href: '/leaderboard', icon: Award },
        hasMerchantOwnership
          ? { label: 'Merchant Dashboard', href: '/merchant', icon: Store }
          : { label: 'Merchant Hub', href: '/affiliate', icon: Store },
        { label: 'About Project', href: '/about', icon: ShieldCheck },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'My Submissions', href: '/history', icon: History },
        { label: 'Explorer Settings', href: '/settings', icon: Settings },
      ],
    },
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
  const isAppWorkstation = fullBleed;

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

      {/* Compact Mobile/Tablet Top Bar (Hidden on desktop lg+) */}
      <header className="lg:hidden sticky top-0 z-40 shrink-0 h-14 bg-white/95 backdrop-blur-md border-b border-[var(--color-border-default)] px-3 sm:px-4 flex items-center justify-between shadow-xs gap-2">
        {/* Brand Logo & Title */}
        <Link href="/dashboard" className="flex items-center gap-2 group shrink-0" title="JuanDerQuest — Home">
          <div className="w-8 h-8 rounded-xl bg-white border border-[var(--color-border-default)] p-1 flex items-center justify-center shadow-xs">
            <img src="/logo.png" alt="JuanDerQuest" width="24" height="24" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-black text-sm text-[var(--color-brand-brown)] tracking-tight">
            JuanDerQuest
          </span>
        </Link>

        {/* Compact Right Actions: Search, Notifications, SidePanel */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Mobile Global Search Button */}
          <button
            type="button"
            onClick={handleOpenSearch}
            className="p-2 rounded-xl text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-center cursor-pointer transition active:scale-95 min-h-[38px] min-w-[38px]"
            aria-label="Open search"
          >
            <PixelSearchIcon className="w-4 h-4" size={18} />
          </button>

          {/* Notifications Bell */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
                setIsSearchOpen(false);
              }}
              className={`relative p-2 rounded-xl border transition cursor-pointer select-none min-h-[38px] min-w-[38px] flex items-center justify-center ${
                isNotificationsOpen
                  ? 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]'
                  : 'text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] border-[var(--color-border-default)]'
              }`}
              aria-label="Notifications and activity"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E76F51] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel (Mobile) */}
            {isNotificationsOpen && (
              <div
                role="region"
                aria-label="Notifications panel"
                className="absolute top-full mt-2 right-0 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-[var(--color-border-default)] shadow-2xl p-3 z-50 motion-overlay-enter"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-[var(--color-border-default)]">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    <span className="text-xs font-extrabold text-[var(--color-brand-brown)]">Notifications &amp; Activity</span>
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
                      <p className="text-xs font-semibold">No recent activity</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Explore Pangasinan or complete quests to see updates here.</p>
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

          {/* Mobile Navigation Drawer Trigger (all compact routes) */}
          <button
            type="button"
            onClick={() => {
              setDrawerOpen(true);
              setIsNotificationsOpen(false);
              setIsSearchOpen(false);
              setSidePanelOpen(false);
            }}
            className="p-2 rounded-xl text-[var(--color-brand-brown)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center transition active:scale-95 group"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
          >
            <Menu className="w-4 h-4 text-[var(--color-brand-primary)]" />
          </button>
        </div>

        {/* Mobile Header Bar Extended Search Mode */}
        {isSearchOpen && (
          <div
            ref={mobileSearchContainerRef}
            className="absolute inset-y-1.5 inset-x-2 flex items-center gap-2 bg-white rounded-xl border-2 border-[#2D6A4F] px-3 shadow-md z-50 animate-in fade-in duration-150"
          >
            <PixelSearchIcon className="w-4 h-4 shrink-0" size={18} />
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search places, food, tags, @scouts..."
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

            {/* Suggestions Dropdown (Mobile) */}
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
              className="absolute top-full mt-2 left-0 right-0 max-h-[calc(100dvh-5rem)]"
            />
          </div>
        )}
      </header>

      {/* Desktop Search Dialog Modal (Centered when triggered via Ctrl+K or search button) */}
      {isSearchOpen && (
        <div
          className="hidden lg:flex fixed inset-0 z-50 bg-black/40 backdrop-blur-xs items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
          onClick={handleCloseSearch}
        >
          <div
            ref={desktopSearchContainerRef}
            className="w-full max-w-2xl bg-white rounded-2xl border border-[var(--color-border-default)] shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar inside Modal */}
            <div className="relative flex items-center p-3 border-b border-[var(--color-border-default)] bg-[#FAF9F5]">
              <PixelSearchIcon
                className="w-5 h-5 absolute left-5 pointer-events-none select-none text-[#837560]"
                size={20}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search Pangasinan destinations, tags, @scouts... (ESC to close)"
                aria-label="Search destinations, areas, or scouts"
                className="w-full h-11 bg-white rounded-xl pl-12 pr-20 text-sm font-semibold outline-none border border-[#E3DFD5] focus:border-[#2D6A4F] text-[#2B2319] placeholder:text-[#837560]/70 shadow-xs"
              />
              <div className="absolute right-5 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleQueryChange('');
                      searchInputRef.current?.focus();
                    }}
                    className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer transition"
                    title="Clear query"
                    aria-label="Clear search query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200/80 text-stone-600 font-bold pointer-events-none">
                    ESC
                  </kbd>
                )}
              </div>
            </div>

            {/* Suggestions Dropdown (Desktop modal embedded) */}
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
              className="static max-h-[60vh] border-0 rounded-none shadow-none"
            />
          </div>
        </div>
      )}

      {logoutError && <p role="alert" className="z-40 bg-red-50 px-4 py-2 text-center text-sm text-red-800">{logoutError}</p>}

      {/* Desktop Main Layout with Persistent Left Sidebar Navigation */}
      <div className="flex-1 flex min-h-0 w-full relative">
        {/* Persistent Desktop Left Navigation Sidebar */}
        <aside
          aria-label="Sidebar Navigation"
          className={`hidden lg:flex flex-col shrink-0 border-r border-[var(--color-border-default)] bg-white/95 backdrop-blur-md sticky top-0 h-dvh z-30 transition-all duration-300 ease-in-out select-none ${
            isDesktopDrawerCollapsed ? 'w-[72px]' : 'w-64 xl:w-72'
          }`}
        >
          {/* Top Brand Logo & Collapse / Expand Toggle Header */}
          <div className="h-14 px-3 border-b border-[var(--color-border-default)]/60 flex items-center justify-between shrink-0">
            <Link
              href="/dashboard"
              className={`flex items-center group shrink-0 ${isDesktopDrawerCollapsed ? 'w-full justify-center' : 'gap-2.5'}`}
              title="JuanDerQuest — Home"
            >
              <div className="w-8 h-8 rounded-xl bg-white border border-[var(--color-border-default)] p-1 flex items-center justify-center shadow-xs group-hover:border-[var(--color-brand-primary)]/60 transition-colors duration-200">
                <img src="/logo.png" alt="JuanDerQuest" width="24" height="24" className="w-6 h-6 object-contain" />
              </div>
              {!isDesktopDrawerCollapsed && (
                <span className="font-black text-sm text-[var(--color-brand-brown)] tracking-tight">
                  JuanDerQuest
                </span>
              )}
            </Link>

            {!isDesktopDrawerCollapsed && (
              <button
                type="button"
                onClick={() => {
                  setIsDesktopDrawerCollapsed(true);
                  try {
                    localStorage.setItem('juanderquest_nav_collapsed', 'true');
                  } catch {}
                }}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="p-1.5 rounded-lg text-stone-500 hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-subtle)] transition cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Expand Button when Collapsed */}
          {isDesktopDrawerCollapsed && (
            <div className="py-1 flex justify-center border-b border-[var(--color-border-default)]/40">
              <button
                type="button"
                onClick={() => {
                  setIsDesktopDrawerCollapsed(false);
                  try {
                    localStorage.setItem('juanderquest_nav_collapsed', 'false');
                  } catch {}
                }}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="p-1.5 rounded-lg text-stone-500 hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-subtle)] transition cursor-pointer"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Global Search Action Row */}
          <div className="px-2 pt-2 pb-1 shrink-0">
            {!isDesktopDrawerCollapsed ? (
              <button
                type="button"
                onClick={handleOpenSearch}
                className="w-full h-9 px-3 rounded-xl bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] hover:border-[#2D6A4F]/50 flex items-center justify-between text-stone-600 transition shadow-2xs hover:shadow-xs group cursor-pointer"
                aria-label="Search destinations or scouts (Ctrl+K)"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PixelSearchIcon className="w-3.5 h-3.5 text-[#837560] group-hover:text-[#2D6A4F]" size={15} />
                  <span className="text-xs font-medium text-stone-500 group-hover:text-stone-700 truncate">
                    Search...
                  </span>
                </div>
                <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-600 font-bold shrink-0">
                  Ctrl+K
                </kbd>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenSearch}
                className="w-full h-9 rounded-xl bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] hover:border-[#2D6A4F]/50 flex items-center justify-center text-stone-600 transition shadow-2xs cursor-pointer"
                title="Search (Ctrl+K)"
                aria-label="Search"
              >
                <PixelSearchIcon className="w-4 h-4 text-[#837560]" size={17} />
              </button>
            )}
          </div>

          {/* Activity / Notifications Action Row */}
          <div className="px-2 pb-1.5 shrink-0 relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className={`w-full rounded-xl transition flex items-center cursor-pointer select-none ${
                isDesktopDrawerCollapsed
                  ? 'justify-center h-9'
                  : 'px-3 py-2 justify-between'
              } ${
                isNotificationsOpen
                  ? 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-subtle)] font-medium border border-transparent'
              }`}
              aria-label="Notifications and Activity"
              aria-expanded={isNotificationsOpen}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#E76F51]" />
                  )}
                </div>
                {!isDesktopDrawerCollapsed && (
                  <span className="text-xs font-semibold">Activity</span>
                )}
              </div>
              {!isDesktopDrawerCollapsed && unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E76F51]/15 text-[#E76F51]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Desktop Notifications Side Flyout */}
            {isNotificationsOpen && (
              <div
                role="region"
                aria-label="Activity panel"
                className="absolute top-0 left-full ml-2 w-80 bg-white rounded-2xl border border-[var(--color-border-default)] shadow-2xl p-3 z-50 motion-overlay-enter"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-default)]">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    <span className="text-xs font-extrabold text-[var(--color-brand-brown)]">Notifications &amp; Activity</span>
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
                      <p className="text-xs font-semibold">No recent activity</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Explore Pangasinan or complete quests to see updates here.</p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => handleNotificationClick(item.id)}
                        className={`flex items-start gap-2.5 py-2 px-2 rounded-xl transition ${
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
                    <span>Quests</span>
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

          {/* Navigation Links Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
            {navGroups.map((group, groupIndex) => (
              <div
                key={group.label ?? `primary-${groupIndex}`}
                className={groupIndex > 0 ? 'mt-3 border-t border-[var(--color-border-default)]/50 pt-2' : ''}
              >
                {group.label && !isDesktopDrawerCollapsed && (
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard' || pathname === '/'
                        : pathname === item.href || (item.href !== '/explore' && pathname.startsWith(`${item.href}/`));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={isDesktopDrawerCollapsed ? item.label : undefined}
                        aria-label={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group relative flex items-center rounded-xl transition-all duration-150 cursor-pointer ${
                          isDesktopDrawerCollapsed
                            ? 'justify-center h-11 w-full'
                            : 'px-3 py-2.5 gap-3'
                        } ${
                          isActive
                            ? 'bg-[var(--color-brand-primary)] text-white shadow-xs font-bold'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-bg-subtle)] font-medium'
                        }`}
                      >
                        <Icon
                          className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                            isDesktopDrawerCollapsed ? 'w-5 h-5' : 'w-4 h-4'
                          } ${
                            isActive ? 'text-[var(--color-brand-accent)]' : 'text-stone-500 group-hover:text-[var(--color-brand-primary)]'
                          }`}
                        />

                        {!isDesktopDrawerCollapsed && (
                          <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                            <span className="text-xs truncate">{item.label}</span>
                            {item.flair && (
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0 ${
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[var(--color-bg-subtle)] text-[var(--color-brand-brown)] border border-[var(--color-border-default)]'
                                }`}
                              >
                                {item.flair}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Active Indicator Strip when collapsed */}
                        {isDesktopDrawerCollapsed && isActive && (
                          <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[var(--color-brand-accent)]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Drawer Footer / Single compact identity + progress block */}
          <div className="p-2 border-t border-[var(--color-border-default)]/60 bg-[var(--color-bg-subtle)]/40 shrink-0">
            {user ? (
              <Link
                href={userProfileHref}
                className={`rounded-xl border border-[var(--color-border-default)] bg-white/80 hover:border-[var(--color-brand-primary)]/40 transition group ${
                  isDesktopDrawerCollapsed ? 'flex justify-center p-1.5' : 'block px-2.5 py-2'
                }`}
                title={isDesktopDrawerCollapsed ? `${user.displayName} · Level ${currentLevel}` : undefined}
                aria-label="View your traveler passport"
              >
                <div className={`flex items-center ${isDesktopDrawerCollapsed ? '' : 'gap-2.5'}`}>
                  <div className="relative w-8 h-8 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center text-xs font-black overflow-hidden shrink-0 shadow-xs">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {!isDesktopDrawerCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] truncate">
                        {user.displayName}
                      </p>
                      <p className="text-[10px] text-[var(--color-brand-primary)] font-semibold truncate">
                        Level {currentLevel} · {currentPoints.toLocaleString()} XP
                      </p>
                    </div>
                  )}
                  {!isDesktopDrawerCollapsed && (
                    <ChevronRight className="w-4 h-4 shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-primary)] transition" aria-hidden="true" />
                  )}
                </div>
                {!isDesktopDrawerCollapsed && (
                  <>
                    <div
                      className="mt-2 h-1.5 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden"
                      role="progressbar"
                      aria-label={`Progress to level ${currentLevel + 1}`}
                      aria-valuemin={0}
                      aria-valuemax={50}
                      aria-valuenow={currentPoints % 50}
                    >
                      <div className="h-full rounded-full bg-[var(--color-brand-accent)] transition-[width] duration-500" style={{ width: `${((currentPoints % 50) / 50) * 100}%` }} />
                    </div>
                    <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
                      {50 - (currentPoints % 50)} XP to Level {currentLevel + 1}
                    </p>
                  </>
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className={`flex items-center justify-center rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-bold transition hover:bg-[var(--color-brand-primary-hover)] ${
                  isDesktopDrawerCollapsed ? 'h-9 w-full' : 'py-2 px-3 gap-2'
                }`}
                title={isDesktopDrawerCollapsed ? 'Connect Wallet / Login' : undefined}
              >
                <User className="w-4 h-4 shrink-0" />
                {!isDesktopDrawerCollapsed && <span>Login</span>}
              </Link>
            )}
          </div>
        </aside>

        {/* Content Viewport Container */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Main Content Area with Skip Link Target */}
          {children && (
            <main
              key={pathname}
              id="main-content"
              tabIndex={-1}
              className={
                fullBleed
                  ? 'flex-none min-h-0 w-full relative h-dvh max-h-dvh overflow-hidden flex flex-col focus:outline-none'
                  : theater
                  ? 'flex-1 w-full min-h-0 pb-20 lg:pb-12 focus:outline-none motion-page-enter'
                  : isExplore
                  ? 'w-full flex-1 min-h-0 px-2 sm:px-3 py-2 lg:flex-none lg:h-dvh lg:max-h-dvh lg:overflow-hidden focus:outline-none motion-page-enter'
                  : 'flex-1 w-full max-w-7xl 2xl:max-w-[1560px] 3xl:max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-20 lg:pb-10 focus:outline-none motion-page-enter'
              }
            >
              {children}
            </main>
          )}

          {/* Global Footer (Rendered on standard non-fullscreen views) */}
          {!fullBleed && !isExplore && <Footer />}
        </div>
      </div>

      {/* Floating Bottom Navigation Bar (5 primary tabs: Home, Explore, Map, Quests, Profile) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--color-border-default)] px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(43,35,25,0.06)] flex items-center justify-around gap-0.5"
      >
        {[
          { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Explore', href: '/explore', icon: Compass },
          { label: 'Map', href: '/map', icon: MapPin },
          { label: 'Quests', href: '/quests', icon: Zap },
          { label: 'Profile', href: userProfileHref, icon: User },
        ].map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard' || pathname === '/'
              : item.label === 'Profile'
              ? pathname === '/profile' || pathname.startsWith('/profile/')
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
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
      </nav>

      {/* Accessible Mobile Drawer */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            id="mobile-nav-drawer"
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
                        {user.handle ? `@${user.handle.replace(/^@/, '')}` : 'Traveler'}
                      </div>
                    </div>
                  </Link>
                  <div className="mt-2.5 pt-2 border-t border-[var(--color-border-default)]/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--color-brand-primary)]">
                      Level {currentLevel}
                    </span>
                    <span className="font-extrabold text-[var(--color-brand-brown)]">
                      {currentPoints.toLocaleString()} XP
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

              {sidePanel && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setSidePanelOpen(true);
                  }}
                  className="mb-4 flex w-full items-center justify-between rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2.5 text-xs font-bold text-[var(--color-brand-brown)] hover:border-[var(--color-brand-primary)]/40 transition min-h-[44px]"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-brand-accent)]" />
                    <span>{sidePanelTitle}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                </button>
              )}

              <nav aria-label="Drawer Links" className="space-y-1">
                {navGroups.map((group, groupIndex) => (
                  <div
                    key={group.label ?? `drawer-group-${groupIndex}`}
                    className={groupIndex > 0 ? 'mt-3 border-t border-[var(--color-border-default)]/50 pt-2' : ''}
                  >
                    {group.label && (
                      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        {group.label}
                      </p>
                    )}
                    <div className="space-y-1">
                      {group.items.map((item) => {
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
                    </div>
                  </div>
                ))}
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
