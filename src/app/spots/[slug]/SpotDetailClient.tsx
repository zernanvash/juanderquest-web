'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Trophy,
  Wifi,
  Car,
  Clock,
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Sparkles,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel, isVideoMedia } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { SpotDetailSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DestinationMedia } from '@/components/DestinationMedia';

interface SpotDetailClientProps {
  slug: string;
}

export const SpotDetailClient: React.FC<SpotDetailClientProps> = ({ slug }) => {
  const [spot, setSpot] = useState<SpotModel | null>(null);
  const [alternatives, setAlternatives] = useState<SpotModel[]>([]);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [comments, setComments] = useState<Array<{ author: string; time: string; text: string }>>([]);
  const [newComment, setNewComment] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

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
        setIsSaved(Boolean(data.spot.saved));
        api.post(`/spots/${data.spot.id}/interactions`, { type: 'view' }).catch(() => {});
      })
      .catch((err) => {
        const errorObj = err as { response?: { data?: { error?: { message?: string } } } };
        setError(errorObj.response?.data?.error?.message || 'Destination spot not found.');
      });
  }, [slug]);

  const slides = spot
    ? [spot.imageUrl, '/bg_landscape.png'].filter(Boolean) as string[]
    : ['/bg_landscape.png'];

  // Smooth auto-slide timer (7s)
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleToggleLike = async () => {
    if (!spot) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    try {
      await api.post(`/spots/${spot.id}/interactions`, { type: 'helpful' });
    } catch {
      setIsLiked(!nextState);
    }
  };

  const handleToggleSave = async () => {
    if (!spot) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      await api.post(`/spots/${spot.id}/interactions`, { type: 'save' });
    } catch {
      setIsSaved(!nextSaved);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([
      {
        author: 'You (Traveler Note)',
        time: 'Just now',
        text: newComment.trim(),
      },
      ...comments,
    ]);
    setNewComment('');
  };

  if (error) {
    return (
      <Navigation>
        <div className="bg-white rounded-3xl p-8 border border-red-200 text-center text-xs text-[#BC4749] space-y-3 max-w-lg mx-auto my-12">
          <p className="font-bold text-sm">{error}</p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D6A4F] text-white font-bold text-xs"
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

  const scrollToContent = () => {
    const el = document.getElementById('spot-details-surface');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to load Destination Spot">
        <div className="-mt-5 -mx-4 sm:-mx-6 lg:-mx-8">
          {/* 1. IMMERSIVE HERO SHOWCASE */}
          <section className="relative w-full h-[75vh] sm:h-[82vh] bg-[#0D1B2A] overflow-hidden flex flex-col justify-between select-none">
            {/* Background Slideshow */}
            {slides.map((imgUrl, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                  activeSlide === idx ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
                }`}
              >
                {isVideoMedia(imgUrl) ? (
                  <video
                    src={imgUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <DestinationMedia
                    src={imgUrl}
                    alt={`${spot.name} - View ${idx + 1}`}
                    destinationName={spot.name}
                    municipality={spot.municipality}
                    priority={idx === 0}
                    aspectRatio="video"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}

            {/* Dark Gradient Layers */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50 z-1 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-b from-transparent to-[#FAF9F5] z-2 pointer-events-none" />

            {/* Top Navigation HUD Bar */}
            <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex items-center justify-between">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-black transition cursor-pointer active:scale-95 shadow-lg min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4 text-[#FFB703]" />
                <span className="hidden sm:inline">Back to Explore Feed</span>
                <span className="sm:hidden">Back</span>
              </Link>

              {/* Photo Counter Pill & Save Button */}
              <div className="flex items-center gap-2.5">
                {slides.length > 1 && (
                  <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-md">
                    <Camera className="w-3.5 h-3.5 text-[#FFB703]" />
                    <span>
                      {activeSlide + 1} / {slides.length}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleToggleSave}
                  className={`p-2.5 rounded-2xl backdrop-blur-md border transition cursor-pointer active:scale-95 shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    isSaved
                      ? 'bg-[#FFB703] text-[#582F0E] border-[#FFB703]'
                      : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
                  }`}
                  aria-label={isSaved ? 'Remove from saved' : 'Save to device'}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#582F0E]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Center Hero Identity Callout */}
            <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto space-y-3 my-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-xs font-black text-amber-300 uppercase tracking-widest shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>
                  {spot.subcategory.replaceAll('_', ' ')} • {spot.municipality}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black drop-shadow-2xl tracking-tight text-white">
                {spot.name}
              </h1>

              <p className="text-xs sm:text-sm text-amber-100/90 font-medium flex items-center justify-center gap-1.5 drop-shadow-md">
                <MapPin className="w-4 h-4 text-[#48C71D] shrink-0" />
                <span>{spot.address || `${spot.municipality}, Pangasinan`}</span>
              </p>

              {spot.questId && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFB703]/95 text-[#582F0E] font-black text-xs sm:text-sm shadow-xl mt-1">
                  <Trophy className="w-4 h-4 text-[#582F0E]" />
                  <span>Linked Quest Active</span>
                </div>
              )}
            </div>

            {/* Bottom Scroll Down Prompt */}
            <div className="relative z-10 pb-4 px-4 flex flex-col items-center gap-2">
              {slides.length > 1 && (
                <div className="flex items-center gap-2">
                  {slides.map((_, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setActiveSlide(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeSlide === idx ? 'w-8 bg-[#FFB703]' : 'w-2.5 bg-white/50 hover:bg-white'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={scrollToContent}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer mt-1"
                aria-label="Scroll to spot details"
              >
                <span className="tracking-wide">View Spot Details</span>
                <ChevronDown className="w-4 h-4 text-[#FFB703] animate-bounce" />
              </button>
            </div>
          </section>

          {/* 2. DESTINATION DETAILS SURFACE */}
          <div
            id="spot-details-surface"
            className="relative z-10 w-full bg-[var(--color-bg-canvas)] border-t border-[var(--color-border-default)] pt-6 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6"
          >
            {/* ROW 1: PRIMARY ACTION BUTTONS & TELEMETRY */}
            <div className="bg-white p-5 sm:p-7 rounded-2xl border border-[var(--color-border-default)] space-y-4 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <Link
                  href={navigateUrl}
                  onClick={trackDirections}
                  className="w-full bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white rounded-xl py-3.5 px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 shadow-xs transition active:scale-98 cursor-pointer text-center min-h-[44px]"
                >
                  <Compass className="w-4 h-4 text-[var(--color-brand-accent)]" />
                  <span>Navigate with Valhalla</span>
                </Link>

                {spot.questId ? (
                  <Link
                    href={`/quests/${spot.questId}`}
                    className="w-full bg-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-hover)] text-[var(--color-brand-brown)] rounded-xl py-3.5 px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-98 text-center cursor-pointer min-h-[44px]"
                  >
                    <Trophy className="w-4 h-4 text-[var(--color-brand-brown)]" />
                    <span>Play Linked Quest</span>
                  </Link>
                ) : (
                  <Link
                    href={`/map?lat=${spot.gpsLat}&lng=${spot.gpsLng}`}
                    className="w-full bg-[var(--color-bg-subtle)] hover:bg-stone-100 text-[var(--color-brand-brown)] border border-[var(--color-border-default)] rounded-xl py-3.5 px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-98 text-center cursor-pointer min-h-[44px]"
                  >
                    <MapPin className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    <span>View on Province Map</span>
                  </Link>
                )}
              </div>

              {/* Interaction Strip */}
              <div className="pt-3 border-t border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleLike}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition active:scale-95 cursor-pointer min-h-[44px] ${
                      isLiked
                        ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold'
                        : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#582F0E] hover:border-rose-300'
                    }`}
                    aria-label={isLiked ? 'Liked destination' : 'Like destination'}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold">{isLiked ? 'Liked' : 'Like'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSave}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition active:scale-95 cursor-pointer min-h-[44px] ${
                      isSaved
                        ? 'bg-amber-100 border-amber-300 text-[#7D5800] font-bold'
                        : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#582F0E] hover:border-amber-300'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-[#B45309]' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold">{isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                </div>

                {/* Crowd Status Badge */}
                <div className="flex items-center gap-2">
                  {spot.crowdStatus === 'estimated_busy' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF3E8] border border-[#FFD8B8] text-xs font-bold text-[#D95D00]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D95D00]" />
                      <span>Peak Hours</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#2D6A4F]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
                      <span>Low Crowd</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: spot.name, url: window.location.href }).catch(() => {});
                      }
                    }}
                    className="p-2 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-gray-600 hover:text-[#582F0E] transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    aria-label="Share Destination"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ROW 2: NARRATIVE & SPECIFICATIONS */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E3DFD5] space-y-6 shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#2D6A4F] text-xs font-bold">
                    {spot.category.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-[#837560]">•</span>
                  <span className="text-xs text-[#837560]">Source: {spot.sourceName}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#582F0E]">
                  About {spot.name}
                </h2>
                <p className="text-sm text-[#514532] leading-relaxed whitespace-pre-line">
                  {spot.description}
                </p>
              </div>

              {/* Practical Facts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E8E5DE]">
                <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1">
                  <span className="text-[10px] font-black text-[#837560] uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2D6A4F]" /> Location
                  </span>
                  <p className="text-xs font-bold text-[#582F0E]">{spot.municipality}, Pangasinan</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1">
                  <span className="text-[10px] font-black text-[#837560] uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#7D5800]" /> Hours
                  </span>
                  <p className="text-xs font-bold text-[#582F0E]">
                    {spot.hours?.daily || 'Open to visitors'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1">
                  <span className="text-[10px] font-black text-[#837560] uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-700" /> Trust Level
                  </span>
                  <p className="text-xs font-bold text-[#582F0E]">
                    {spot.trustLevel === 'lgu_verified' ? 'LGU Verified Landmark' : 'Community Spot'}
                  </p>
                </div>
              </div>

              {/* Amenities & Tags */}
              {spot.amenities && spot.amenities.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                    Available Amenities &amp; Features
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {spot.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs font-semibold text-[#582F0E]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F]" />
                        <span>{amenity.replace('_', ' ')}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ROW 3: QUIETER ALTERNATIVES */}
            {alternatives.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-[#E3DFD5] space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold text-[#582F0E]">
                      Quieter Alternative Destinations
                    </h3>
                    <p className="text-xs text-[#837560]">
                      Nearby places with lower visitor activity recommended by the anti-overcrowding engine.
                    </p>
                  </div>
                  <span className="text-xs font-black text-[#2D6A4F] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    🌿 Smart Diversion
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {alternatives.slice(0, 2).map((alt) => (
                    <Link
                      key={alt.id}
                      href={`/spots/${alt.slug}`}
                      className="flex gap-3 p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        <DestinationMedia
                          src={alt.imageUrl}
                          alt={alt.name}
                          destinationName={alt.name}
                          municipality={alt.municipality}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs font-bold text-[#582F0E] group-hover:text-[#2D6A4F] transition truncate">
                          {alt.name}
                        </h4>
                        <p className="text-[11px] text-[#7D5800]">{alt.municipality}</p>
                        <p className="text-[11px] text-[#837560] line-clamp-2">{alt.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ROW 4: TRAVELER TIPS */}
            <div id="community-forum-row" className="bg-white p-6 rounded-2xl border border-[#E3DFD5] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#582F0E] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#2D6A4F]" />
                  <span>Traveler Tips &amp; On-Site Advice</span>
                </h3>
                <span className="text-xs text-[#837560]">{comments.length} notes added</span>
              </div>

              {comments.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-center text-xs text-[#837560]">
                  No traveler tips recorded yet. Add a note below to help other travelers!
                </div>
              ) : (
                <div className="space-y-2">
                  {comments.map((c, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-[#582F0E]">
                        <span>{c.author}</span>
                        <span className="text-[10px] text-[#837560] font-normal">{c.time}</span>
                      </div>
                      <p className="text-[#514532]">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <label htmlFor="detail-new-tip-input" className="sr-only">
                  Add traveler tip
                </label>
                <input
                  id="detail-new-tip-input"
                  name="tip"
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a travel tip or venue advice..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#FAF9F5] text-xs border border-[#E3DFD5] outline-none focus:border-[#2D6A4F] min-h-[40px]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition cursor-pointer min-h-[40px]"
                >
                  Post Note
                </button>
              </form>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </Navigation>
  );
};
