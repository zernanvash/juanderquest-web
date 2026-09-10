'use client';
import { travelerProfileHref } from '@/lib/preview';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  PlusCircle,
  MessageSquare,
  Heart,
  Bookmark,
  Award,
  AlertTriangle,
  Send,
  CheckCircle2,
  Tag,
  Zap,
  ChevronDown,
  Info,
  Clock
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import { useRankedFeed } from '@/lib/use-ranked-feed';
import { SpotCardSkeleton } from '@/components/Skeleton';
import { useSavedLibrary } from '@/lib/saved-library';
import { communityChoicePreview } from '@/lib/community';
import { fetchPublicTravelers, type PublicTravelerSummary } from '@/lib/social';
import { DestinationMedia } from '@/components/DestinationMedia';

export default function ExplorePage() {
  const { user } = useAuth();
  const { spots, loading, loadingMore, error, hasMore, expired, sentinelRef, feedRef, loadSpots, handleLoadMore } = useRankedFeed(user?.id || 'guest');
  const [likes, setLikes] = useState<Record<string, { isLiked: boolean }>>({});
  const [openTips, setOpenTips] = useState<Record<string, boolean>>({});
  const [userTips, setUserTips] = useState<Record<string, string[]>>({});
  const [tipInput, setTipInput] = useState<Record<string, string>>({});
  const { library: savedLibrary, toggle: toggleSaved, isSaved } = useSavedLibrary();
  const [scouts, setScouts] = useState<PublicTravelerSummary[]>([]);
  const [loadingScouts, setLoadingScouts] = useState(true);
  const [scoutError, setScoutError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchPublicTravelers(3).then((items) => {
      if (mounted) {
        setScouts(items);
        setLoadingScouts(false);
      }
    }).catch((error) => {
      if (mounted) { setScoutError(error.message); setLoadingScouts(false); }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleLike = (spotId: string) => {
    setLikes((prev) => {
      const current = prev[spotId] || { isLiked: false };
      return {
        ...prev,
        [spotId]: {
          isLiked: !current.isLiked,
        },
      };
    });
  };

  const handleToggleTips = (spotId: string) => {
    setOpenTips((prev) => ({ ...prev, [spotId]: !prev[spotId] }));
  };

  const handleAddTip = (spotId: string) => {
    const text = tipInput[spotId]?.trim();
    if (!text) return;
    setUserTips((prev) => ({
      ...prev,
      [spotId]: [...(prev[spotId] || []), text],
    }));
    setTipInput((prev) => ({ ...prev, [spotId]: '' }));
  };

  const toggleSave = (spotId: string) => {
    toggleSaved('spots', spotId);
  };

  const savedSpotHighlights = spots.filter((s) => savedLibrary.spots.includes(s.id)).slice(0, 3);

  const visibleSpots = spots;

  // Spotlight recommendations (distinct from top hero to avoid repetition)
  const topHeroSpot = spots[0] || null;
  const spotlightSpot = spots.length > 1 ? spots[1] : null;

  return (
    <Navigation>
      <div className="space-y-4 lg:h-full lg:min-h-0">
        {/* Structured 3-Column Post Stream (Desktop: Left shortcuts, Center feed, Right spotlight/leaderboard)
            Mobile: Center feed leads first with order-1, shortcuts follow with order-2, right rail with order-3 */}
        <div className="explore-columns grid grid-cols-1 gap-3 items-start lg:h-full lg:min-h-0">
          
          {/* Main Feed Column - ORDER 1 on Mobile, ORDER 2 on Desktop */}
          <div
            role="region"
            aria-label="Destination feed"
            ref={feedRef}
            tabIndex={0}
            className="order-1 lg:order-2 explore-scroll space-y-4 min-w-0"
          >
            {/* Quick Share / Post Bar */}
            <div className="bg-white rounded-2xl p-4 border border-[var(--color-border-default)] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-brand-primary)] text-white font-bold flex items-center justify-center text-sm shrink-0">
                {user ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <Link
                href="/spots/new"
                className="flex-1 bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-default)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text-muted)] font-medium transition cursor-pointer flex items-center justify-between"
              >
                <span>Share a photo, hidden beach, heritage shrine, or tip...</span>
                <div className="flex items-center gap-1.5 text-[var(--color-brand-primary)] font-bold">
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Add Spot</span>
                </div>
              </Link>
            </div>

            {/* Feed Status Header */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="space-y-0.5">
                <span className="font-bold text-[var(--color-brand-brown)]">
                  {loading && spots.length === 0 ? 'Refreshing feed...' : 'Community Feed'}
                </span>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  Ranked with Pangasinan municipal diversity
                </p>
              </div>

              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--color-brand-primary)] border border-[var(--color-border-default)] shadow-2xs">
                {spots.length} Destinations
              </span>
            </div>

            {/* Post Feed List */}
            {loading && spots.length === 0 ? (
              <div className="space-y-4" aria-busy="true" aria-label="Loading destinations">
                <SpotCardSkeleton />
                <SpotCardSkeleton />
                <SpotCardSkeleton />
              </div>
            ) : error && spots.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-red-200 text-center space-y-3 shadow-xs">
                <p className="text-xs text-[#BC4749] font-bold">{error}</p>
                <button
                  type="button"
                  onClick={() => loadSpots()}
                  className="px-4 py-2 rounded-xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  Retry Loading
                </button>
              </div>
            ) : spots.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-[var(--color-border-default)] text-center space-y-3 shadow-xs">
                <Compass className="w-10 h-10 text-[var(--color-border-default)] mx-auto" />
                <h3 className="font-bold text-sm text-[var(--color-brand-brown)]">No destinations found in feed</h3>
                <p className="text-xs text-[var(--color-text-muted)]">The community feed could not find active destinations.</p>
                <button
                  type="button"
                  onClick={() => loadSpots()}
                  className="px-4 py-2 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-xs font-bold text-[var(--color-brand-brown)] hover:bg-white transition cursor-pointer"
                >
                  Refresh feed
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleSpots.map((spot, index) => {
                  const likeState = likes[spot.id] || { isLiked: false };
                  const isTipsOpen = Boolean(openTips[spot.id]);
                  const customTips = userTips[spot.id] || [];
                  const isFeaturedHero = index === 0;

                  return (
                    <article
                      key={spot.id}
                      className="bg-white rounded-2xl border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/40 shadow-xs hover:shadow-md transition-all duration-300 ease-out overflow-hidden"
                    >
                      {/* Compact Post Header & Caption Area */}
                      <div className="px-4 pt-3.5 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3 space-y-2">
                        {isFeaturedHero && (
                          <div className="flex flex-wrap items-center gap-2 border-b border-emerald-100 pb-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-brand-primary)]">
                              <Sparkles className="h-3 w-3" />
                              Featured Destination
                            </span>
                            <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                              Curated Pangasinan highlight
                            </span>
                          </div>
                        )}

                        {/* Meta Header */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] leading-none">
                          <span className="font-bold text-[var(--color-brand-primary)] flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {spot.municipality}
                          </span>
                          <span>•</span>
                          <span>
                            Shared by <strong className="text-[var(--color-brand-brown)]">{spot.sourceName}</strong>
                          </span>

                          {/* Provenance Badge, Server Recommendation Reason & Quest */}
                          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                            {spot.questId && (
                              <Link
                                href={`/quests/${spot.questId}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] font-bold text-[9px] border border-[#FDE68A] hover:bg-[#FEF3C7] transition"
                              >
                                <Trophy className="w-2.5 h-2.5 text-[#D97706]" />
                                <span>Quest available</span>
                              </Link>
                            )}
                            {spot.recommendationReasons && spot.recommendationReasons.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-[var(--color-brand-accent-dark)] font-bold text-[9px] border border-amber-200">
                                <Sparkles className="w-2.5 h-2.5 text-[var(--color-brand-accent)]" />
                                <span>{spot.recommendationReasons[0]}</span>
                              </span>
                            )}
                            {spot.trustLevel === 'lgu_verified' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px] border border-blue-200">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>LGU Verified</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <Link href={`/spots/${spot.slug}`} className="block group">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-bold text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition leading-snug">
                              {spot.name}
                            </h2>
                            {spot.isTest && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                QA Test Fixture
                              </span>
                            )}
                          </div>
                        </Link>

                        {/* Crowd Status Banner */}
                        {spot.crowdStatus === 'estimated_busy' ? (
                          <div className="py-1 px-2.5 rounded-lg bg-[#FFF3E8] border border-[#FFD8B8] flex items-center justify-between text-[11px] text-[#9E3E00]">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#D95D00] shrink-0" />
                              <span className="font-bold">Peak Activity Reported</span>
                            </div>
                            <Link href={`/spots/${spot.slug}`} className="text-[10px] font-bold underline text-[#D95D00]">
                              Alternatives →
                            </Link>
                          </div>
                        ) : spot.crowdStatus === 'quiet' ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E2F0E8] text-[#274E3C] text-[10px] font-bold">
                            <span>🌿 Serene &amp; Low Crowd</span>
                          </div>
                        ) : null}

                        {/* Description Text */}
                        <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                          {spot.description}
                        </p>
                      </div>

                      {/* Missing or failed media collapses into a text-only post. */}
                        <DestinationMedia
                          key={spot.imageUrl || 'no-media'}
                          src={spot.imageUrl}
                          alt={spot.name}
                          destinationName={spot.name}
                          municipality={spot.municipality}
                          priority={index === 0}
                          aspectRatio="card"
                          hideUnavailable
                          className="border-y border-[#E3DFD5]"
                        />

                      {/* Interactive Engagement Action Row */}
                      <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-white flex flex-wrap items-center justify-between gap-2 border-t border-[#E8E5DE]/80">
                        <div className="flex items-center gap-1 sm:gap-2">
                          {/* Instagram-style Heart Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleLike(spot.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition duration-150 transform active:scale-90 min-h-[36px] ${
                              likeState.isLiked
                                ? 'bg-rose-50 text-rose-600 font-bold border border-rose-200'
                                : 'hover:bg-[#FAF9F5] text-[#582F0E] border border-transparent'
                            }`}
                            aria-label={likeState.isLiked ? `Liked ${spot.name}` : `Like ${spot.name}`}
                          >
                            <Heart
                              className={`w-4 h-4 transition ${
                                likeState.isLiked
                                  ? 'fill-rose-600 text-rose-600 scale-110'
                                  : 'text-[#837560]'
                              }`}
                            />
                            <span className="text-xs font-extrabold">
                              {likeState.isLiked ? 'Liked' : 'Like'}
                            </span>
                          </button>

                          {/* Practical Tips Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleTips(spot.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-[#FAF9F5] transition text-[#582F0E] min-h-[36px] text-xs font-bold"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#837560]" />
                            <span>Traveler Tips</span>
                          </button>

                          {/* Bookmark / Save */}
                          <button
                            type="button"
                            onClick={() => toggleSave(spot.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition active:scale-95 cursor-pointer min-h-[36px] ${
                              isSaved('spots', spot.id)
                                ? 'bg-amber-100/80 text-[#7D5800] font-bold border border-amber-300/80 shadow-2xs'
                                : 'hover:bg-[#FAF9F5] text-[#582F0E]'
                            }`}
                            aria-label={isSaved('spots', spot.id) ? 'Remove bookmark' : 'Save to device'}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${
                                isSaved('spots', spot.id)
                                  ? 'fill-current text-[#B45309]'
                                  : 'text-[#837560]'
                              }`}
                            />
                            <span className="text-xs font-bold">
                              {isSaved('spots', spot.id) ? 'Saved' : 'Save'}
                            </span>
                          </button>
                        </div>

                        {/* Primary Direct Actions */}
                        <div className="flex items-center gap-1.5">
                          {spot.questId && (
                            <Link
                              href={`/quests/${spot.questId}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs font-extrabold shadow-2xs transition min-h-[36px]"
                            >
                              <Trophy className="w-3 h-3" />
                              <span>Play Quest</span>
                            </Link>
                          )}

                          <Link
                            href={`/navigate?name=${encodeURIComponent(spot.name)}&lat=${spot.gpsLat}&lng=${spot.gpsLng}&address=${encodeURIComponent(spot.address)}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-extrabold shadow-2xs transition min-h-[36px]"
                          >
                            <MapPin className="w-3 h-3 text-[#FFB703]" />
                            <span>Navigate</span>
                          </Link>
                        </div>
                      </div>

                      {/* Traveler Tips Section */}
                      {isTipsOpen && (
                        <div className="px-4 py-3 sm:px-5 sm:py-4 bg-[#FAF9F5] border-t border-[#E3DFD5] space-y-2.5 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-[#582F0E] flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-[#2D6A4F]" />
                              <span>Practical Venue Details</span>
                            </h4>
                            <span className="text-[10px] text-[#837560]">Factual spot notes</span>
                          </div>

                          {/* Address & Venue Facts */}
                          <div className="p-2.5 rounded-xl bg-white border border-[#E3DFD5] text-xs space-y-1.5 text-[#514532]">
                            <p className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0 mt-0.5" />
                              <span>{spot.address || `${spot.municipality}, Pangasinan`}</span>
                            </p>
                            {spot.subcategory && (
                              <p className="text-[11px] text-[#7D5800] font-semibold pl-5">
                                Type: {spot.subcategory.replace('_', ' ')}
                              </p>
                            )}
                          </div>

                          {/* User-added Session Notes */}
                          {customTips.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-[#837560] uppercase">
                                Your Session Notes:
                              </p>
                              {customTips.map((tip, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-lg bg-white border border-[#E3DFD5] text-xs text-[#514532] flex items-start gap-1.5"
                                >
                                  <span className="text-[#2D6A4F] font-bold text-xs">✓</span>
                                  <p>{tip}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Note / Tip Input */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <label htmlFor={`tip-input-${spot.id}`} className="sr-only">
                              Add traveler tip for {spot.name}
                            </label>
                            <input
                              id={`tip-input-${spot.id}`}
                              type="text"
                              value={tipInput[spot.id] || ''}
                              onChange={(e) =>
                                setTipInput({ ...tipInput, [spot.id]: e.target.value })
                              }
                              onKeyDown={(e) => e.key === 'Enter' && handleAddTip(spot.id)}
                              placeholder="Add a travel tip or private note..."
                              className="flex-1 px-3 py-1.5 rounded-xl bg-white text-xs border border-[#E3DFD5] outline-none focus:border-[#2D6A4F] min-h-[36px]"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddTip(spot.id)}
                              className="p-2 rounded-xl bg-[#2D6A4F] text-white hover:bg-[#1B4332] transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                              aria-label="Save tip note"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}

                {/* Automatically observed inside the independent feed scroll pane. */}
                  <div ref={sentinelRef} className="pt-2 text-center" aria-live="polite">
                    {error && <p className="text-sm text-[#BC4749] mb-2">{error}</p>}
                    {!hasMore && !error && !loadingMore && <p className="text-sm text-[#837560] mb-2">You're caught up. Checking for new posts…</p>}
                    {(hasMore || error || loadingMore) && <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] text-xs font-extrabold text-[#582F0E] transition shadow-2xs cursor-pointer min-h-[44px]"
                    >
                      {loadingMore
                        ? 'Loading more destinations...'
                        : expired ? 'Refresh feed' : error ? 'Try again' : 'Load more posts'}
                    </button>}
                  </div>
              </div>
            )}
          </div>

          {/* Left Actions & Discovery Column - ORDER 2 on Mobile, ORDER 1 on Desktop */}
          <aside
            aria-label="Explore shortcuts"
            tabIndex={0}
            className="order-2 lg:order-1 explore-scroll space-y-3"
          >
            {/* Quick Portal Shortcuts */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">Quick Portals</h3>
                <span className="text-[10px] font-bold text-[#837560]">Hub</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <Link
                  href="/quests"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/80 text-[#B45309]">
                      <Zap className="w-3.5 h-3.5 fill-[#FFB703] text-[#B45309]" />
                    </div>
                    <span>Quests &amp; Trails</span>
                  </div>
                  <span className="text-[10px] text-[#2D6A4F] font-bold group-hover:translate-x-0.5 transition-transform">
                    Bounties →
                  </span>
                </Link>

                <Link
                  href="/saved"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/90 hover:border-[#FFB703] hover:bg-amber-50 transition group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200/70 text-[#7D5800]">
                      <Bookmark className="w-3.5 h-3.5 fill-current text-[#B45309]" />
                    </div>
                    <span>Saved on Device</span>
                  </div>
                  <span className="rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-black text-[#582F0E]">
                    {savedLibrary.spots.length + savedLibrary.quests.length}
                  </span>
                </Link>

                <Link
                  href="/community-choice/leaderboard"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/70 text-[#7D5800]">
                      <Trophy className="w-3.5 h-3.5 text-[#B45309]" />
                    </div>
                    <span>Community Choice</span>
                  </div>
                  <span className="text-[10px] text-[#7D5800] font-bold group-hover:translate-x-0.5 transition-transform">
                    Preview →
                  </span>
                </Link>

                <Link
                  href="/leaderboard"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-[#582F0E]">
                      <Award className="w-3.5 h-3.5 text-[#B45309]" />
                    </div>
                    <span>Scout Hall of Fame</span>
                  </div>
                  <span className="text-[10px] text-[#582F0E] font-bold group-hover:translate-x-0.5 transition-transform">
                    Sample →
                  </span>
                </Link>

                <Link
                  href="/shop"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[#2D6A4F]">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <span>MSME Partner Deals</span>
                  </div>
                  <span className="text-[10px] text-[#2D6A4F] font-bold group-hover:translate-x-0.5 transition-transform">
                    Shop →
                  </span>
                </Link>

                <Link
                  href="/about"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span>About JuanDerQuest</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold group-hover:translate-x-0.5 transition-transform">
                    Story →
                  </span>
                </Link>
              </div>
            </div>

            {/* Saved Places Continuation Block */}
            {savedSpotHighlights.length > 0 && (
              <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#B45309]">
                      Itinerary Planning
                    </span>
                    <h4 className="text-xs font-black text-[#582F0E]">Saved on this device</h4>
                  </div>
                  <Link href="/saved" className="text-[10px] font-bold text-[#2D6A4F] hover:underline">
                    Library ({savedLibrary.spots.length}) →
                  </Link>
                </div>

                <div className="space-y-1.5 pt-1">
                  {savedSpotHighlights.map((spot) => (
                    <Link
                      key={spot.id}
                      href={`/spots/${spot.slug}`}
                      className="flex items-center gap-2.5 rounded-xl border border-amber-200/70 bg-white/90 p-2 text-xs transition hover:border-[#FFB703] hover:shadow-2xs group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100/70 text-[#B45309]">
                        <Bookmark className="h-4 w-4 fill-current text-[#B45309]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                          {spot.name}
                        </p>
                        <p className="flex items-center gap-1 text-[10px] text-[#837560]">
                          <MapPin className="h-2.5 w-2.5 text-[#2D6A4F]" />
                          {spot.municipality}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Community Scouts Discovery (Real Public Profiles) */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                <div>
                  <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">
                    Community Scouts
                  </h3>
                  <span className="text-[10px] font-bold text-[#837560]">Public Travelers</span>
                </div>
              </div>

              {loadingScouts ? (
                <div className="py-4 text-center">
                  <span className="text-xs text-[#837560]">Loading scouts...</span>
                </div>
              ) : scoutError ? (
                <p role="alert" className="py-3 text-xs text-red-800">{scoutError}</p>
              ) : scouts.length === 0 ? (
                <div className="py-3 text-center px-2 space-y-1">
                  <p className="text-xs font-bold text-[#582F0E]">No public scouts yet</p>
                  <p className="text-[10px] text-[#837560]">
                    Enable your public profile in settings to appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {scouts.map((profile) => {
                    const initials = profile.display_name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0].toUpperCase())
                      .join('');

                    return (
                      <Link
                        key={profile.id}
                        href={travelerProfileHref(profile.id)}
                        className="flex items-center justify-between gap-2.5 rounded-xl p-2.5 hover:bg-[#FAF9F5] border border-transparent hover:border-[#E3DFD5] transition group min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-[11px] font-black text-white shadow-2xs group-hover:ring-2 group-hover:ring-[#FFB703]/50 transition overflow-hidden">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{initials || 'TR'}</span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="truncate text-xs font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                                {profile.display_name}
                              </span>
                            </div>
                            <span className="block truncate text-[10px] text-[#837560]">
                              {profile.handle ? `@${profile.handle} · ` : ''}
                              {profile.scout_reputation ?? 0} Rep
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#2D6A4F] group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Destination Spotlight & Preview Standings - ORDER 3 */}
          <aside
            aria-label="Destination recommendations"
            tabIndex={0}
            className="order-3 lg:order-3 explore-scroll space-y-3"
          >
            {/* Spotlight Card: Shows distinct spot, not identical duplicate of hero spot */}
            {spotlightSpot && (
              <article className="overflow-hidden rounded-2xl border border-emerald-200/90 bg-white shadow-xs hover:shadow-md transition-all duration-300">
                <Link href={`/spots/${spotlightSpot.slug}`} className="block group">
                  <DestinationMedia
                    src={spotlightSpot.imageUrl}
                    alt={spotlightSpot.name}
                    destinationName={spotlightSpot.name}
                    municipality={spotlightSpot.municipality}
                    aspectRatio="card"
                  />
                </Link>
                <div className="space-y-2.5 p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#2D6A4F]">
                    <Sparkles className="h-3 w-3" />
                    Spotlight Destination
                  </span>
                  <div>
                    <h2 className="text-base font-black leading-snug text-[#582F0E]">
                      {spotlightSpot.name}
                    </h2>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-[#2D6A4F]">
                      <MapPin className="h-3 w-3" />
                      {spotlightSpot.municipality} · Pangasinan
                    </p>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-[#514532]">
                    {spotlightSpot.description}
                  </p>
                  <Link
                    href={`/spots/${spotlightSpot.slug}`}
                    className="flex w-full items-center justify-center rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] px-3 py-2 text-xs font-bold text-white transition shadow-xs active:scale-95 min-h-[38px]"
                  >
                    Explore Destination
                  </Link>
                </div>
              </article>
            )}

            {/* Community Choice Standings Widget (Truthfully Labeled Preview) */}
            <section className="rounded-2xl border border-[#E3DFD5] bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#B45309]">
                    Community Choice (Preview)
                  </span>
                  <h3 className="text-xs font-black text-[#582F0E]">Sample Monthly Standings</h3>
                </div>
                <Trophy className="h-4 w-4 text-[#FFB703] fill-[#FFB703]" />
              </div>

              <div className="space-y-2 pt-0.5">
                {communityChoicePreview.entries.slice(0, 3).map((entry) => {
                  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉';
                  return (
                    <Link
                      key={entry.slug}
                      href={`/spots/${entry.slug}`}
                      className="block rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]/80 p-2.5 transition hover:bg-white hover:border-[#2D6A4F]/40 group"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm">{medal}</span>
                          <span className="truncate text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                            {entry.name}
                          </span>
                        </div>
                        <span className="shrink-0 text-[10px] font-black text-[#2D6A4F]">
                          {entry.share}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full rounded-full bg-[#2D6A4F]"
                          style={{ width: `${entry.share}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/community-choice/leaderboard"
                className="mt-2 flex w-full items-center justify-center rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] hover:bg-white px-3 py-2 text-[10px] font-bold text-[#2D6A4F] transition min-h-[36px]"
              >
                Full Leaderboard Preview →
              </Link>
              <p className="text-center text-[9px] text-[#837560] leading-tight">
                Preview rankings · Off-chain community demonstration
              </p>
            </section>
          </aside>
        </div>
      </div>
    </Navigation>
  );
}
