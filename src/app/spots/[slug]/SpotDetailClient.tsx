'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Film,
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
import { SpotPresenceController, SpotPresenceState, SPOT_CHROME_IDLE_MS } from '@/lib/spot-ui-presence';
import { SpotGestureHandler } from '@/lib/spot-ui-gestures';
import { getAvailableChapters, scrollToChapter } from '@/lib/spot-ui-chapters';


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

  // Stage presence systems (YouTube-Fullscreen-inspired)
  const [heroPresence, setHeroPresence] = useState<SpotPresenceState>('visible');
  const [lightboxPresence, setLightboxPresence] = useState<SpotPresenceState>('visible');
  const heroPresenceRef = useRef<SpotPresenceController | null>(null);
  const lightboxPresenceRef = useRef<SpotPresenceController | null>(null);

  // Gesture handler for hero stage (tap to toggle, double tap for gallery)
  const gestureHandlerRef = useRef<SpotGestureHandler | null>(null);

  // Scroll cue retirement
  const [cueRetired, setCueRetired] = useState(false);

  // Reading progress scrubber
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);

  // Chapters & Scroll-spy
  const chapters = useMemo(() => getAvailableChapters(alternatives.length > 0), [alternatives.length]);
  const [activeChapter, setActiveChapter] = useState('spot-info');

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

  // Stationary backdrop: selected once per page load (first licensed still).
  // Gallery navigation never replaces the page background mid-read; a video
  // lead gets a still poster plus an explicit play affordance instead of autoplay.
  const backdropStillUrl = useMemo(
    () => slides.find((url) => !isVideoMedia(url)) || '/bg_landscape.png',
    [slides]
  );
  const leadIsVideo = isVideoMedia(slides[0] || '');

  // Keyboard navigation for carousel & lightbox
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
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

  // Native document scroll to the story surface; respects reduced motion.
  const scrollToSpotInfo = useCallback(() => {
    const target = document.getElementById('spot-info');
    if (!target) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, []);

  // Initialize Stage Presence and Gestures
  useEffect(() => {
    const heroController = new SpotPresenceController({
      idleMs: SPOT_CHROME_IDLE_MS,
      onStateChange: setHeroPresence,
    });
    heroPresenceRef.current = heroController;
    heroController.wake();

    gestureHandlerRef.current = new SpotGestureHandler({
      onSingleTap: () => heroPresenceRef.current?.toggle(),
      onDoubleTap: () => setIsLightboxOpen(true),
    });

    return () => {
      heroController.destroy();
      gestureHandlerRef.current?.cancel();
    };
  }, []);

  // Lightbox Presence Lifecycle
  useEffect(() => {
    if (isLightboxOpen) {
      const lbController = new SpotPresenceController({
        idleMs: SPOT_CHROME_IDLE_MS,
        onStateChange: setLightboxPresence,
      });
      lightboxPresenceRef.current = lbController;
      lbController.wake();
    } else {
      lightboxPresenceRef.current?.destroy();
      lightboxPresenceRef.current = null;
      setLightboxPresence('visible');
    }
    return () => {
      lightboxPresenceRef.current?.destroy();
    };
  }, [isLightboxOpen]);

  // Reading Progress Scrubber & Cue Retirement via rAF-throttled scroll listener
  useEffect(() => {
    let rAFId: number | null = null;
    const handleScroll = () => {
      if (rAFId !== null) return;
      rAFId = requestAnimationFrame(() => {
        rAFId = null;
        const scrollY = window.scrollY;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = Math.min(100, Math.max(0, (scrollY / maxScroll) * 100));
        setReadingProgress(progress);
        if (scrubberRef.current) {
          scrubberRef.current.style.setProperty('--reading-progress', `${progress}%`);
        }
        if (scrollY > 120 && !cueRetired) {
          setCueRetired(true);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rAFId !== null) cancelAnimationFrame(rAFId);
    };
  }, [cueRetired]);

  // Scroll-spy with IntersectionObserver for chapters
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const chapterIds = chapters.map((c) => c.id);
    const elements = chapterIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries.reduce((prev, curr) =>
            Math.abs(curr.boundingClientRect.top) < Math.abs(prev.boundingClientRect.top) ? curr : prev
          );
          if (topEntry.target.id) {
            setActiveChapter(topEntry.target.id);
          }
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: [0, 0.25, 0.5] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [chapters]);

  const handleSeekProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = ratio * maxScroll;
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: targetY, behavior: reduceMotion ? 'auto' : 'smooth' });
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

  return (
    <Navigation theater>
      <ErrorBoundary fallbackTitle="Unable to load Destination Spot">
        <div className="relative w-full flex flex-col">
          {/* One stationary destination photo spans the entire story. It never
              pans, scales or parallaxes; the story panels scroll over it and it
              ends at the page/footer boundary with an intentional fade. */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[#0A141E] select-none">
            <div className="sticky top-0 h-[100dvh] w-full">
              <img
                src={backdropStillUrl}
                alt=""
                loading="eager"
                fetchPriority="high"
                className="spot-backdrop spot-photo-reveal w-full h-full object-cover"
                style={{ objectPosition: '50% 42%' }}
                onError={(event) => {
                  const image = event.currentTarget;
                  if (image.dataset.fallbackApplied !== 'true' && !image.src.endsWith('/bg_landscape.png')) {
                    image.dataset.fallbackApplied = 'true';
                    image.src = '/bg_landscape.png';
                    return;
                  }
                  // Even the branded fallback failed: keep the deliberate dark
                  // brand backdrop and drop the broken-image artifact.
                  image.style.visibility = 'hidden';
                }}
              />
            </div>
          </div>

          <div className="relative z-10 flex flex-col w-full">
          {/* 1. HERO — photo-led first viewport with presence system */}
          <section
            aria-label={`Destination showcase for ${spot.name}`}
            data-spot-presence={heroPresence}
            className="relative w-full min-h-[calc(100dvh-3.5rem)] lg:min-h-dvh flex flex-col justify-end select-none spot-stage-cursor-hide"
            onPointerMove={() => heroPresenceRef.current?.wake()}
            onPointerDown={() => heroPresenceRef.current?.wake()}
            onTouchStart={() => heroPresenceRef.current?.wake()}
            onFocus={() => heroPresenceRef.current?.wake()}
            onClick={(e) => {
              gestureHandlerRef.current?.handleTap(e.target);
            }}
          >
            {/* Video lead: explicit play affordance instead of a silent frame behind text */}
            {leadIsVideo && (
              <button
                data-spot-chrome
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                className="absolute inset-0 m-auto z-20 w-16 h-16 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition cursor-pointer active:scale-95"
                aria-label="Play destination video in gallery"
                title="Play video"
              >
                <Film className="w-7 h-7 text-[#FFB703]" />
              </button>
            )}

            {/* Top Floating Control Bar */}
            <div
              data-spot-chrome
              className="absolute top-4 sm:top-6 left-4 sm:left-8 right-4 sm:right-8 z-20 flex items-center justify-between pointer-events-none"
              onMouseEnter={() => heroPresenceRef.current?.suspend()}
              onMouseLeave={() => heroPresenceRef.current?.resume()}
            >
              {/* Back Button */}
              <Link
                href="/explore"
                className="chip-live inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-black/55 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white font-bold text-xs transition shadow-lg pointer-events-auto cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#FFB703]" />
                <span className="hidden sm:inline">Back to Explore</span>
                <span className="sm:hidden">Explore</span>
              </Link>

              {/* Center Breadcrumb (Desktop) */}
              <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white/95 text-xs font-semibold shadow-md pointer-events-auto">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                <span>{spot.municipality}</span>
                <span>•</span>
                <span className="capitalize">{spot.subcategory.replace('_', ' ')}</span>
              </div>

              {/* Top Right: explicit Gallery entry (no large floating arrows) */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="chip-live inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-black/55 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition shadow-lg pointer-events-auto cursor-pointer min-h-[44px]"
                aria-label="Open fullscreen photo gallery"
              >
                <Camera className="w-4 h-4 text-[#FFB703]" />
                <span>Gallery</span>
                {slides.length > 1 && (
                  <span className="font-mono text-white/80">{activeSlide + 1}/{slides.length}</span>
                )}
              </button>
            </div>

            {/* Compact hero block: title, truthful locality, teaser, high-value actions */}
            <div
              data-spot-chrome
              className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-24 lg:pb-20 space-y-3 pointer-events-auto"
              onMouseEnter={() => heroPresenceRef.current?.suspend()}
              onMouseLeave={() => heroPresenceRef.current?.resume()}
            >
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {spot.name}
              </h1>
              <p className="text-sm sm:text-base text-white flex items-center gap-1.5 font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                <MapPin className="w-4 h-4 text-[#FFB703]" />
                <span>{spot.municipality}</span>
              </p>
              {spot.description && (
                <p className="max-w-2xl text-xs sm:text-sm text-white font-medium line-clamp-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {spot.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {spot.questId && (
                  <Link
                    href={appRoutes.quest(spot.questId)}
                    className="chip-live btn-tactile btn-sheen inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs sm:text-sm font-extrabold shadow-sm transition cursor-pointer min-h-[44px]"
                  >
                    <Trophy className="w-4 h-4 text-[#582F0E]" />
                    <span>Play Eco-Quest</span>
                  </Link>
                )}

                <Link
                  href={`/map?lat=${spot.gpsLat}&lng=${spot.gpsLng}&name=${encodeURIComponent(spot.name)}&spot=${spot.id}`}
                  className="chip-live btn-tactile inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-black/55 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md text-xs sm:text-sm font-bold transition cursor-pointer min-h-[44px]"
                >
                  <MapPin className="w-4 h-4 text-[#FFB703]" />
                  <span>View on Map</span>
                </Link>
              </div>
            </div>

            {/* Subtle floating scroll caret */}
            {!cueRetired && (
              <button
                data-spot-chrome
                type="button"
                onClick={scrollToSpotInfo}
                className="absolute bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer group active:scale-90"
                aria-label="Scroll to explore the destination story"
              >
                <ChevronDown className="hero-cue-icon w-5 h-5 text-white/70 group-hover:text-white transition-colors drop-shadow-md" aria-hidden="true" />
              </button>
            )}

            {/* Story-progress line (scrubber analog) */}
            <div
              data-spot-chrome
              ref={scrubberRef}
              onClick={handleSeekProgress}
              className="absolute bottom-0 left-0 right-0 z-30 h-3 flex items-end cursor-pointer group pointer-events-auto"
              aria-label="Story reading progress scrubber, click to seek"
              role="progressbar"
              aria-valuenow={Math.round(readingProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="w-full h-[3px] bg-white/20 group-hover:h-[5px] transition-all">
                <div className="spot-reading-progress h-full bg-[#FFB703]" />
              </div>
            </div>
          </section>

          {/* 2. STORY INTRO — white panel scrolling over the photo */}
          <div
            id="spot-info"
            className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 scroll-mt-16 lg:scroll-mt-4"
          >
            <header className="panel-enter bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-[#E3DFD5] shadow-xs space-y-5">
                    {/* Chapter Navigation Bar (YouTube chapters analog) */}
                    <nav aria-label="Story chapters" className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 border-b border-[#E8E5DE]/50">
                      <span className="text-[11px] font-bold text-[#837560] uppercase tracking-wider mr-1 hidden sm:inline">
                        Chapters:
                      </span>
                      {chapters.map((chapter) => {
                        const isActive = activeChapter === chapter.id;
                        return (
                          <button
                            key={chapter.id}
                            type="button"
                            onClick={() => scrollToChapter(chapter.id)}
                            aria-current={isActive ? 'true' : undefined}
                            className={`chip-live px-3.5 py-1.5 rounded-full text-xs font-bold transition min-h-[44px] inline-flex items-center cursor-pointer shrink-0 ${
                              isActive
                                ? 'bg-[#2D6A4F] text-white shadow-xs'
                                : 'bg-[#FAF9F5] hover:bg-white text-[#582F0E] border border-[#E3DFD5]'
                            }`}
                          >
                            {chapter.label}
                          </button>
                        );
                      })}
                    </nav>

                    {/* Status & category chips */}
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

                      {spot.crowdStatus === 'estimated_busy' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF3E8] border border-[#FFD8B8] text-xs font-bold text-[#D95D00]">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#D95D00]" />
                          <span>Peak Hours</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#2D6A4F]">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
                          <span>Low Crowd</span>
                        </span>
                      )}
                    </div>

                    <DestinationBadgeList
                      badges={getSampleDestinationBadges(spot.id, spot.category)}
                      maxDisplay={5}
                      size="sm"
                    />

                    {/* Truthful place context and real attribution */}
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#837560]">
                      <span className="flex items-center gap-1 font-semibold text-[#2D6A4F]">
                        <MapPin className="w-4 h-4" />
                        <span>{spot.address || spot.municipality}</span>
                      </span>
                      <span>•</span>
                      {spot.sourceName.startsWith('Photo:') && spot.sourceUrl ? (
                        <a
                          href={spot.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2"
                        >
                          {spot.sourceName.replace(/^Photo:\s*/, '')}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 flex-wrap">
                          <span>Shared by</span>
                          <UserNametag
                            displayName={spot.sourceName}
                            badges={getAuthorBadges(spot.id, spot.sourceName, user ?? undefined)}
                            size="sm"
                          />
                        </span>
                      )}
                    </div>

                    {/* Practical actions */}
                    <div className="pt-4 border-t border-[#E8E5DE]/40 flex flex-wrap items-center gap-2.5">
                      {spot.questId && (
                        <Link
                          href={appRoutes.quest(spot.questId)}
                          className="btn-tactile btn-sheen inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs sm:text-sm font-extrabold shadow-sm transition cursor-pointer min-h-[44px]"
                        >
                          <Trophy className="w-4 h-4 text-[#582F0E]" />
                          <span>Play Eco-Quest</span>
                        </Link>
                      )}

                      <Link
                        href={`/map?lat=${spot.gpsLat}&lng=${spot.gpsLng}&name=${encodeURIComponent(spot.name)}&spot=${spot.id}`}
                        className="btn-tactile inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#FAF9F5] hover:bg-white text-[#582F0E] border border-[#E3DFD5] text-xs font-bold transition cursor-pointer min-h-[44px]"
                      >
                        <MapPin className="w-4 h-4 text-[#2D6A4F]" />
                        <span>View on Map</span>
                      </Link>

                      <button
                        type="button"
                        onClick={handleShare}
                        className="btn-tactile inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] text-[#582F0E] text-xs font-bold transition cursor-pointer min-h-[44px]"
                        aria-label="Share Destination"
                      >
                        {shareCopied ? <Check className="w-4 h-4 text-[#2D6A4F]" /> : <Share2 className="w-4 h-4" />}
                        <span>{shareCopied ? 'Link copied' : 'Share'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleLike}
                        className={`btn-tactile flex items-center justify-center p-2.5 rounded-xl border transition cursor-pointer min-h-[44px] min-w-[44px] ${
                          isLiked
                            ? 'bg-rose-50 border-rose-200 shadow-2xs'
                            : 'bg-[#FAF9F5] border-[#E3DFD5] hover:border-rose-300'
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
                            ? 'bg-amber-100 border-amber-300 shadow-2xs'
                            : 'bg-[#FAF9F5] border-[#E3DFD5] hover:border-amber-300'
                        }`}
                        aria-label={isSaved ? 'Saved' : 'Save'}
                        aria-pressed={isSaved}
                        title={isSaved ? 'Saved' : 'Save'}
                      >
                        <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current text-[#B45309]' : 'text-gray-400'}`} />
                      </button>
                    </div>
                  </header>
          </div>

          {/* 3. STORY MODULES — dark-tinted panels with the photo visible between them */}
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 sm:pb-14 space-y-6 sm:space-y-8">
            {/* Two-Column Maximized Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left/Main Column (lg:col-span-8) */}
              <div className="lg:col-span-8 space-y-6">
                {/* About Narrative */}
                <section
                  id="spot-about"
                  className="panel-enter bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#E3DFD5] shadow-xs space-y-4 scroll-mt-16 lg:scroll-mt-8"
                >
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
                <section
                  id="spot-comments"
                  className="panel-enter bg-white rounded-2xl sm:rounded-3xl border border-[#E3DFD5] shadow-xs p-4 sm:p-6 scroll-mt-16 lg:scroll-mt-8"
                >
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
                      <span>{spot.questId ? 'Add Another Eco-Quest' : 'Create Eco-Quest for this Spot'}</span>
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
                          Active Eco-Quest
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Earn Tokens
                      </span>
                    </div>

                    <p className="text-xs text-[#514532] leading-relaxed">
                      This destination has an active Eco-Quest checkpoint. Travelers can verify their physical visit on-site to earn $mJDQ tokens and Explorer XP.
                    </p>

                    <Link
                      href={appRoutes.quest(spot.questId)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                    >
                      <span>Explore Eco-Quest Checkpoint</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Venue Summary Facts */}
                <div
                  id="spot-venue"
                  className="panel-enter bg-white p-6 rounded-2xl sm:rounded-3xl border border-[#E3DFD5] shadow-xs space-y-4 scroll-mt-16 lg:scroll-mt-8"
                >
                  <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider pb-2 border-b border-[#E8E5DE]">
                    Venue Details
                  </h3>

                  <div className="space-y-3.5 text-xs sm:text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#582F0E]">{spot.municipality}</p>
                        <p className="text-xs text-[#837560]">{spot.address || spot.municipality || 'Location not recorded'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-[#7D5800] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#582F0E]">Operating Hours</p>
                        <p className="text-xs text-[#837560]">
                          {spot.hours?.daily || (spot.trustLevel === 'open_data' ? 'Hours not confirmed' : 'Open to visitors daily')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#582F0E]">Verification</p>
                        <p className="text-xs text-[#837560]">
                          {spot.trustLevel === 'lgu_verified'
                            ? 'LGU Verified Landmark'
                            : spot.trustLevel === 'open_data'
                              ? 'Open-data source; not LGU-verified'
                              : 'Community Sourced'}
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
                  <div
                    id="spot-alternatives"
                    className="panel-enter bg-white p-6 rounded-2xl sm:rounded-3xl border border-emerald-200/90 shadow-xs space-y-4 scroll-mt-16 lg:scroll-mt-8"
                  >
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

          {/* 4. LIGHTBOX MODAL (On Tap Image with Presence & End Card) */}
          {isLightboxOpen && (
            <div
              data-spot-presence={lightboxPresence}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 spot-stage-cursor-hide select-none"
              onPointerMove={() => lightboxPresenceRef.current?.wake()}
              onTouchStart={() => lightboxPresenceRef.current?.wake()}
              onClick={() => lightboxPresenceRef.current?.toggle()}
            >
              {/* Lightbox Header */}
              <div
                data-spot-chrome
                className="flex items-center justify-between text-white z-10"
                onClick={(e) => e.stopPropagation()}
              >
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
                  className="chip-live p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
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
                      data-spot-chrome
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
                      }}
                      className="chip-live absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition cursor-pointer"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      data-spot-chrome
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlide((prev) => (prev + 1) % slides.length);
                      }}
                      className="chip-live absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition cursor-pointer"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Lightbox End Card (YouTube "end screen" analog) */}
                {activeSlide === slides.length - 1 && slides.length > 1 && (
                  <div
                    data-spot-chrome
                    className="absolute bottom-6 right-2 sm:right-6 z-30 max-w-xs sm:max-w-sm w-full bg-black/85 backdrop-blur-md rounded-2xl border border-white/20 p-4 sm:p-5 text-white shadow-2xl space-y-3 panel-enter"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFB703]">Story Summary</span>
                        <span className="text-xs text-stone-400">{slides.length}/{slides.length} photos</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-white truncate">{spot.name}</h4>
                      <p className="text-xs text-stone-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#FFB703]" />
                        <span>{spot.municipality}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
                      {spot.questId && (
                        <Link
                          href={appRoutes.quest(spot.questId)}
                          className="chip-live inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFB703] text-[#582F0E] text-xs font-bold"
                        >
                          <Trophy className="w-3.5 h-3.5 text-[#582F0E]" />
                          <span>Play Quest</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={handleToggleLike}
                        className={`chip-live p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                          isLiked ? 'bg-rose-500/20 border-rose-400 text-rose-300' : 'bg-white/10 border-white/20 text-white'
                        }`}
                        aria-label={isLiked ? 'Liked destination' : 'Like destination'}
                      >
                        <PixelHeart isLiked={isLiked} size="sm" />
                        <span>{isLiked ? 'Liked' : 'Like'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleSave}
                        className={`chip-live p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                          isSaved ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/10 border-white/20 text-white'
                        }`}
                        aria-label={isSaved ? 'Saved' : 'Save'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-[#FFB703]' : ''}`} />
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="chip-live p-1.5 rounded-lg border border-white/20 bg-white/10 text-white text-xs font-bold flex items-center gap-1"
                        aria-label="Share Destination"
                      >
                        {shareCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{shareCopied ? 'Copied' : 'Share'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(false)}
                      className="chip-live w-full py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Back to Story
                    </button>
                  </div>
                )}
              </div>

              {/* Lightbox Pagination */}
              {slides.length > 1 && (
                <div
                  data-spot-chrome
                  className="flex items-center justify-center gap-2 py-2 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
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
