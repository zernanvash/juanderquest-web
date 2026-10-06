'use client';

import React, { useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Maximize2,
  Minimize2,
  MapPin,
} from 'lucide-react';

export type MobileSnapState = 'peek' | 'half' | 'full';

export interface MapWorkspaceTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | null;
  badgeVariant?: 'primary' | 'amber' | 'emerald' | 'stone';
}

export interface MapWorkspacePanelProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: 'primary' | 'amber' | 'emerald' | 'stone';
  };
  backButton?: {
    onClick?: () => void;
    href?: string;
    label?: string;
  };
  headerActions?: React.ReactNode;
  tabs?: MapWorkspaceTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  // Desktop collapse state
  isDesktopCollapsed: boolean;
  onDesktopCollapseChange: (collapsed: boolean) => void;
  // Mobile snap state
  mobileSnap: MobileSnapState;
  onMobileSnapChange: (snap: MobileSnapState) => void;
  // Slot rendered on mobile peek mode
  peekContent?: React.ReactNode;
  // Slot for floating tools rendered on top-right of map
  floatingTools?: React.ReactNode;
  // Optional search bar slot for Google Maps-style omnibox
  searchBar?: React.ReactNode;
  // Tab panels content
  children: React.ReactNode;
}

export function MapWorkspacePanel({
  title,
  subtitle,
  badge,
  backButton,
  headerActions,
  tabs = [],
  activeTab,
  onTabChange,
  isDesktopCollapsed,
  onDesktopCollapseChange,
  mobileSnap,
  onMobileSnapChange,
  peekContent,
  floatingTools,
  searchBar,
  children,
}: MapWorkspacePanelProps) {
  const touchStartY = useRef<number | null>(null);

  // Cycle mobile snap states
  const cycleSnapUp = useCallback(() => {
    if (mobileSnap === 'peek') onMobileSnapChange('half');
    else if (mobileSnap === 'half') onMobileSnapChange('full');
  }, [mobileSnap, onMobileSnapChange]);

  const cycleSnapDown = useCallback(() => {
    if (mobileSnap === 'full') onMobileSnapChange('half');
    else if (mobileSnap === 'half') onMobileSnapChange('peek');
  }, [mobileSnap, onMobileSnapChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;

    if (diff > 35) {
      // Swiped upwards
      cycleSnapUp();
    } else if (diff < -35) {
      // Swiped downwards
      cycleSnapDown();
    }
  };

  const activeTabDef = tabs.find((t) => t.id === activeTab) || tabs[0];
  const ActiveIcon = activeTabDef?.icon || MapPin;

  const renderBadge = (b?: { label: string; variant?: string }, className = '') => {
    if (!b) return null;
    const variantStyles =
      b.variant === 'amber'
        ? 'bg-amber-100 text-[#7D5800] border-amber-200'
        : b.variant === 'emerald'
        ? 'bg-emerald-100 text-[#2D6A4F] border-emerald-200'
        : b.variant === 'stone'
        ? 'bg-stone-100 text-stone-700 border-stone-200'
        : 'bg-[#2D6A4F]/10 text-[#2D6A4F] border-[#2D6A4F]/20';

    return (
      <span
        className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider shrink-0 ${variantStyles} ${className}`}
      >
        {b.label}
      </span>
    );
  };

  return (
    <>
      {/* 1. TOP-RIGHT FLOATING MAP TOOLS STACK */}
      {floatingTools && (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
          {floatingTools}
        </div>
      )}

      {/* 2. DESKTOP WORKSPACE PANEL (lg & up) */}
      <div className="hidden lg:block pointer-events-none">
        {isDesktopCollapsed ? (
          /* Desktop Collapsed Floating Controls (Search Bar + Mini-Pill) */
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-auto animate-in fade-in slide-in-from-left-2 duration-200">
            {searchBar && <div className="w-72 sm:w-80 shrink-0">{searchBar}</div>}
            <button
              type="button"
              onClick={() => onDesktopCollapseChange(false)}
              className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-[#E3DFD5] shadow-lg flex items-center gap-2.5 text-xs font-bold text-[#582F0E] hover:bg-white hover:text-[#2D6A4F] transition active:scale-95 cursor-pointer group shrink-0"
              title={`Expand ${title}`}
              aria-label={`Expand ${title}`}
            >
              <div className="w-6 h-6 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition">
                {ActiveIcon && <ActiveIcon className="w-3.5 h-3.5 text-[#FFB703]" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black leading-tight text-[#582F0E] group-hover:text-[#2D6A4F] transition">
                  {title}
                </span>
                {subtitle && (
                  <span className="text-[10px] text-[#837560] font-semibold truncate max-w-[160px]">
                    {subtitle}
                  </span>
                )}
              </div>
              <div className="ml-1 pl-2 border-l border-[#E3DFD5] flex items-center gap-1 text-[11px] font-extrabold text-[#2D6A4F]">
                <span>Open</span>
                <ChevronRight className="w-4 h-4 text-[#2D6A4F]" />
              </div>
            </button>
          </div>
        ) : (
          /* Desktop Expanded Docked Left Sidebar */
          <div className="absolute top-4 left-4 bottom-4 z-20 w-[380px] xl:w-[420px] flex flex-col pointer-events-none animate-in fade-in slide-in-from-left-3 duration-200">
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-3xl border border-[#E3DFD5] shadow-2xl flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-4 pb-3 border-b border-[#E3DFD5]/80 space-y-2.5 shrink-0 bg-white/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {backButton &&
                      (backButton.href ? (
                        <Link
                          href={backButton.href}
                          className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#582F0E] flex items-center justify-center transition active:scale-95 shrink-0"
                          title={backButton.label || 'Go back'}
                          aria-label={backButton.label || 'Go back'}
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={backButton.onClick}
                          className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#582F0E] flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer"
                          title={backButton.label || 'Go back'}
                          aria-label={backButton.label || 'Go back'}
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      ))}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h1 className="text-sm font-black text-[#582F0E] leading-tight truncate">
                          {title}
                        </h1>
                        {renderBadge(badge)}
                      </div>
                      {subtitle && (
                        <p className="text-[11px] text-[#837560] font-semibold truncate leading-tight mt-0.5">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Header Actions & Collapse Toggle */}
                  <div className="flex items-center gap-1 shrink-0">
                    {headerActions}
                    <button
                      type="button"
                      onClick={() => onDesktopCollapseChange(true)}
                      className="p-1.5 rounded-xl hover:bg-stone-100 text-[#837560] hover:text-[#582F0E] transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      title="Collapse sidebar dock"
                      aria-label="Collapse sidebar dock"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Desktop Tabs Segmented Control */}
                {tabs.length > 1 && (
                  <div
                    role="tablist"
                    className="grid gap-1 bg-[#FAF9F5] p-1 rounded-2xl border border-[#E3DFD5]"
                    style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
                  >
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => onTabChange?.(tab.id)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[34px] ${
                            isActive
                              ? 'bg-[#2D6A4F] text-white shadow-xs'
                              : 'text-[#582F0E] hover:bg-white hover:text-[#2D6A4F]'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FFB703]' : ''}`} />
                          <span className="truncate">{tab.label}</span>
                          {tab.badge !== undefined && tab.badge !== null && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black shrink-0 ${
                                isActive ? 'bg-white/20 text-white' : 'bg-stone-200/80 text-[#582F0E]'
                              }`}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Search Bar Docked in Sidebar */}
              {searchBar && (
                <div className="px-3.5 py-2 border-b border-[#E3DFD5]/60 bg-[#FAF9F5]/60 shrink-0">
                  {searchBar}
                </div>
              )}

              {/* Scrollable Children Body */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 custom-scrollbar">
                {children}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. MOBILE FLOATING TOP SEARCH BAR */}
      {searchBar && (
        <div className="lg:hidden absolute top-3 left-3 right-16 z-20 pointer-events-auto animate-in fade-in duration-200">
          {searchBar}
        </div>
      )}

      {/* 4. MOBILE WORKSPACE PANEL (Bottom Sheet < lg) */}
      <div
        className={`lg:hidden absolute bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-4 sm:right-4 z-30 pointer-events-auto bg-white/98 backdrop-blur-lg border border-[#E3DFD5] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-3xl flex flex-col overflow-hidden transition-[height] duration-250 ease-out ${
          mobileSnap === 'peek'
            ? 'h-14'
            : mobileSnap === 'half'
            ? 'h-[46vh]'
            : 'h-[78vh]'
        }`}
      >
        {/* Touch Drag Handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={mobileSnap === 'peek' ? cycleSnapUp : undefined}
          className="w-full flex flex-col items-center pt-2 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="w-10 h-1.5 rounded-full bg-stone-300" />
        </div>

        {mobileSnap === 'peek' ? (
          /* Mobile Peek Bar Mode (Compact 56px) */
          <div
            className="flex-1 min-h-0 px-3 pb-2 flex items-center justify-between gap-2"
            onClick={cycleSnapUp}
          >
            {peekContent ? (
              <div className="flex-1 min-w-0 cursor-pointer">{peekContent}</div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                <div className="w-7 h-7 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  {ActiveIcon && <ActiveIcon className="w-3.5 h-3.5 text-[#FFB703]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs font-black text-[#582F0E] truncate">{title}</h2>
                  {subtitle && (
                    <p className="text-[10px] text-[#837560] font-semibold truncate leading-tight">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cycleSnapUp();
              }}
              className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#582F0E] transition shrink-0 cursor-pointer"
              title="Expand panel"
              aria-label="Expand panel"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Mobile Half or Full Expanded Mode */
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Header */}
            <div className="px-3.5 pb-2.5 pt-0.5 border-b border-[#E3DFD5]/80 space-y-2 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {backButton &&
                    (backButton.href ? (
                      <Link
                        href={backButton.href}
                        className="w-7 h-7 rounded-lg bg-stone-100 text-[#582F0E] flex items-center justify-center shrink-0"
                        title={backButton.label || 'Go back'}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={backButton.onClick}
                        className="w-7 h-7 rounded-lg bg-stone-100 text-[#582F0E] flex items-center justify-center shrink-0 cursor-pointer"
                        title={backButton.label || 'Go back'}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    ))}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs sm:text-sm font-black text-[#582F0E] truncate leading-tight">
                        {title}
                      </h2>
                      {renderBadge(badge)}
                    </div>
                    {subtitle && (
                      <p className="text-[10px] text-[#837560] font-semibold truncate leading-tight mt-0.5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Mobile Snap & Header Action Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  {headerActions}
                  {mobileSnap === 'half' ? (
                    <button
                      type="button"
                      onClick={() => onMobileSnapChange('full')}
                      className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#582F0E] transition cursor-pointer"
                      title="Expand to Full Height"
                      aria-label="Expand to Full Height"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onMobileSnapChange('half')}
                      className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#582F0E] transition cursor-pointer"
                      title="Collapse to Half Height"
                      aria-label="Collapse to Half Height"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onMobileSnapChange('peek')}
                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#582F0E] transition cursor-pointer"
                    title="Minimize to Peek Bar"
                    aria-label="Minimize to Peek Bar"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Mobile Tabs Switcher */}
              {tabs.length > 1 && (
                <div
                  role="tablist"
                  className="grid gap-1 bg-[#FAF9F5] p-1 rounded-xl border border-[#E3DFD5]"
                  style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
                >
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onTabChange?.(tab.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer min-h-[32px] ${
                          isActive
                            ? 'bg-[#2D6A4F] text-white shadow-xs'
                            : 'text-[#582F0E] hover:bg-white'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FFB703]' : ''}`} />
                        <span className="truncate">{tab.label}</span>
                        {tab.badge !== undefined && tab.badge !== null && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-black shrink-0 ${
                              isActive ? 'bg-white/20 text-white' : 'bg-stone-200/80 text-[#582F0E]'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scrollable Children Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-2.5 custom-scrollbar">
              {children}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
