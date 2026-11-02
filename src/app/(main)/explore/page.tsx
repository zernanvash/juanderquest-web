'use client';
import { travelerProfileHref } from '@/lib/preview';
import { appRoutes } from '@/lib/routes';

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
  Bookmark,
  Award,
  AlertTriangle,
  Send,
  CheckCircle2,
  Tag,
  Zap,
  ChevronDown,
  Info,
  Clock,
  Flag
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRankedFeed } from '@/lib/use-ranked-feed';
import { SpotCardSkeleton } from '@/components/Skeleton';
import { useSavedLibrary } from '@/lib/saved-library';
import { JuanChoiceSpotlightCard } from '@/components/JuanChoiceSpotlightCard';
import { getPublicJuanChoiceSpotlight, planJuanChoicePlacement, type JuanChoiceSpotlight } from '@/lib/juanchoice';
import { DestinationMedia } from '@/components/DestinationMedia';
import { SpotReportModal } from '@/components/SpotReportModal';
import { PixelHeart } from '@/components/PixelIcons';
import { getLocalLikedSpots, toggleSpotLike } from '@/lib/api';
import { DestinationBadgeList, UserNametag } from '@/components/Badges';
import {
  getSampleDestinationBadges,
  SAMPLE_USER_BADGES,
  getActiveNametagBadges,
} from '@/lib/badges';
import { triggerTaskCompletion } from '@/lib/gamification';

