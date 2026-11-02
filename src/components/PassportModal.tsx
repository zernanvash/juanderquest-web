'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { useGamification } from '@/lib/gamification';
import { X, CheckCircle2, ChevronLeft, ChevronRight, Stamp, CircleHelp, History } from 'lucide-react';

interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptySubscribe = () => () => {};
const STAMPS_PER_PAGE = 16;
type StampFilter = 'all' | 'collected' | 'uncollected';

function getStampTimestamp(unlockedAt?: string): number {
  const timestamp = Date.parse(unlockedAt ?? '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatStampDate(unlockedAt?: string): string {
  const timestamp = getStampTimestamp(unlockedAt);
  if (!timestamp) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp);
}

export function PassportModal({ isOpen, onClose }: PassportModalProps) {
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);
  const { user } = useAuth();
  const { xp, currentTier, nextTier, progressPercent, stamps, unlockStamp } = useGamification();
  const [stampPage, setStampPage] = useState(0);
  const [stampFilter, setStampFilter] = useState<StampFilter>('all');
  const [showStampDetails, setShowStampDetails] = useState(false);
  const [showAllStampActivity, setShowAllStampActivity] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAllStampActivity) {
          setShowAllStampActivity(false);
        } else {
          onClose();
        }
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, showAllStampActivity]);

  if (!isOpen || !isMounted) return null;

  const unlockedCount = stamps.filter((s) => s.unlocked).length;
  const recentStamps = stamps
    .filter((stamp) => stamp.unlocked)
    .sort((a, b) => getStampTimestamp(b.unlockedAt) - getStampTimestamp(a.unlockedAt))
    .slice(0, 3);
  const filteredStamps = stamps.filter((stamp) => {
    if (stampFilter === 'collected') return stamp.unlocked;
    if (stampFilter === 'uncollected') return !stamp.unlocked;
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filteredStamps.length / STAMPS_PER_PAGE));
  const currentPage = Math.min(stampPage, pageCount - 1);
  const pageStamps = filteredStamps.slice(currentPage * STAMPS_PER_PAGE, (currentPage + 1) * STAMPS_PER_PAGE);
  const stampSlots = Array.from({ length: STAMPS_PER_PAGE }, (_, index) => pageStamps[index] ?? null);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="passport-modal-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Passport Booklet Container */}
      <div className="relative z-10 w-full max-w-4xl h-[92vh] max-h-[900px] bg-[#4A260F] p-2.5 sm:p-4 rounded-3xl shadow-2xl border-4 border-[#301607] text-[#241A08] overflow-hidden flex flex-col">
        {/* Top Gold Bar */}
        <div className="flex items-center justify-between pb-2 px-2 text-[#FDE047]">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <span id="passport-modal-title" className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#FFF6E5]">
              Official Archipelago Explorer Passport
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Passport"
            className="w-8 h-8 rounded-full bg-[#301607] hover:bg-[#693E1B] text-[#FFF6E5] flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Page Open Book Spread */}
        <div className="min-h-0 flex-1 bg-[#FAF6EE] rounded-2xl border-2 border-[#EADCC5] overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5D7BF] shadow-inner">
          {/* ======================================================== */}
          {/* LEFT PAGE: Traveler ID & Scout Rank Credentials           */}
          {/* ======================================================== */}
          <div className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div>
              {/* Header Certificate Plaque */}
              <div className="text-center pb-4 border-b border-[#E8DCBF]">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1B3F2B] text-white shadow-xs mb-1.5 border-2 border-[#FAF7F0]">
                  <span className="text-lg">🌿</span>
                </div>
                <h2 className="text-lg font-black text-[#582F0E] tracking-tight">
                  JuanDer Scout Credential
                </h2>
              </div>

              {/* Traveler Identity Card */}
              <div className="mt-4 bg-[#F2EDE1] rounded-2xl p-4 border border-[#E0D5BE] flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#FAF7F0] border-2 border-[#582F0E] flex items-center justify-center shrink-0 shadow-xs">
                  <Image
                    src="/cozy/juander_mascot.jpg"
                    alt="Traveler Avatar"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#837560]">
                      Scout ID #JDQ-8492
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Active
                    </span>
                  </div>
                  <h4 className="text-base font-black text-[#2D3A2F] truncate">
                    {user?.displayName || 'Explorer Juan'}
                  </h4>
                  <p className="text-xs font-bold text-[#5B8E67] flex items-center gap-1">
                    <span>{currentTier.badgeIcon}</span>
                    <span>Level {currentTier.level}: {currentTier.title}</span>
                  </p>
                </div>
              </div>

              {/* Gamification Stats Grid */}
              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                {/* Total XP & Progress */}
                <div className="bg-white rounded-xl p-3 border border-[#E3D9C3] space-y-1">
                  <span className="text-[10px] font-extrabold text-[#837560] uppercase block">
                    Total Experience
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-[#582F0E]">{xp} XP</span>
                    <span className="text-[10px] font-bold text-[#5B8E67]">
                      {progressPercent}%
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[#E8E1CE] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#5B8E67] to-[#2E8B4E] rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {nextTier && (
                    <span className="text-[9px] font-semibold text-[#837560] block truncate">
                      {nextTier.minXp - xp} XP to {nextTier.title}
                    </span>
                  )}
                </div>

                {/* Collected Passport Stamps */}
                <div className="relative min-w-0 rounded-xl border border-[#E3D9C3] bg-white p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-extrabold uppercase text-[#837560]">Passport stamps</span>
                    <button
                      type="button"
                      aria-label="What stamps buy"
                      aria-expanded={showStampDetails}
                      aria-controls="passport-stamp-details"
                      onClick={() => setShowStampDetails((visible) => !visible)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#837560] transition hover:bg-[#F2EDE1] hover:text-[#582F0E]"
                    >
                      <CircleHelp className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#D69B16] bg-[#FFF4D6] text-[#A95D12]">
                      <Stamp className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-[#582F0E]">{unlockedCount}</span>
                      <span className="text-[10px] font-bold text-[#837560]">collected</span>
                    </div>
                  </div>
                  {showStampDetails && (
                    <div
                      id="passport-stamp-details"
                      role="tooltip"
                      className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-[#E0D5BE] bg-[#FAF6EE] p-3 text-left shadow-xl"
                    >
                      <div className="mb-2 text-xs font-black text-[#582F0E]">What stamps buy</div>
                      <div className="space-y-2 text-[10px] leading-snug text-[#6F5B43]">
                        <p><strong className="text-[#2D6A4F]">Streak shield · 100 stamps</strong><br />Automatically protects your streak after a missed day. It does not grant missed stamps.</p>
                        <p><strong className="text-[#2D6A4F]">JuanDer Pass · 600 stamps</strong><br />Seven days of VIP perks, including an extra weekly shield. Planned for Phase 2.</p>
                        <p><strong className="text-[#2D6A4F]">Cosmetics</strong><br />Stamp-priced shop items are planned for a later phase.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Stamp Activity */}
              <section aria-labelledby="recent-stamp-activity-title" className="mt-3.5 rounded-xl border border-[#E3D9C3] bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-[#A95D12]" aria-hidden="true" />
                    <h3 id="recent-stamp-activity-title" className="text-[10px] font-extrabold uppercase tracking-wide text-[#837560]">
                      Recent stamp activity
                    </h3>
                  </div>
                  {unlockedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllStampActivity(true)}
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-[#2D6A4F] transition hover:bg-[#EEF4EB] hover:text-[#1B3F2B]"
                    >
                      See All
                    </button>
                  )}
                </div>
                {recentStamps.length > 0 ? (
                  <ul className="space-y-2">
                    {recentStamps.map((stamp) => (
                      <li key={stamp.id} className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF4D6] text-sm" aria-hidden="true">
                          {stamp.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#582F0E]">
                          {stamp.name}
                        </span>
                        <time
                          dateTime={stamp.unlockedAt && !Number.isNaN(Date.parse(stamp.unlockedAt)) ? new Date(stamp.unlockedAt).toISOString() : undefined}
                          className="shrink-0 text-[9px] font-medium text-[#837560]"
                        >
                          {formatStampDate(stamp.unlockedAt)}
                        </time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] leading-snug text-[#837560]">
                    Your collected municipality stamps will appear here.
                  </p>
                )}
              </section>

            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT PAGE: Municipality Postal Stamps Grid               */}
          {/* ======================================================== */}
          <div className="min-h-0 overflow-hidden p-5 sm:p-6 flex flex-col md:h-full">
            <div className="min-h-0 flex flex-1 flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DCBF]">
                <div>
                  <h3 className="text-sm font-black text-[#582F0E]">
                    Pangasinan Municipality Stamps
                  </h3>
                  <p className="text-[11px] text-[#837560] font-medium">
                    Stamp collected: <span className="font-bold text-[#5B8E67]">{unlockedCount}</span> of {stamps.length}
                  </p>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-[#F2EDE1] text-[#582F0E] border border-[#DCD0B7]">
                  {stamps.length ? Math.round((unlockedCount / stamps.length) * 100) : 0}% Complete
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5" aria-label="Filter municipality stamps">
                  {([
                    { id: 'all', label: 'All', count: stamps.length },
                    { id: 'collected', label: 'Collected', count: unlockedCount },
                    { id: 'uncollected', label: 'Not collected', count: stamps.length - unlockedCount },
                  ] as const).map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={stampFilter === filter.id}
                      onClick={() => {
                        setStampFilter(filter.id);
                        setStampPage(0);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                        stampFilter === filter.id
                          ? 'border-[#2D6A4F] bg-[#2D6A4F] text-white'
                          : 'border-[#DCD0B7] bg-white text-[#6F5B43] hover:border-[#2D6A4F]'
                      }`}
                    >
                      {filter.label} <span className="opacity-75">{filter.count}</span>
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-[#837560]">
                  {filteredStamps.length === 0 ? 'No stamps to show' : `${filteredStamps.length} places`}
                </span>
              </div>

              <div className="mt-3.5 flex min-h-0 flex-1 flex-col justify-center rounded-2xl border-4 border-[#244E36] bg-[#1B3F2B] p-2 shadow-inner">
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {stampSlots.map((stamp, index) => stamp ? (
                    <div
                      key={stamp.id}
                      className="group relative cursor-default"
                    >
                      <div
                        role="img"
                        aria-label={`${stamp.unlocked ? 'Collected' : 'Not yet collected'}: ${stamp.name}`}
                        className={`relative aspect-square min-w-0 w-full rounded-xl border-[3px] border-[#FAF6EE] p-1 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ${
                          stamp.unlocked
                            ? 'bg-[#C49A7A] text-[#582F0E]'
                            : 'bg-[#C49A7A]/55 text-[#FFF6E5]/80'
                        }`}
                      >
                        <>
                          <span
                            className={`flex h-full items-center justify-center text-2xl sm:text-3xl ${
                              stamp.unlocked ? '' : 'grayscale opacity-45'
                            }`}
                            aria-hidden="true"
                          >
                            {stamp.icon}
                          </span>
                          {stamp.unlocked ? (
                            <span className="absolute bottom-1 right-1 rounded-full bg-emerald-800 p-0.5 text-white">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            </span>
                          ) : (
                            <span className="absolute inset-x-0 bottom-1 text-center">
                              <span className="rounded-full bg-[#2D2923]/80 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                                Locked
                              </span>
                            </span>
                          )}
                        </>
                      </div>

                      <div
                        className={`invisible pointer-events-none absolute bottom-full z-30 w-56 cursor-default rounded-[13px] border border-[#E7DCC5] bg-[#1B3F2B] p-2 text-left text-[#F8F3EA] opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100 ${
                          index % 3 === 0
                            ? 'left-0'
                            : index % 3 === 2
                              ? 'right-0'
                              : 'left-1/2 -translate-x-1/2'
                        } ${
                          index % 4 === 0
                            ? 'md:left-0 md:right-auto md:translate-x-0'
                            : index % 4 === 3
                              ? 'md:left-auto md:right-0 md:translate-x-0'
                              : 'md:left-1/2 md:right-auto md:-translate-x-1/2'
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">{stamp.tag}</div>
                        <div className="mt-1 text-[11px] font-black leading-snug">{stamp.name}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-emerald-50/90">{stamp.description}</p>
                        {!stamp.unlocked && (
                          <button
                            type="button"
                            onClick={() => unlockStamp(stamp.id)}
                            className="mt-2 rounded-lg bg-[#2E8B4E] px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-[#1E6B39]"
                          >
                            Check-In & Stamp (+75 XP)
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`empty-${stampPage}-${index}`}
                      aria-hidden="true"
                      className="aspect-square rounded-xl border-[3px] border-[#FAF6EE] bg-[#C49A7A]/35 shadow-inner"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setStampPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#7A3510] px-3 py-1.5 text-xs font-black text-[#FFF6E5] shadow-xs transition hover:bg-[#582F0E] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
                <nav aria-label="Stamp collection pages" className="flex items-center gap-1">
                  {Array.from({ length: pageCount }, (_, pageIndex) => (
                    <button
                      key={pageIndex}
                      type="button"
                      aria-label={`Go to page ${pageIndex + 1}`}
                      aria-current={currentPage === pageIndex ? 'page' : undefined}
                      onClick={() => setStampPage(pageIndex)}
                      className={`h-7 min-w-7 rounded-lg px-2 text-[10px] font-black transition ${
                        currentPage === pageIndex
                          ? 'bg-[#2D6A4F] text-white'
                          : 'bg-[#F2EDE1] text-[#6F5B43] hover:bg-[#E3D8C2]'
                      }`}
                    >
                      {pageIndex + 1}
                    </button>
                  ))}
                </nav>
                <button
                  type="button"
                  onClick={() => setStampPage(Math.min(pageCount - 1, currentPage + 1))}
                  disabled={currentPage >= pageCount - 1}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#7A3510] px-3 py-1.5 text-xs font-black text-[#FFF6E5] shadow-xs transition hover:bg-[#582F0E] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showAllStampActivity && (
        <div
          className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setShowAllStampActivity(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="all-stamp-activity-title"
            className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#E0D5BE] bg-[#FAF6EE] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-[#E8DCBF] px-5 py-4">
              <div>
                <h2 id="all-stamp-activity-title" className="text-base font-black text-[#582F0E]">
                  Stamp activity
                </h2>
                <p className="mt-0.5 text-xs text-[#837560]">
                  {unlockedCount} {unlockedCount === 1 ? 'stamp' : 'stamps'} collected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllStampActivity(false)}
                aria-label="Close stamp activity"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EFE7D8] text-[#582F0E] transition hover:bg-[#E3D8C2]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 overflow-y-auto p-4">
              {recentStamps.length > 0 ? (
                <ul className="space-y-2">
                  {stamps
                    .filter((stamp) => stamp.unlocked)
                    .sort((a, b) => getStampTimestamp(b.unlockedAt) - getStampTimestamp(a.unlockedAt))
                    .map((stamp) => (
                      <li
                        key={stamp.id}
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E8DCBF] bg-white px-3 py-2.5"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F0DDAA] bg-[#FFF4D6] text-lg" aria-hidden="true">
                          {stamp.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-[#582F0E]">{stamp.name}</span>
                          <span className="block truncate text-[10px] text-[#837560]">{stamp.title}</span>
                        </span>
                        <time
                          dateTime={stamp.unlockedAt && !Number.isNaN(Date.parse(stamp.unlockedAt)) ? new Date(stamp.unlockedAt).toISOString() : undefined}
                          className="shrink-0 text-[10px] font-medium text-[#837560]"
                        >
                          {formatStampDate(stamp.unlockedAt)}
                        </time>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-[#837560]">
                  No stamps collected yet. Your stamp activity will appear here.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>,
    document.body
  );
}
