'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { triggerTaskCompletion } from '@/lib/gamification';

export interface NavItem {
  label: string;
  href: string;
  iconSrc?: string;
  hoverIconSrc?: string;
  fallbackIconSrc?: string;
  iconEmoji?: string;
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    iconSrc: '/icons/nav-overview.png',
  },
  {
    label: 'Explore',
    href: '/explore',
    iconSrc: '/icons/nav-explore.png',
    fallbackIconSrc: '/icons/search.png',
  },
  {
    label: 'Interactive Map',
    href: '/map',
    iconSrc: '/icons/nav-map.png',
    fallbackIconSrc: '/globe.svg',
  },
  {
    label: 'Quest',
    href: '/quests',
    iconSrc: '/icons/nav-quest.png',
  },
  {
    label: 'JuanChoice',
    href: '/choice',
    iconSrc: '/icons/juanchoice.png',
    hoverIconSrc: '/icons/juanchoice-hover.png',
  },
  {
    label: 'Plaza',
    href: '/plaza',
    iconSrc: '/icons/plaza.png',
  },
  {
    label: 'Shop',
    href: '/shop',
    iconSrc: '/icons/nav-shop.png',
  },
  {
    label: 'Explorer Profile',
    href: '/profile',
  },
  {
    label: 'About Project',
    href: '/about',
    iconSrc: '/icons/nav-about.png',
  },
  {
    label: 'Settings',
    href: '/settings',
    iconSrc: '/icons/nav-settings.png?v=2',
  },
];

export const ECO_TIPS = [
  'Plant more native mangroves in Bani to increase your Island Eco-Rating to 5 stars! 🌿',
  'Always pack out all trash when hopping across Hundred Islands. Keep marine sanctuaries pristine! 🐢',
  'Support verified Pangasinan MSMEs in Dagupan and Alaminos to boost local community livelihoods! 🐟',
  'Take only photos and leave only footprints along Bolinao and Patar white sand beaches. 🏖️',
  'Respect coral reefs: Use reef-safe sunscreen when swimming around Governor’s Island! 🐠',
  'Choose local eco-certified boats at Lucap Wharf for lower carbon coastal navigation. ⛵',
];

