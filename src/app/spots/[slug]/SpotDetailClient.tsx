'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Trophy,
  Clock,
  MessageSquare,
  Bookmark,
  Share2,
  Sparkles,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Compass,
  Film,
  Maximize2,
  X,
  ExternalLink,
  Check,
  Award,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel, isVideoMedia, createAuthorQuest, toggleSpotLike, getLocalLikedSpots } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useAuth } from '@/lib/auth';
import { SpotDetailSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DestinationMedia } from '@/components/DestinationMedia';
import { appRoutes } from '@/lib/routes';
import { MiniMapPreview } from '@/components/MiniMapPreview';
import { PixelHeart } from '@/components/PixelIcons';
import { SpotCommentSection } from '@/components/SpotCommentSection';
import { useSavedLibrary } from '@/lib/saved-library';
import { DestinationBadgeList, UserNametag } from '@/components/Badges';
import { getSampleDestinationBadges, SAMPLE_USER_BADGES, getActiveNametagBadges } from '@/lib/badges';

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

interface SpotDetailClientProps {
  slug: string;
}

export const SpotDetailClient: React.FC<SpotDetailClientProps> = ({ slug }) => {
  const router = useRouter();
  const [spot, setSpot] = useState<SpotModel | null>(null);
  const [alternatives, setAlternatives] = useState<SpotModel[]>([]);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const { toggle: toggleSaved, isSaved: isSpotSaved } = useSavedLibrary();
  const isSaved = spot ? isSpotSaved('spots', spot.id) : false;
  const [activeSlide, setActiveSlide] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const { user } = useAuth();
  const isAuthor = Boolean(user?.id && spot?.createdBy && user.id === spot.createdBy);

  // Author Quest Creation State
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [questTitle, setQuestTitle] = useState('');
  const [questDescription, setQuestDescription] = useState('');
  const [questCategory, setQuestCategory] = useState<'eco' | 'cultural' | 'food_trade'>('eco');
  const [questRadius, setQuestRadius] = useState<number>(200);
  const [questReward, setQuestReward] = useState<50 | 75 | 100>(75);
  const [creatingQuest, setCreatingQuest] = useState(false);
  const [questError, setQuestError] = useState<string | null>(null);
  const [questSuccess, setQuestSuccess] = useState<string | null>(null);

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spot) return;
    setCreatingQuest(true);
    setQuestError(null);
    setQuestSuccess(null);

    try {
      const createdQuest = await createAuthorQuest(spot.id, {
        title: questTitle,
        description: questDescription,
        category: questCategory,
        radius_meters: questRadius,
        reward_points: questReward,
      });

      setQuestSuccess(`Quest "${createdQuest.title}" created successfully and linked to ${spot.name}!`);
      setSpot((prev) => prev ? { ...prev, questId: createdQuest.id } : null);
      setTimeout(() => {
        setIsQuestModalOpen(false);
        setQuestSuccess(null);
      }, 1800);
    } catch (err: any) {
      setQuestError(err.response?.data?.error?.message || err.message || 'Error communicating with the server.');
    } finally {
      setCreatingQuest(false);
    }
  };

  // Touch swipe state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetchWithCache(
      `spot_detail_${slug}`,
      async () => {
        const [detail, alts] = await Promise.all([
          api.get(`/spots/${slug}`),
          api.get(`/spots/${slug}/alternatives`).catch(() => ({ data: { data: [] } })),
        ]);
        return {
          spot: normalizeSpot(detail.data.data),
          alternatives: (alts.data?.data as Parameters<typeof normalizeSpot>[0][] || []).map(normalizeSpot),
        };
      },
      { ttlMs: 120_000 }
    )
      .then(({ data }) => {
        setSpot(data.spot);
        setAlternatives(data.alternatives);
        setIsLiked(Boolean(data.spot.liked) || Boolean(getLocalLikedSpots()[data.spot.id]));
        if (slug !== data.spot.id) router.replace(appRoutes.spot(data.spot.id));
        api.post(`/spots/${data.spot.id}/interactions`, { type: 'view' }).catch(() => {});
      })
      .catch((err) => {
        const errorObj = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
        setError(errorObj.response?.status === 404
          ? 'Destination or post not found.'
          : 'Destination temporarily unavailable. Please try again.');
      });
  }, [slug, router]);

  // Clean slides collection (only actual destination photos, no forced placeholder)
  const slides = useMemo(() => {
    if (!spot) return [];
    const collected = [
      spot.imageUrl,
      ...(spot.photos || []),
    ].filter(Boolean) as string[];
    const unique = Array.from(new Set(collected));
    return unique.length > 0 ? unique : ['/bg_landscape.png'];
  }, [spot]);

  const currentSlideUrl = slides[activeSlide] || slides[0] || '';

  // Keyboard navigation for carousel & lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (slides.length > 1) {
        if (e.key === 'ArrowRight') {
          setActiveSlide((prev) => (prev + 1) % slides.length);
        } else if (e.key === 'ArrowLeft') {
          setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
        }
      }
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isLightboxOpen]);

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance && slides.length > 1) {
      // Swiped left -> next
      setActiveSlide((prev) => (prev + 1) % slides.length);
    } else if (distance < -minSwipeDistance && slides.length > 1) {
      // Swiped right -> prev
      setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleToggleLike = async () => {
    if (!spot) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    await toggleSpotLike(spot.id, nextState);
  };

  const handleToggleSave = () => {
    if (!spot) return;
    const nextSaved = toggleSaved('spots', spot.id);
    // The saved library is browser-local. Keep the optional server signal in sync
    // for signed-in travelers, without making a network outage erase their bookmark.
    if (user?.id) {
      void (nextSaved
        ? api.put(`/spots/${spot.id}/save`)
        : api.delete(`/spots/${spot.id}/save`)).catch(() => {});
    }
  };

  const handleShare = async () => {
    if (!spot) return;
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: spot.name, url: window.location.href });
        return;
      } catch {
        // Fall back to clipboard
      }
    }
    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch {
        // Ignore clipboard failure
      }
    }
  };

  if (error) {
    return (
      <Navigation>
        <div className="bg-white rounded-3xl p-8 border border-red-200 text-center text-xs text-[#BC4749] space-y-3 max-w-lg mx-auto my-12 shadow-sm">
          <p className="font-bold text-sm">{error}</p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-bold text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Destinations</span>
          </Link>
        </div>
      </Navigation>
    );
  }

  if (!spot) {
    return (
      <Navigation>
        <SpotDetailSkeleton />
      </Navigation>
    );
  }

  const trackDirections = () =>
    api.post(`/spots/${spot.id}/interactions`, { type: 'directions' }).catch(() => {});
  const navigateUrl = `/navigate?name=${encodeURIComponent(spot.name)}&lat=${spot.gpsLat}&lng=${spot.gpsLng}&address=${encodeURIComponent(spot.address)}`;

  return (
    <Navigation theater>
      <ErrorBoundary fallbackTitle="Unable to load Destination Spot">
        <div className="w-full flex flex-col">
          {/* 1. FULL-SCREEN HERO PHOTO VIEWPORT (Cropped with object-cover, Scroll Indicator) */}
          <section
            aria-label={`Full-screen showcase for ${spot.name}`}
            className="w-full h-[calc(100vh-64px)] sm:h-[calc(100dvh-64px)] relative select-none overflow-hidden bg-black"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            tabIndex={0}
          >
            {/* Main Full-Screen Cropped Photo / Video */}
            <div
              className="absolute inset-0 w-full h-full cursor-pointer"
              onClick={() => setIsLightboxOpen(true)}
              title="Click for fullscreen lightbox"
            >
              {isVideoMedia(currentSlideUrl) ? (
                <video
                  src={currentSlideUrl}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={currentSlideUrl}
                  alt={`${spot.name} - View ${activeSlide + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              )}

              {/* Cinematic Vignette & Bottom/Top Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/40 pointer-events-none" />
            </div>

            {/* Top Floating Control Bar */}
            <div className="absolute top-4 sm:top-6 left-4 sm:left-8 right-4 sm:right-8 z-20 flex items-center justify-between pointer-events-none">
              {/* Back Button */}
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-black/55 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white font-bold text-xs transition shadow-lg pointer-events-auto cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-[#FFB703]" />
                <span className="hidden sm:inline">Back to Explore</span>
                <span className="sm:hidden">Explore</span>
              </Link>

              {/* Center Breadcrumb (Desktop) */}
              <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white/95 text-xs font-semibold shadow-md pointer-events-auto">
                <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>{spot.municipality}</span>
                <span>•</span>
                <span className="capitalize">{spot.subcategory.replace('_', ' ')}</span>
              </div>

              {/* Top Right Controls (Counter & Fullscreen Lightbox) */}
              <div className="flex items-center gap-2 pointer-events-auto">
                {slides.length > 1 && (
                  <div className="px-3 py-1.5 rounded-xl sm:rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
                    <Camera className="w-3.5 h-3.5 text-[#FFB703]" />
                    <span>{activeSlide + 1} / {slides.length}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
                  title="Open fullscreen lightbox"
                  aria-label="Open fullscreen photo view"
                >
                  <Maximize2 className="w-4 h-4 text-[#FFB703]" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </button>
              </div>
            </div>

            {/* Large Prev / Next Navigation Arrows (when multiple photos exist) */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
                  }}
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/25 flex items-center justify-center transition shadow-2xl cursor-pointer z-20 active:scale-90"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlide((prev) => (prev + 1) % slides.length);
                  }}
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/25 flex items-center justify-center transition shadow-2xl cursor-pointer z-20 active:scale-90"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>

                {/* Jump Dots Floating above Scroll Indicator */}
                <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 z-20">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlide(idx);
                      }}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeSlide === idx ? 'w-6 sm:w-8 bg-[#FFB703]' : 'w-2 bg-white/40 hover:bg-white/90'
                      }`}
                      aria-label={`Jump to photo ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Bottom-left Quick Destination Pill */}
            <div className="absolute bottom-5 sm:bottom-7 left-4 sm:left-8 z-20 text-white pointer-events-none max-w-xs sm:max-w-md drop-shadow-md">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#2D6A4F]/90 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider mb-1">
                {spot.category.replace('_', ' ')}
              </span>
              <h2 className="text-lg sm:text-2xl font-black line-clamp-1">
                {spot.name}
              </h2>
              <p className="text-xs text-white/90 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>{spot.municipality}, Pangasinan</span>
              </p>
            </div>

            {/* Subtle Scroll Down Indicator */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('spot-info');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 px-4 sm:px-5 py-2 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white/90 hover:text-white transition duration-200 cursor-pointer shadow-xl active:scale-95 group"
              aria-label="Scroll down to view details"
            >
              <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">Scroll for details</span>
              <ChevronDown className="w-4 h-4 text-[#FFB703] group-hover:translate-y-0.5 transition-transform animate-bounce" />
            </button>
          </section>

          {/* 2. INFORMATION SECTION BELOW FULL-SCREEN PHOTO (Navigated with Scroll) */}
          <div id="spot-info" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
            {/* Header Card & Action Bar */}
            <header className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-[#E3DFD5] shadow-xs space-y-5">
              {/* Badges & Meta */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#D8F3DC] text-[#2D6A4F] text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
                  <span>{spot.category.replace('_', ' ')}</span>
                </span>

                {spot.trustLevel === 'lgu_verified' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>LGU Verified Landmark</span>
                  </span>
                )}

                {spot.questId && (
                  <Link
                    href={appRoutes.quest(spot.questId)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-[#B45309] text-xs font-black border border-amber-200 hover:bg-amber-100 transition"
                  >
                    <Trophy className="w-3.5 h-3.5 text-[#FFB703]" />
                    <span>Linked Quest Trail</span>
                  </Link>
                )}

                {spot.isTest && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                    Fictional alpha post
                  </span>
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#582F0E] tracking-tight leading-tight">
                  {spot.name}
                </h1>

                {/* Destination Badges Showcase */}
                <DestinationBadgeList
                  badges={getSampleDestinationBadges(spot.id, spot.category)}
                  maxDisplay={5}
                  size="sm"
                  className="pt-1 pb-1"
                />

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#837560]">
                  <span className="flex items-center gap-1 font-semibold text-[#2D6A4F]">
                    <MapPin className="w-4 h-4" />
                    <span>{spot.address || spot.municipality}</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 flex-wrap">
                    <span>Shared by</span>
                    <UserNametag
                      displayName={spot.sourceName}
                      badges={getAuthorBadges(spot.id, spot.sourceName, user ?? undefined)}
                      size="sm"
                    />
                  </span>
                </div>
              </div>

              {/* Primary Navigation & Action Bar */}
              <div className="pt-4 border-t border-[#E8E5DE] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                  <Link
                    href={navigateUrl}
                    onClick={trackDirections}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs sm:text-sm font-extrabold shadow-sm transition active:scale-95 cursor-pointer min-h-[48px]"
                  >
                    <Compass className="w-4 h-4 text-[#FFB703]" />
                    <span>Navigate with Valhalla</span>
                  </Link>

                  {spot.questId ? (
                    <Link
                      href={appRoutes.quest(spot.questId)}
                      className="btn-tactile btn-sheen inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs sm:text-sm font-extrabold shadow-sm transition cursor-pointer min-h-[48px]"
                    >
                      <Trophy className="w-4 h-4 text-[#582F0E]" />
                      <span>Play Quest Trail</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/map?lat=${spot.gpsLat}&lng=${spot.gpsLng}&name=${encodeURIComponent(spot.name)}&spot=${spot.id}`}
                      className="btn-tactile inline-flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl bg-[#FAF9F5] hover:bg-white text-[#582F0E] border border-[#E3DFD5] text-xs font-bold transition cursor-pointer min-h-[48px]"
                    >
                      <MapPin className="w-4 h-4 text-[#2D6A4F]" />
                      <span>View on Map</span>
                    </Link>
                  )}
                </div>

                {/* Engagement Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleLike}
                    className={`btn-tactile flex items-center justify-center p-2.5 rounded-xl border transition cursor-pointer min-h-[44px] min-w-[44px] ${
                      isLiked
                        ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold shadow-2xs'
                        : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#582F0E] hover:border-rose-300'
                    }`}
                    aria-label={isLiked ? 'Liked destination' : 'Like destination'}
                    aria-pressed={isLiked}
                    title={isLiked ? 'Liked' : 'Like'}
                  >
                    <PixelHeart isLiked={isLiked} size="md" />
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSave}
                    className={`btn-tactile flex items-center justify-center p-2.5 rounded-xl border transition cursor-pointer min-h-[44px] min-w-[44px] ${
                      isSaved
                        ? 'bg-amber-100 border-amber-300 text-[#7D5800] font-bold shadow-2xs'
                        : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#582F0E] hover:border-amber-300'
                    }`}
                    aria-label={isSaved ? 'Saved' : 'Save'}
                    aria-pressed={isSaved}
                    title={isSaved ? 'Saved' : 'Save'}
                  >
                    <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current text-[#B45309]' : 'text-gray-400'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] text-[#582F0E] transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Share Destination"
                  >
                    {shareCopied ? <Check className="w-4 h-4 text-[#2D6A4F]" /> : <Share2 className="w-4 h-4" />}
                  </button>

                  {/* Crowd Status Pill */}
                  {spot.crowdStatus === 'estimated_busy' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#FFF3E8] border border-[#FFD8B8] text-xs font-bold text-[#D95D00]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D95D00]" />
                      <span>Peak Hours</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#2D6A4F]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
                      <span>Low Crowd</span>
                    </span>
                  )}
                </div>
              </div>
            </header>

            {/* Two-Column Maximized Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left/Main Column (lg:col-span-8) */}
              <div className="lg:col-span-8 space-y-6">
                {/* About Narrative */}
                <section className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#E3DFD5] shadow-xs space-y-4">
                  <h2 className="text-xl sm:text-2xl font-black text-[#582F0E]">
                    About {spot.name}
                  </h2>
                  <p className="text-sm text-[#514532] leading-relaxed whitespace-pre-line">
                    {spot.description}
                  </p>

                  {/* Amenities & Highlights */}
                  {spot.amenities && spot.amenities.length > 0 && (
                    <div className="pt-4 border-t border-[#E8E5DE] space-y-3">
                      <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                        Amenities &amp; Features
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {spot.amenities.map((amenity, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E3DFD5] text-xs font-semibold text-[#582F0E] capitalize"
                          >
                            {amenity.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Community Traveler Notes & Tips Forum */}
                <section className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#E3DFD5] shadow-xs space-y-5">
                  <SpotCommentSection spotId={spot.id} spotName={spot.name} />
                </section>
              </div>

              {/* Right/Sidebar Column (lg:col-span-4) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Author Control Center Card */}
                {isAuthor && (
                  <div className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] text-white p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-emerald-400/40 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-[#FFB703]" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-200 block">
                          Destination Author
                        </span>
                        <span className="text-xs text-emerald-100 font-semibold">You posted this spot</span>
                      </div>
                    </div>

                    <p className="text-xs text-emerald-100/90 leading-relaxed">
                      As the creator of this destination, you can attach an official quest checkpoint for travelers to discover on their mobile app and earn $mJDQ rewards.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setQuestTitle(`Explore ${spot.name}`);
                        setQuestDescription(`Visit ${spot.name}, explore the grounds, and verify your coordinates within the geofence.`);
                        setIsQuestModalOpen(true);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs font-black shadow-md transition active:scale-98 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{spot.questId ? 'Add Another Quest Trail' : 'Create Quest for this Spot'}</span>
                    </button>
                  </div>
                )}

                {/* Active Quest on this Destination */}
                {spot.questId && (
                  <div className="bg-white p-6 rounded-2xl sm:rounded-3xl border border-amber-200/90 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#FFB703]" />
                        <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">
                          Active Quest Trail
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Earn Tokens
                      </span>
                    </div>

                    <p className="text-xs text-[#514532] leading-relaxed">
                      This destination has an active quest checkpoint. Travelers can verify their physical visit on-site to earn $mJDQ tokens and Explorer XP.
                    </p>

                    <Link
                      href={appRoutes.quest(spot.questId)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                    >
                      <span>Explore Quest Checkpoint</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Venue Summary Facts */}
                <div className="bg-white p-6 rounded-2xl sm:rounded-3xl border border-[#E3DFD5] shadow-xs space-y-4">
                  <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider pb-2 border-b border-[#E8E5DE]">
                    Venue Details
                  </h3>

                  <div className="space-y-3.5 text-xs sm:text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#582F0E]">{spot.municipality}</p>
                        <p className="text-xs text-[#837560]">{spot.address || 'Pangasinan'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-[#7D5800] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#582F0E]">Operating Hours</p>
                        <p className="text-xs text-[#837560]">{spot.hours?.daily || 'Open to visitors daily'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#582F0E]">Verification</p>
                        <p className="text-xs text-[#837560]">
                          {spot.trustLevel === 'lgu_verified' ? 'LGU Verified Landmark' : 'Community Sourced'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E8E5DE] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#582F0E]">Location Map</span>
                        <Link
                          href={`/map?lat=${spot.gpsLat}&lng=${spot.gpsLng}&name=${encodeURIComponent(spot.name)}&spot=${spot.id}`}
                          className="text-[#2D6A4F] hover:underline font-bold text-xs flex items-center gap-1"
                        >
                          <span>Full Map</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <MiniMapPreview
                        lat={spot.gpsLat}
                        lng={spot.gpsLng}
                        name={spot.name}
                        address={spot.address}
                        municipality={spot.municipality}
                        spotId={spot.id}
                        pinType="spot"
                        height="h-44"
                      />
                    </div>
                  </div>
                </div>

                {/* Smart Diversion: Quieter Alternatives */}
                {alternatives.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl sm:rounded-3xl border border-emerald-200/90 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                      <h3 className="text-xs font-black text-[#2D6A4F] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
                        <span>Nearby Alternatives</span>
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {alternatives.slice(0, 3).map((alt) => (
                        <Link
                          key={alt.id}
                          href={appRoutes.spot(alt.id)}
                          className="flex gap-3 p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                            <DestinationMedia
                              src={alt.imageUrl}
                              alt={alt.name}
                              destinationName={alt.name}
                              municipality={alt.municipality}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className="text-xs font-bold text-[#582F0E] group-hover:text-[#2D6A4F] transition truncate">
                              {alt.name}
                            </h4>
                            <p className="text-[11px] text-[#7D5800]">{alt.municipality}</p>
                            <p className="text-[10px] text-[#837560] line-clamp-1">{alt.description}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          {/* Author Quest Creation In-Page Modal */}
          {isQuestModalOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
              onClick={() => !creatingQuest && setIsQuestModalOpen(false)}
            >
              <div
                className="bg-white rounded-3xl border border-[#E3DFD5] max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#582F0E]">Create Destination Quest</h3>
                      <p className="text-xs text-[#837560]">{spot.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={creatingQuest}
                    onClick={() => setIsQuestModalOpen(false)}
                    className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {questError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#BC4749] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{questError}</span>
                  </div>
                )}

                {questSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{questSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateQuest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#582F0E] mb-1.5">
                      Quest Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      maxLength={100}
                      value={questTitle}
                      onChange={(e) => setQuestTitle(e.target.value)}
                      placeholder="e.g. Sunset Lighthouse Viewpoint Trail"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs sm:text-sm text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#582F0E] mb-1.5">
                      Mission Objectives &amp; Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      minLength={15}
                      maxLength={1000}
                      rows={3}
                      value={questDescription}
                      onChange={(e) => setQuestDescription(e.target.value)}
                      placeholder="Describe what travelers must do or see when arriving at this checkpoint..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs sm:text-sm text-[#2C221E] outline-none focus:border-[#2D6A4F] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#582F0E] mb-1.5">Category</label>
                      <select
                        value={questCategory}
                        onChange={(e) => setQuestCategory(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                      >
                        <option value="eco">🏖️ Eco-Tourism</option>
                        <option value="cultural">🏛️ Cultural Heritage</option>
                        <option value="food_trade">🍜 Culinary / Food Trade</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#582F0E] mb-1.5">Geofence Radius</label>
                      <select
                        value={questRadius}
                        onChange={(e) => setQuestRadius(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                      >
                        <option value={100}>100 meters (Tight Checkpoint)</option>
                        <option value={200}>200 meters (Standard)</option>
                        <option value={300}>300 meters (Broad Landmark)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#582F0E] mb-1.5">Token Reward Bounty</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[50, 75, 100].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setQuestReward(val as any)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            questReward === val
                              ? 'bg-amber-100/80 border-amber-400 text-[#7D5800] shadow-xs'
                              : 'bg-[#FAF9F5] border-[#E3DFD5] text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <span className="font-black text-sm">+{val}</span>
                          <span className="text-[10px] text-stone-500">mJDQ Tokens</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8E5DE] flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={creatingQuest}
                      onClick={() => setIsQuestModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingQuest || Boolean(questSuccess)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black transition cursor-pointer active:scale-98 shadow-sm disabled:opacity-50"
                    >
                      {creatingQuest ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Publishing Quest...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Publish Quest Checkpoint</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

          {/* 3. LIGHTBOX MODAL (On Tap Image) */}
          {isLightboxOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
              onClick={() => setIsLightboxOpen(false)}
            >
              {/* Lightbox Header */}
              <div className="flex items-center justify-between text-white z-10">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base">{spot.name}</span>
                  {slides.length > 1 && (
                    <span className="text-xs text-stone-400 font-mono">
                      ({activeSlide + 1} of {slides.length})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  aria-label="Close fullscreen view"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lightbox Image Stage */}
              <div
                className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {isVideoMedia(currentSlideUrl) ? (
                  <video
                    src={currentSlideUrl}
                    controls
                    autoPlay
                    className="max-h-[85vh] max-w-full object-contain rounded-xl"
                  />
                ) : (
                  <img
                    src={currentSlideUrl}
                    alt={`${spot.name} - Photo ${activeSlide + 1}`}
                    className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl select-none"
                  />
                )}

                {/* Lightbox Prev / Next Controls */}
                {slides.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
                      }}
                      className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition cursor-pointer"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlide((prev) => (prev + 1) % slides.length);
                      }}
                      className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition cursor-pointer"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Lightbox Pagination */}
              {slides.length > 1 && (
                <div className="flex items-center justify-center gap-2 py-2 z-10" onClick={(e) => e.stopPropagation()}>
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSlide(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeSlide === idx ? 'w-8 bg-[#FFB703]' : 'w-2 bg-white/40 hover:bg-white/80'
                      }`}
                      aria-label={`Jump to photo ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Navigation>
  );
};
