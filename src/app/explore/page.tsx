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
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import { useRankedFeed } from '@/lib/use-ranked-feed';
import { SpotCardSkeleton } from '@/components/Skeleton';
import { useSavedLibrary } from '@/lib/saved-library';
import { JuanChoiceRail } from '@/components/JuanChoiceRail';
import { JuanChoiceSpotlightCard } from '@/components/JuanChoiceSpotlightCard';
import { getPublicJuanChoiceSpotlight, planJuanChoicePlacement, type JuanChoiceSpotlight } from '@/lib/juanchoice';
import { fetchPublicTravelers, type PublicTravelerSummary } from '@/lib/social';
import { DestinationMedia } from '@/components/DestinationMedia';
import { SpotReportModal } from '@/components/SpotReportModal';
import { PixelHeart } from '@/components/PixelIcons';
import { getLocalLikedSpots, toggleSpotLike } from '@/lib/api';
import { DestinationBadgeList, UserNametag, UserBadgesRow } from '@/components/Badges';
import {
  getSampleDestinationBadges,
  SAMPLE_USER_BADGES,
  getActiveNametagBadges,
} from '@/lib/badges';

import { SignInSheet } from '@/components/SignInSheet';
import { getCategoryIllustrationUrl } from '@/components/DestinationMedia';

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
  const [signInReason, setSignInReason] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('ALL');
  const { library: savedLibrary, toggle: toggleSaved, isSaved } = useSavedLibrary();
  const [scouts, setScouts] = useState<PublicTravelerSummary[]>([]);
  const [loadingScouts, setLoadingScouts] = useState(true);
  const [scoutError, setScoutError] = useState('');
  const [juanChoiceSpotlight, setJuanChoiceSpotlight] = useState<JuanChoiceSpotlight | null>(null);

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
    let mounted = true;
    fetchPublicTravelers(3).then((items) => {
      if (mounted) {
        setScouts(items);
        setLoadingScouts(false);
      }
    }).catch((error) => {
      if (mounted) { setScoutError(error.message); setLoadingScouts(false); }
    });

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleLike = async (spotId: string) => {
    if (!user) {
      setSignInReason('Sign in to like destinations and save your favorites across devices.');
      return;
    }
    const current = likes[spotId]?.isLiked ?? Boolean(spots.find((s) => s.id === spotId)?.liked);
    const nextLiked = !current;
    
    // Instant UI reaction
    setLikes((prev) => ({
      ...prev,
      [spotId]: {
        isLiked: nextLiked,
      },
    }));

    // Persist in localStorage and sync with server
    await toggleSpotLike(spotId, nextLiked);
  };

  const toggleSave = (spotId: string) => {
    toggleSaved('spots', spotId);
  };

  const savedSpotHighlights = spots.filter((s) => savedLibrary.spots.includes(s.id)).slice(0, 3);

  const { spotlight: featuredChoice, ordinary: allOrdinarySpots, insertionIndex: choiceInsertionIndex } = planJuanChoicePlacement(spots, juanChoiceSpotlight);

  const categories = Array.from(new Set(allOrdinarySpots.map((s) => s.category).filter((c): c is string => Boolean(c)))).slice(0, 5);
  const municipalities = Array.from(new Set(allOrdinarySpots.map((s) => s.municipality).filter(Boolean))).slice(0, 5);

  const visibleSpots = allOrdinarySpots.filter((s) => {
    const matchesCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchesMuni = selectedMunicipality === 'ALL' || s.municipality === selectedMunicipality;
    return matchesCat && matchesMuni;
  });

  // Spotlight recommendations (only show photo hero when a photo exists)
  const topHeroSpot = allOrdinarySpots.find((s) => Boolean(s.imageUrl && s.imageUrl.trim())) || null;
  const trendingQuestSpots = allOrdinarySpots.filter((s) => Boolean(s.questId)).slice(0, 3);

  const exploreSidePanel = (
    <div className="space-y-4">
      {/* Featured Destination Spotlight Card (only when photo exists) */}
      {topHeroSpot && (
        <div className="p-3 space-y-2.5 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5]">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#582F0E]">
            <Sparkles className="w-4 h-4 text-[#FFB703]" />
            <span>Featured Destination</span>
          </div>
          <Link href={appRoutes.spot(topHeroSpot.id)} className="block space-y-1">
            <h4 className="text-xs font-bold text-[#2C221E]">{topHeroSpot.name}</h4>
            <p className="text-[10px] text-[#837560]">{topHeroSpot.municipality}</p>
          </Link>
        </div>
      )}

      {/* JuanChoice Spotlight Rail */}
      <JuanChoiceRail className="bg-transparent border-0 p-3 shadow-none space-y-3" />

      {/* Community Scouts Discovery */}
      <div className="p-3 space-y-3">
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
                  className="flex items-center justify-between gap-2.5 rounded-xl p-2.5 hover:bg-[#FAF9F5] transition group min-h-[44px]"
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate text-xs font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                          {profile.display_name}
                        </span>
                        <UserBadgesRow
                          userIdOrName={profile.id || profile.display_name}
                          size="xs"
                          enablePreviewModal={false}
                        />
                        {profile.is_test && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">Fictional</span>}
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

      {/* Saved Places Highlights */}
      {savedSpotHighlights.length > 0 && (
        <div className="p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#B45309]">
                Itinerary Planning
              </span>
              <h4 className="text-xs font-black text-[#582F0E]">Saved</h4>
            </div>
            <Link href="/saved" className="text-[10px] font-bold text-[#2D6A4F] hover:underline">
              Library ({savedLibrary.spots.length}) →
            </Link>
          </div>

          <div className="space-y-1.5 pt-1">
            {savedSpotHighlights.map((spot) => (
              <Link
                key={spot.id}
                href={appRoutes.spot(spot.id)}
                className="flex items-center gap-2.5 rounded-xl bg-white/90 p-2 text-xs transition hover:shadow-2xs group"
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
    </div>
  );

  return (
    <Navigation sidePanel={exploreSidePanel} sidePanelTitle="Explorer Highlights">
      <div className="space-y-4 lg:space-y-0 lg:h-full lg:max-h-full lg:min-h-0">
        {/* Structured 2-Column Post Stream (Desktop: Feed main, Right spotlight & scouts)
            Mobile: Single column feed leads first */}
        <div className="explore-columns grid grid-cols-1 gap-3 items-start lg:items-stretch lg:h-full lg:max-h-full lg:min-h-0">
          
          {/* Main Feed Column */}
          <div
            role="region"
            aria-label="Destination feed"
            ref={feedRef}
            tabIndex={0}
            className="order-1 lg:order-1 explore-scroll space-y-4 min-w-0"
          >
            {/* Header & Category / Municipality Filter Chips */}
            <div className="bg-white rounded-2xl p-4 border border-[var(--color-border-default)] shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg sm:text-xl font-black text-[var(--color-brand-brown)] tracking-tight">
                  Explore Pangasinan
                </h1>
              </div>

              {(categories.length > 0 || municipalities.length > 0) && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('ALL');
                      setSelectedMunicipality('ALL');
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition shrink-0 cursor-pointer ${
                      selectedCategory === 'ALL' && selectedMunicipality === 'ALL'
                        ? 'bg-[var(--color-brand-primary)] text-white'
                        : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={`cat-${cat}`}
                      type="button"
                      onClick={() => setSelectedCategory((prev) => (prev === cat ? 'ALL' : cat))}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition shrink-0 cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[var(--color-brand-primary)] text-white'
                          : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  {municipalities.map((muni) => (
                    <button
                      key={`muni-${muni}`}
                      type="button"
                      onClick={() => setSelectedMunicipality((prev) => (prev === muni ? 'ALL' : muni))}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition shrink-0 cursor-pointer ${
                        selectedMunicipality === muni
                          ? 'bg-[var(--color-brand-brown)] text-white'
                          : 'bg-[#FAF9F5] text-[#582F0E] border border-[#E3DFD5]'
                      }`}
                    >
                      📍 {muni}
                    </button>
                  ))}
                </div>
              )}
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
            ) : visibleSpots.length === 0 && !featuredChoice ? (
              <div className="bg-white rounded-3xl p-12 border border-[var(--color-border-default)] text-center space-y-3 shadow-xs">
                <Compass className="w-10 h-10 text-[var(--color-border-default)] mx-auto" />
                <h3 className="font-bold text-sm text-[var(--color-brand-brown)]">No destinations found in feed</h3>
                <p className="text-xs text-[var(--color-text-muted)]">The community feed could not find active destinations matching your filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSelectedMunicipality('ALL');
                    loadSpots();
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-xs font-bold text-[var(--color-brand-brown)] hover:bg-white transition cursor-pointer"
                >
                  Reset &amp; refresh feed
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleSpots.map((spot, index) => {
                  const likeState = likes[spot.id] ?? { isLiked: Boolean(spot.liked) };
                  const isFeaturedHero = index === 0;
                  const hasPhoto = Boolean(spot.imageUrl && spot.imageUrl.trim());

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

                  const displayAuthorName = spot.sourceName?.trim()
                    ? spot.sourceName
                    : 'Pangasinan Tourism';
                  const topRecommendationReason = spot.recommendationReasons?.[0] ?? null;

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

                        {/* Recommendation Reason (at most 1 truthful signal per card) */}
                        {topRecommendationReason && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5" aria-label="Recommendation signals">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF9F5] text-[10px] font-bold text-[#6C584C] border border-[#E8E5DE]"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-[#D4A373] shrink-0" />
                              <span>{topRecommendationReason}</span>
                            </span>
                          </div>
                        )}

                        {/* Description Text */}
                        <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                          {spot.description}
                        </p>
                      </div>

                      {/* Destination Media: full card when photo exists, 64px category illustration strip when no photo */}
                      {hasPhoto ? (
                        <DestinationMedia
                          key={spot.imageUrl}
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
                      ) : (
                        <Link
                          href={appRoutes.spot(spot.id)}
                          className="block relative h-16 w-full overflow-hidden border-y border-[#E3DFD5] bg-[#FAF9F5]"
                        >
                          <img
                            src={getCategoryIllustrationUrl(spot.category)}
                            alt=""
                            aria-hidden="true"
                            className="w-full h-full object-cover opacity-85"
                          />
                          <span className="absolute right-3 bottom-1.5 px-2 py-0.5 rounded-full bg-stone-950/65 text-white text-[10px] font-bold">
                            {spot.category || 'Destination'} · Explore →
                          </span>
                        </Link>
                      )}

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
          </div>

          {/* Right Column: Featured Destination Spotlight, Trending Eco-Quests & JuanChoice */}
          <aside
            aria-label="Featured Destination"
            tabIndex={0}
            className="hidden lg:block lg:order-2 explore-scroll space-y-3"
          >
            {topHeroSpot && (
              <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 shadow-xs space-y-3 min-w-0">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#FFB703]" />
                    <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">
                      Featured Destination
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Spotlight
                  </span>
                </div>

                <Link href={appRoutes.spot(topHeroSpot.id)} className="block group space-y-2.5">
                  <DestinationMedia
                    src={topHeroSpot.imageUrl}
                    alt={topHeroSpot.name}
                    destinationName={topHeroSpot.name}
                    municipality={topHeroSpot.municipality}
                    aspectRatio="card"
                    className="rounded-xl overflow-hidden border border-[#E3DFD5]"
                  />

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-brand-primary)]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{topHeroSpot.municipality}</span>
                    </div>

                    <h4 className="text-sm font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition leading-snug">
                      {topHeroSpot.name}
                    </h4>

                    {topHeroSpot.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed">
                        {topHeroSpot.description}
                      </p>
                    )}
                  </div>
                </Link>

                <div className="pt-2 border-t border-[#F2EFE9] flex items-center justify-between">
                  <Link
                    href={appRoutes.spot(topHeroSpot.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand-primary)] hover:underline"
                  >
                    <span>View Destination</span>
                    <span>→</span>
                  </Link>

                  {topHeroSpot.questId && (
                    <Link
                      href={appRoutes.quest(topHeroSpot.questId)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200"
                    >
                      <Trophy className="w-3 h-3 text-amber-600" />
                      <span>Eco-Quest</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Trending Eco-Quests Card */}
            <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 shadow-xs space-y-3 min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[#2D6A4F]" />
                  <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">
                    Trending Eco-Quests
                  </h3>
                </div>
                <Link href="/quests" className="text-[11px] font-bold text-[#2D6A4F] hover:underline">
                  All →
                </Link>
              </div>
              {trendingQuestSpots.length > 0 ? (
                <div className="space-y-2">
                  {trendingQuestSpots.map((qs) => (
                    <Link
                      key={qs.id}
                      href={qs.questId ? appRoutes.quest(qs.questId) : appRoutes.spot(qs.id)}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-emerald-50/40 border border-[#E8E5DE] transition group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2C221E] group-hover:text-[#2D6A4F] truncate">
                          {qs.name}
                        </p>
                        <p className="text-[10px] text-[#837560] truncate">
                          {qs.municipality} · Play Eco-Quest
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                        +50 pts
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[#6C584C]">
                    Complete on-site Eco-Quests across Pangasinan to earn points and Explorer XP.
                  </p>
                  <Link
                    href="/quests"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2D6A4F] hover:underline"
                  >
                    <span>Browse Eco-Quests →</span>
                  </Link>
                </div>
              )}
            </div>

            {/* JuanChoice Spotlight in Rail */}
            <JuanChoiceRail />
          </aside>
        </div>
      </div>

      {/* Tourism Moderation & Flag Report Modal */}
      {reportingSpot && (
        <SpotReportModal
          isOpen={Boolean(reportingSpot)}
          spotId={reportingSpot.id}
          spotName={reportingSpot.name}
          onClose={() => setReportingSpot(null)}
        />
      )}

      <SignInSheet
        open={Boolean(signInReason)}
        reason={signInReason ?? undefined}
        onClose={() => setSignInReason(null)}
      />
    </Navigation>
  );
}