function getAuthorBadges(spotId: string, authorName: string, currentUser?: { displayName?: string }) {
  if (currentUser?.displayName && authorName.toLowerCase() === currentUser.displayName.toLowerCase()) {
    return getActiveNametagBadges();
  }
  let hash = 0;
  for (let i = 0; i < authorName.length; i++) {
    hash = (hash << 5) - hash + authorName.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % SAMPLE_USER_BADGES.length;
  return [SAMPLE_USER_BADGES[idx]];
}

export default function ExplorePage() {
  const { user } = useAuth();
  const { spots, loading, loadingMore, error, hasMore, expired, sentinelRef, feedRef, loadSpots, handleLoadMore } = useRankedFeed(user?.id || 'guest');
  const [likes, setLikes] = useState<Record<string, { isLiked: boolean }>>({});
  const [reportingSpot, setReportingSpot] = useState<{ id: string; name: string } | null>(null);
  const [juanChoiceSpotlight, setJuanChoiceSpotlight] = useState<JuanChoiceSpotlight | null>(null);
  const { isSaved, toggle: toggleSaved } = useSavedLibrary();

  // Restore liked spots from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const localLikes = getLocalLikedSpots();
      const initialMap: Record<string, { isLiked: boolean }> = {};
      Object.keys(localLikes).forEach((id) => {
        if (localLikes[id]) initialMap[id] = { isLiked: true };
      });
      setLikes((prev) => ({ ...initialMap, ...prev }));
    } catch {}
  }, []);

  // Merge server liked status when spots feed loads
  useEffect(() => {
    if (!spots.length) return;
    setLikes((prev) => {
      let changed = false;
      const next = { ...prev };
      spots.forEach((s) => {
        if (s.liked && !next[s.id]?.isLiked) {
          next[s.id] = { isLiked: true };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [spots]);

  useEffect(() => {
    const controller = new AbortController();
    void getPublicJuanChoiceSpotlight(controller.signal).then(value => {
      if (!controller.signal.aborted) setJuanChoiceSpotlight(value);
    }).catch(() => { if (!controller.signal.aborted) setJuanChoiceSpotlight(null); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, []);

  const handleToggleLike = async (spotId: string) => {
    const current = likes[spotId]?.isLiked ?? Boolean(spots.find((s) => s.id === spotId)?.liked);
    const nextLiked = !current;
    
    // Instant UI reaction
    setLikes((prev) => ({
      ...prev,
      [spotId]: {
        isLiked: nextLiked,
      },
    }));

    if (nextLiked) {
      triggerTaskCompletion('daily_explore');
    }

    // Persist in localStorage and sync with server
    await toggleSpotLike(spotId, nextLiked);
  };

  const toggleSave = (spotId: string) => {
    const willBeSaved = !isSaved('spots', spotId);
    toggleSaved('spots', spotId);
    if (willBeSaved) {
      triggerTaskCompletion('daily_explore');
    }
  };

  const { spotlight: featuredChoice, ordinary: visibleSpots, insertionIndex: choiceInsertionIndex } = planJuanChoicePlacement(spots, juanChoiceSpotlight);

  return (
    <div className="space-y-4">
            {/* Quick Share / Post Bar */}
            <div className="bg-white rounded-2xl p-4 border border-[var(--color-border-default)] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-brand-primary)] text-white font-bold flex items-center justify-center text-sm shrink-0">
                {user ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <Link
                href="/spots/new"
                className="flex-1 min-w-0 bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-default)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text-muted)] font-medium transition cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="truncate">Share a photo, hidden beach, heritage shrine, or tip...</span>
                <div className="flex items-center gap-1.5 text-[var(--color-brand-primary)] font-bold shrink-0">
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Add Spot</span>
                </div>
              </Link>
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
            ) : spots.length === 0 && !featuredChoice ? (
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
                  const likeState = likes[spot.id] ?? { isLiked: Boolean(spot.liked) };
                  const isFeaturedHero = index === 0;

                  // Extract concise icon tags for title (max 2)
                  const iconTags: string[] = [];
                  if (spot.crowdStatus === 'quiet') {
                    iconTags.push('🌿');
                  } else if (spot.crowdStatus === 'estimated_busy') {
                    iconTags.push('⚠️');
                  }
                  if (spot.category) {
                    const cat = spot.category.toLowerCase();
                    if (cat.includes('beach') || cat.includes('water') || cat.includes('sea')) iconTags.push('🌊');
                    else if (cat.includes('nature') || cat.includes('park') || cat.includes('outdoor')) iconTags.push('🌴');
                    else if (cat.includes('heritage') || cat.includes('historic') || cat.includes('shrine') || cat.includes('church')) iconTags.push('🏛️');
                    else if (cat.includes('eat') || cat.includes('food') || cat.includes('restaurant')) iconTags.push('🍲');
                    else if (cat.includes('mountain') || cat.includes('hill')) iconTags.push('⛰️');
                  }
                  const displayIconTags = iconTags.slice(0, 2);

                  // Temporary author display: show user's account "@zernan"
                  const displayAuthorName = '@zernan';

                  return (<React.Fragment key={spot.id}>
                    {featuredChoice && choiceInsertionIndex === index && <JuanChoiceSpotlightCard spotlight={featuredChoice} />}
                    <article
                      className="bg-white rounded-2xl border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/40 shadow-xs hover:shadow-md transition-all duration-300 ease-out overflow-hidden"
                    >
                      {/* Compact Post Header & Caption Area */}
                      <div className="px-4 pt-3.5 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3 space-y-2">
                        {isFeaturedHero && (
                          <div className="flex flex-wrap items-center gap-2 border-b border-amber-100 pb-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-brand-primary)]">
                              <Sparkles className="h-3 w-3 text-[#FFB703]" />
                              Featured Destination
                            </span>
                          </div>
                        )}

                        {/* Meta Header */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] leading-none">
                          <span className="font-bold text-[var(--color-brand-primary)] flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {spot.municipality}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 flex-wrap">
                            <span>Shared by</span>
                            <UserNametag
                              displayName={displayAuthorName}
                              badges={getAuthorBadges(spot.id, displayAuthorName, user ?? undefined)}
                              size="md"
                            />
                          </span>

                          {/* Provenance Badge & Report */}
                          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                            {spot.trustLevel === 'lgu_verified' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                                <ShieldCheck className="w-3 h-3" />
                                <span>LGU Verified</span>
                              </span>
                            )}

                            {/* Report Inaccurate Info / Hazard / Content */}
                            <button
                              type="button"
                              onClick={() => setReportingSpot({ id: spot.id, name: spot.name })}
                              className="inline-flex items-center justify-center p-1 rounded text-[#837560] hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer"
                              title="Report inaccurate info, hazard, or inappropriate post"
                              aria-label={`Report post for ${spot.name}`}
                            >
                              <Flag className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Title with Inlined Icon Tags & Micro Active Quest Indicator */}
                        <div className="flex items-start justify-between gap-2.5">
                          <Link href={appRoutes.spot(spot.id)} className="min-w-0 flex-1 group">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h2 className="text-base sm:text-lg font-bold text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition leading-snug">
                                {spot.name}
                                {displayIconTags.length > 0 && (
                                  <span className="ml-1.5 text-sm font-normal select-none">
                                    {displayIconTags.join(' ')}
                                  </span>
                                )}
                              </h2>
                              {spot.isTest && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Alpha
                                </span>
                              )}
                            </div>
                          </Link>
                          {/* Active Quest Indicator where the badges were */}
                          {spot.questId && (
                            <Link
                              href={appRoutes.quest(spot.questId)}
                              className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200 shadow-2xs transition"
                              title="Active Eco-Quest available for this destination"
                            >
                              <Trophy className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Eco-Quest</span>
                            </Link>
                          )}
                        </div>

                        {/* Description Text */}
                        <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                          {spot.description}
                        </p>
                      </div>

                      {/* Destination Media */}
                      <DestinationMedia
                        key={spot.imageUrl || 'no-media'}
                        src={spot.imageUrl}
                        alt={spot.name}
                        destinationName={spot.name}
                        municipality={spot.municipality}
                        priority={index === 0}
                        aspectRatio="card"
                        hideUnavailable
                        href={appRoutes.spot(spot.id)}
                        className="border-y border-[#E3DFD5]"
                      />

                      {/* Interactive Engagement Action Row (Like, Bookmark, and Destination Badges aligned right) */}
                      <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 bg-white flex items-center justify-between gap-2 border-t border-[#E8E5DE]/80">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {/* Instagram-style Heart Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleLike(spot.id)}
                            className={`btn-tactile flex items-center justify-center w-10 h-10 rounded-xl transition duration-150 cursor-pointer ${
                              likeState.isLiked
                                ? 'bg-rose-50 text-rose-600 font-bold border border-rose-200 shadow-2xs'
                                : 'hover:bg-[#FAF9F5] text-[#582F0E] border border-transparent'
                            }`}
                            aria-label={likeState.isLiked ? `Liked ${spot.name}` : `Like ${spot.name}`}
                            title={likeState.isLiked ? 'Liked' : 'Like'}
                          >
                            <PixelHeart isLiked={likeState.isLiked} size="md" />
                          </button>

                          {/* Bookmark / Save */}
                          <button
                            type="button"
                            onClick={() => toggleSave(spot.id)}
                            className={`btn-tactile flex items-center justify-center w-10 h-10 rounded-xl transition active:scale-95 cursor-pointer ${
                              isSaved('spots', spot.id)
                                ? 'bg-amber-100/80 text-[#7D5800] font-bold border border-amber-300/80 shadow-2xs'
                                : 'hover:bg-[#FAF9F5] text-[#582F0E] border border-transparent'
                            }`}
                            aria-label={isSaved('spots', spot.id) ? 'Remove bookmark' : 'Save to device'}
                            title={isSaved('spots', spot.id) ? 'Saved' : 'Save'}
                          >
                            <Bookmark
                              className={`w-5 h-5 ${
                                isSaved('spots', spot.id)
                                  ? 'fill-current text-[#B45309]'
                                  : 'text-[#837560]'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Destination Badges on the bottom, right aligned */}
                        <div className="flex items-center">
                          <DestinationBadgeList
                            badges={getSampleDestinationBadges(spot.id, spot.category)}
                            maxDisplay={3}
                            size="sm"
                            iconOnly={true}
                          />
                        </div>
                      </div>
                    </article>
                    </React.Fragment>
                  );
                })}
                {featuredChoice && choiceInsertionIndex === visibleSpots.length && <JuanChoiceSpotlightCard spotlight={featuredChoice} />}

                {/* Automatically observed inside the independent feed scroll pane. */}
                  <div ref={sentinelRef} className="pt-2 text-center" aria-live="polite">
                    {error && <p className="text-sm text-[#BC4749] mb-2">{error}</p>}
                    {!hasMore && !error && !loadingMore && <p className="text-sm text-[#837560] mb-2">You&apos;re caught up. Checking for new posts…</p>}
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

      {/* Tourism Moderation & Flag Report Modal */}
      {reportingSpot && (
        <SpotReportModal
          isOpen={Boolean(reportingSpot)}
          spotId={reportingSpot.id}
          spotName={reportingSpot.name}
          onClose={() => setReportingSpot(null)}
        />
      )}
    </div>
  );
}