export function isRouteActive(href: string, pathname: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/' || pathname === '/dashboard/cozy';
  }
  if (href === '/explore') {
    return pathname === '/explore' || pathname.startsWith('/explore/') || pathname.startsWith('/spots');
  }
  if (href === '/map') {
    return pathname === '/map' || pathname.startsWith('/map/') || pathname.startsWith('/navigate');
  }
  if (href === '/quests' || href === '/quest') {
    return (
      pathname === '/quests' ||
      pathname.startsWith('/quests/') ||
      pathname === '/quest' ||
      pathname.startsWith('/quest/') ||
      pathname.startsWith('/trail') ||
      pathname.startsWith('/campaigns')
    );
  }
  if (href === '/choice' || href === '/juanchoice' || href === '/community-choice') {
    return (
      pathname === '/choice' ||
      pathname.startsWith('/choice/') ||
      pathname === '/juanchoice' ||
      pathname.startsWith('/juanchoice/') ||
      pathname === '/community-choice' ||
      pathname.startsWith('/community-choice') ||
      pathname.startsWith('/vote')
    );
  }
  if (href === '/shop') {
    return pathname === '/shop' || pathname.startsWith('/shop/');
  }
  if (href === '/about') {
    return pathname === '/about' || pathname.startsWith('/about/');
  }
  if (href === '/profile') {
    return pathname === '/profile' || pathname.startsWith('/profile/');
  }
  if (href === '/settings') {
    return pathname === '/settings' || pathname.startsWith('/settings/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface CozySidebarProps {
  isSidebarCollapsed: boolean;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
}

export function CozySidebar({ isSidebarCollapsed, onSidebarCollapsedChange }: CozySidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [selectedTipIndex, setSelectedTipIndex] = useState(0);

  const toggleSidebar = () => {
    const next = !isSidebarCollapsed;
    try {
      localStorage.setItem('juander_sidebar_collapsed', String(next));
    } catch {
      // Ignore storage errors
    }
    onSidebarCollapsedChange(next);
  };

  const handleNextTip = () => {
    setSelectedTipIndex((prev) => (prev + 1) % ECO_TIPS.length);
    triggerTaskCompletion('daily_tip');
  };

  return (
    <>
      {isSidebarCollapsed ? (
        /* --------------------------------------------------------- */
        /* COLLAPSED RAIL SIDEBAR (Same dark green color as expanded) */
        /* --------------------------------------------------------- */
        <aside className="self-start shrink-0 flex flex-col items-center bg-[#244E36] border-2 border-[#1B3F2B] text-[#E0EEDF] rounded-3xl py-4 px-2 shadow-xl transition-all duration-300 w-full md:w-[72px] md:sticky md:top-6 gap-3 z-30">
          {/* Top Section: Logo & Toggle */}
          <div className="flex flex-row md:flex-col items-center gap-2 w-full justify-between md:justify-start">
            {/* JuanDer Mascot Logo */}
            <Link
              href="/dashboard"
              title="JuanDer Without Limits — Island Hub"
              className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#306346] bg-[#FAF7F0] flex items-center justify-center shadow-xs hover:scale-105 transition-all"
            >
              <Image
                src="/cozy/juander_mascot.jpg"
                alt="JuanDer Mascot Logo"
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            </Link>

            {/* Horizontal Divider (desktop only) */}
            <div className="hidden md:block w-8 h-px bg-[#1B3F2B] my-1" />

            {/* Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
              className="w-10 h-10 rounded-full bg-[#1B3F2B] hover:bg-[#2F6144] text-[#E0EEDF] flex items-center justify-center border border-[#306346] shadow-xs transition-all hover:scale-110 active:scale-95 cursor-pointer"
            >
              <svg
                className="w-5 h-5 text-[#E0EEDF]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
                <path d="M9 3.5v17" />
                <path d="M12 9.5l3 2.5-3 2.5" />
              </svg>
            </button>

            {/* Horizontal Divider (desktop only) */}
            <div className="hidden md:block w-8 h-px bg-[#1B3F2B] my-1" />
          </div>

          {/* Middle Section: Vertical Icons for the 8 requested items */}
          <nav className="flex flex-row md:flex-col items-center gap-2 my-2 overflow-x-auto md:overflow-visible w-full justify-center">
            {SIDEBAR_NAV_ITEMS.map((item, idx) => {
              const isActive = isRouteActive(item.href, pathname);

              return (
                <Link
                  key={idx}
                  href={item.href}
                  title={item.label}
                  className={`group relative flex items-center justify-center transition-all shrink-0 ${
                    isActive
                      ? 'w-11 h-11 rounded-full bg-[#FAF7F0] text-[#1F452C] shadow-md scale-105'
                      : 'w-10 h-10 rounded-xl hover:bg-[#2C5E42] text-[#DCE8DC] hover:text-white hover:scale-105'
                  }`}
                >
                  <div className="relative w-6 h-6 flex items-center justify-center pointer-events-none select-none">
                    {item.iconEmoji ? (
                      <span className="text-xl leading-none" aria-hidden="true">{item.iconEmoji}</span>
                    ) : item.iconSrc ? (
                      <Image
                        src={item.iconSrc}
                        alt={item.label}
                        width={20}
                        height={20}
                        unoptimized
                        className={`pixel-art w-5 h-5 object-contain transition-opacity duration-150 ${
                          item.hoverIconSrc ? 'group-hover:opacity-0' : ''
                        }`}
                      />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-gradient-to-br from-amber-400 to-amber-500 text-[10px] font-black text-stone-900">
                        {user?.name?.[0]?.toUpperCase() || 'J'}
                      </span>
                    )}
                    {item.hoverIconSrc && (
                      <Image
                        src={item.hoverIconSrc}
                        alt={`${item.label} hover`}
                        width={20}
                        height={20}
                        unoptimized
                        className="pixel-art w-5 h-5 object-contain absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

        </aside>
      ) : (
        /* --------------------------------------------------------- */
        /* EXPANDED FULL SIDEBAR (Matching Animal Crossing Sherwood) */
        /* --------------------------------------------------------- */
        <aside className="self-start w-full md:w-56 lg:w-64 shrink-0 bg-[#244E36] rounded-3xl p-3 sm:p-3.5 shadow-xl border-2 border-[#1B3F2B] text-[#E0EEDF] flex flex-col transition-all duration-300 relative md:sticky md:top-6 gap-3.5 z-30">
          {/* Top Bar with Center Leaf & Collapse Toggle Button */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xl drop-shadow-xs">🍃</span>
              <button
                type="button"
                onClick={toggleSidebar}
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
                className="w-7 h-7 rounded-full bg-[#1B3F2B] hover:bg-[#2F6144] text-[#E0EEDF] flex items-center justify-center border border-[#306346] shadow-xs transition-all hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg
                  className="w-4 h-4 text-[#E0EEDF]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
                  <path d="M9 3.5v17" />
                  <path d="M14.5 9.5l-3 2.5 3 2.5" />
                </svg>
              </button>
            </div>

            {/* Wooden Sign Header Plaque (Matching Sherwood Island Plaque) */}
            <div className="relative group mb-3">
              <Link
                href="/dashboard"
                className="flex min-h-[84px] relative items-center justify-center text-[#FFF6E5] py-5 px-3 shadow-md text-center transform transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg overflow-hidden"
              >
                <Image
                  src="/images/sign-board.png"
                  alt=""
                  fill
                  unoptimized
                  className="object-fill [image-rendering:pixelated]"
                />

                <div className="relative z-10">
                  <h2 className="text-xl font-black tracking-wide text-white drop-shadow-md">
                    Let&apos;s Explore!
                  </h2>
                </div>
              </Link>
            </div>

            {/* Navigation Items (Directly on dark green, active item is a full rounded white capsule pill) */}
            <nav className="space-y-1 mb-3">
              {SIDEBAR_NAV_ITEMS.map((item, idx) => {
                const isActive = isRouteActive(item.href, pathname);

                return (
                  <Link
                    key={idx}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3.5 py-2 rounded-full font-bold text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-[#FAF7F0] text-[#1F452C] shadow-md scale-[1.01]'
                        : 'text-[#DCE8DC] hover:bg-[#2C5E42] hover:text-white'
                    }`}
                  >
                    <div className="relative w-6 h-6 shrink-0 flex items-center justify-center pointer-events-none select-none">
                      {item.iconEmoji ? (
                        <span className="text-xl leading-none" aria-hidden="true">{item.iconEmoji}</span>
                      ) : item.iconSrc ? (
                        <Image
                          src={item.iconSrc}
                          alt={item.label}
                          width={20}
                          height={20}
                          unoptimized
                          className={`pixel-art w-5 h-5 object-contain transition-opacity duration-150 ${
                            item.hoverIconSrc ? 'group-hover:opacity-0' : ''
                          }`}
                        />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-gradient-to-br from-amber-400 to-amber-500 text-[10px] font-black text-stone-900">
                          {user?.name?.[0]?.toUpperCase() || 'J'}
                        </span>
                      )}
                      {item.hoverIconSrc && (
                        <Image
                          src={item.hoverIconSrc}
                          alt={`${item.label} hover`}
                          width={20}
                          height={20}
                          unoptimized
                          className="pixel-art w-5 h-5 object-contain absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        />
                      )}
                    </div>
                    <span className="tracking-wide text-[12.5px] truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Mascot + Dagens Tips Card */}
          <div className="relative mt-auto pt-2 flex flex-col items-center">
            {/* Friendly Mascot Avatar standing right above tip box */}
            <div className="relative z-10 -mb-3.5 cursor-pointer group" onClick={handleNextTip}>
              <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-[#FAF7F0] shadow-md bg-[#FAF7F0] transform transition-transform group-hover:scale-105 active:scale-95">
                <Image
                  src="/cozy/juander_mascot.jpg"
                  alt="Juander Scout Mascot"
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-[#1F3D2B] text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-xs">
                JUANDER
              </span>
            </div>

            {/* Eco Tips Speech Bubble */}
            <div className="w-full bg-[#1B3F2B] rounded-2xl p-3 pt-4 border border-[#2B5E40] text-center relative shadow-inner">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  Daily Eco-Tip
                </span>
                <button
                  type="button"
                  onClick={handleNextTip}
                  className="text-[10px] font-bold text-amber-300 hover:text-white hover:underline cursor-pointer"
                >
                  Next Tip
                </button>
              </div>
              <p className="text-[10.5px] leading-relaxed text-emerald-100/90 font-medium italic">
                &ldquo;{ECO_TIPS[selectedTipIndex]}&rdquo;
              </p>
              <div className="flex justify-center mt-1.5 opacity-60">
                <span className="text-xs">🍃</span>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
