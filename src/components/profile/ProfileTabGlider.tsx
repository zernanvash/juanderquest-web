'use client';

import React, { useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { Compass, Award, History, Settings } from 'lucide-react';
import { gsap, prefersReducedMotion } from '@/lib/animations/gsap';

interface TabItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  extraClass?: string;
}

interface ProfileTabGliderProps {
  cleanParam: string;
  activePanel: 'overview' | 'badges' | 'history' | 'journey';
  isOwner?: boolean;
  sampleBadgesCount?: number;
}

export const ProfileTabGlider: React.FC<ProfileTabGliderProps> = ({
  cleanParam,
  activePanel,
  isOwner = false,
  sampleBadgesCount,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gliderRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const tabs: TabItem[] = [
    {
      key: 'overview',
      label: 'Overview',
      href: `/profile/${cleanParam}`,
      icon: <Compass className="w-4 h-4" />,
    },
    {
      key: 'badges',
      label: 'Badges & Achievements',
      href: `/profile/${cleanParam}?tab=badges`,
      icon: <Award className="w-4 h-4" />,
      badge: sampleBadgesCount != null ? (
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200/60 text-stone-700">
          {sampleBadgesCount}
        </span>
      ) : undefined,
    },
  ];

  if (isOwner) {
    tabs.push({
      key: 'history',
      label: 'Submissions & GPS Proof',
      href: '/history',
      icon: <History className="w-4 h-4" />,
    });
    tabs.push({
      key: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="w-4 h-4" />,
      extraClass: 'ml-auto',
    });
  }

  useLayoutEffect(() => {
    const container = containerRef.current;
    const glider = gliderRef.current;
    if (!container || !glider) return;

    const updateGlider = (animate = true) => {
      const activeTabEl = container.querySelector<HTMLElement>(`[data-tab-key="${activePanel}"]`);
      if (!activeTabEl) {
        // Active panel has no matching tab (e.g. 'journey' or 'history' on public profile)
        gsap.set(glider, { opacity: 0 });
        return;
      }

      const x = activeTabEl.offsetLeft;
      const width = activeTabEl.offsetWidth;
      const reduced = prefersReducedMotion();

      if (!animate || reduced || isFirstRender.current) {
        gsap.set(glider, {
          x,
          width,
          opacity: 1,
        });
        isFirstRender.current = false;
      } else {
        gsap.to(glider, {
          x,
          width,
          opacity: 1,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    updateGlider(!isFirstRender.current);

    // Re-measure on resize without animation
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateGlider(false);
      });
      ro.observe(container);
    }

    return () => {
      ro?.disconnect();
    };
  }, [activePanel]);

  return (
    <div
      ref={containerRef}
      className="mt-4 pt-3 border-t border-[#F2EFE9] flex flex-wrap items-center gap-2 relative sm:flex-nowrap sm:overflow-x-auto" aria-label="Profile sections"
    >
      {/* Standalone gliding pill */}
      <div
        ref={gliderRef}
        data-testid="tab-glider"
        className="absolute top-3 bottom-0 my-auto hidden h-[calc(100%-1.5rem)] bg-[var(--color-brand-primary)] rounded-xl shadow-xs pointer-events-none opacity-0 sm:block"
        style={{ left: 0 }}
      />

      {tabs.map((tab) => {
        const isActive = activePanel === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            data-tab-key={tab.key}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shrink-0 z-10 ${
              tab.extraClass || ''
            } ${
              isActive
                ? 'text-white bg-[var(--color-brand-primary)] sm:bg-transparent'
                : 'text-[#837560] hover:text-[#2C221E] hover:bg-stone-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge}
          </Link>
        );
      })}
    </div>
  );
};
