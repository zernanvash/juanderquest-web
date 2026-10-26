'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, Award, History, Settings } from 'lucide-react';
import { gsap, prefersReducedMotion, Flip } from '@/lib/animations/gsap';

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
  const [prevActive, setPrevActive] = useState(activePanel);

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
    if (prevActive === activePanel) return;
    setPrevActive(activePanel);

    if (!containerRef.current || !gliderRef.current) return;
    if (prefersReducedMotion()) return;

    const state = Flip.getState(gliderRef.current);
    const activeTabEl = containerRef.current.querySelector<HTMLElement>(`[data-tab-key="${activePanel}"]`);
    if (activeTabEl && gliderRef.current) {
      activeTabEl.appendChild(gliderRef.current);
      Flip.from(state, {
        duration: 0.35,
        ease: 'power2.out',
      });
    }
  }, [activePanel, prevActive]);

  return (
    <div
      ref={containerRef}
      className="mt-4 pt-3 border-t border-[#F2EFE9] flex items-center gap-2 overflow-x-auto relative"
    >
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
                ? 'text-white'
                : 'text-[#837560] hover:text-[#2C221E] hover:bg-stone-50'
            }`}
          >
            {isActive && (
              <div
                ref={gliderRef}
                data-testid="tab-glider"
                className="absolute inset-0 bg-[var(--color-brand-primary)] rounded-xl shadow-xs -z-10 pointer-events-none"
              />
            )}
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge}
          </Link>
        );
      })}
    </div>
  );
};
