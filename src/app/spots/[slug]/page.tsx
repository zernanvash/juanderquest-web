'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  Send,
  Sparkles,
  Camera,
  Navigation as NavIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Coins,
  CheckCircle2,
  Compass,
  Film,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel, isVideoMedia } from '@/lib/api';

import { fetchWithCache } from '@/lib/cache';
import { SpotDetailSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const defaultMockTips = [
  {
    author: 'HeritageGuide_Carl',
    time: '3 hours ago',
    text: 'If visiting in the afternoon, bring an umbrella as there is limited shade along the outer trail. The golden sunset view is completely worth it though!',
    upvotes: 24,
  },
  {
    author: 'EcoScout_Alyana',
    time: 'Yesterday',
    text: 'Local tricycle drivers near the town plaza can take you straight to the entrance for around ₱30-₱50 per person.',
    upvotes: 12,
  },
];

// Curated high-resolution photography showcase for Pangasinan destinations
const curatedPhotosMap: Record<string, string[]> = {
  'patar-white-beach': [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBQfqPj4kY03yXd__1YRkkUlGWT_Iq9P9MnQULAKKoRx3PK6JqZacHdNFPEiZi1Qu300waJiS1Th61Wp_B674kqgKMrvpWk8tg_IbSfzM3ljtLxjTQCDLYSEMMmkRFt0vYJK7XtKP1VoFejCVCh7dycm8iu4Mgn9_05diHGoB-hZVJcCpszSXY1mFM8-8wdbUHohOCBo3C2II8tziivVzx5R-MH0SIhCLpoDHAiFFAemMYqNomkNS4',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBlNkYOQsYCOKYDkdC9Jy66GD1Rhl3i9AuMaNlSTseo47nyEUOqdT69mmxubS8OHB9BrP3RXkwsMY0EpxFLNlHNye35Hx5C07ZPFBVTddNfPd_zXKtDJxjx8_fNFLME5vjH-nSO46tl1EgeFONhUl_uM9EkTBphfZsRJlu-IkSdQoxLF4jqEsa0p7dknPVzrzNIZg-9EIha8fKbiKGD_4ItAixde65RO_b_cV_-TfM-dRrazl3ejNbvqKLLsOaIT4Uj',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB04cpPCV1lmu2HzODXMIVpDQLclbQJU4ixzsv8FugqoxOa1V2Nt1_zd6KdsQw1bUwV66jCeQ16rJw6ZG1_eKooO1nQnRodbH8ylO2RH17icpoRVETmmpubCzF4IiliP4ufLJ1snbu-xjwh5-23I0uvkvIvKcwQ3OKhJXSoKiLsqW3hAsI09kl1T8H_tFZZo3Bv2Kg95FhmqFcZVEDAG22r6ZY6QoPIO018jQKOVRsSQiD_qTtrPfaz2ciWA7zW6ywA',
  ],
  'hundred-islands': [
    '/bg_landscape.png',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBQfqPj4kY03yXd__1YRkkUlGWT_Iq9P9MnQULAKKoRx3PK6JqZacHdNFPEiZi1Qu300waJiS1Th61Wp_B674kqgKMrvpWk8tg_IbSfzM3ljtLxjTQCDLYSEMMmkRFt0vYJK7XtKP1VoFejCVCh7dycm8iu4Mgn9_05diHGoB-hZVJcCpszSXY1mFM8-8wdbUHohOCBo3C2II8tziivVzx5R-MH0SIhCLpoDHAiFFAemMYqNomkNS4',
  ],
};

export default function SpotDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [spot, setSpot] = useState<SpotModel | null>(null);
  const [alternatives, setAlternatives] = useState<SpotModel[]>([]);
  const [error, setError] = useState('');
  const [likeCount, setLikeCount] = useState(142);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [comments, setComments] = useState(defaultMockTips);
  const [newComment, setNewComment] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (!slug) return;
    fetchWithCache(
      `spot_detail_${slug}`,
      async () => {
        const [detail, alts] = await Promise.all([
          api.get(`/spots/${slug}`),
          api.get(`/spots/${slug}/alternatives`),
        ]);
        return {
          spot: normalizeSpot(detail.data.data),
          alternatives: (alts.data.data as Parameters<typeof normalizeSpot>[0][]).map(normalizeSpot),
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
      .catch((err) => setError(err.response?.data?.error?.message || 'Spot not found'));
  }, [slug]);

  // Compute slides array from curated list or fallback
  const curated = slug ? curatedPhotosMap[slug] : undefined;
  const slides = spot
    ? curated && curated.length > 0
      ? curated
      : [spot.imageUrl, '/bg_landscape.png'].filter(Boolean) as string[]
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
    setLikeCount((prev) => (nextState ? prev + 1 : prev - 1));
    try {
      await api.post(`/spots/${spot.id}/interactions`, { type: 'helpful' });
    } catch {
      setIsLiked(!nextState);
      setLikeCount((prev) => (!nextState ? prev + 1 : prev - 1));
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
        author: 'You (Traveler)',
        time: 'Just now',
        text: newComment.trim(),
        upvotes: 1,
      },
      ...comments,
    ]);
    setNewComment('');
  };

  if (error) {
    return (
      <Navigation>
        <div className="bg-white rounded-3xl p-8 border border-red-200 text-center text-xs text-[#BC4749] space-y-3">
          <p className="font-bold">{error}</p>
          <Link href="/explore" className="text-[#2D6A4F] underline">
            Back to Community Feed
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

  const trackDirections = () => api.post(`/spots/${spot.id}/interactions`, { type: 'directions' }).catch(() => {});
  const navigateUrl = `/navigate?name=${encodeURIComponent(spot.name)}&lat=${spot.gpsLat}&lng=${spot.gpsLng}&address=${encodeURIComponent(spot.address)}`;

  const scrollToContent = () => {
    const el = document.getElementById('spot-details-surface');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to load Destination Spot">
        <div className="-mt-5 -mx-4 sm:-mx-6 lg:-mx-8">
          {/* ========================================================================= */}
          {/* 1. IMMERSIVE FULL-VIEWPORT HERO PHOTO SHOWCASE (LANDING VIEW)             */}
          {/* ========================================================================= */}
          <section className="relative w-full h-[88vh] sm:h-[92vh] bg-[#0D1B2A] overflow-hidden flex flex-col justify-between select-none">
            {/* Background Slideshow Images / Videos with Smooth Cross-Fade */}
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
                  <img
                    src={imgUrl}
                    alt={`${spot.name} - View ${idx + 1}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/bg_landscape.png';
                    }}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

            ))}


            {/* Dark Gradient Layers for Typography Contrast & Seamless Bottom Fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/55 z-1 pointer-events-none" />
            {/* Smooth Transition Gradient at bottom leading into content surface */}
            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-b from-transparent to-[#FAF9F5] z-2 pointer-events-none" />

            {/* Top Navigation & Breadcrumb HUD Bar */}
            <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex items-center justify-between">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-black transition cursor-pointer active:scale-95 shadow-lg"
              >
                <ArrowLeft className="w-4 h-4 text-[#FFB703]" />
                <span className="hidden sm:inline">Back to Explore Feed</span>
                <span className="sm:hidden">Back</span>
              </Link>

              {/* Photo Counter Pill & Quick Actions */}
              <div className="flex items-center gap-3">
                {slides.length > 1 && (
                  <div className="px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-md">
                    <Camera className="w-3.5 h-3.5 text-[#FFB703]" />
                    <span>{activeSlide + 1} / {slides.length}</span>
                  </div>
                )}

                <button
                  onClick={handleToggleSave}
                  className={`p-2.5 rounded-2xl backdrop-blur-md border transition cursor-pointer active:scale-95 shadow-md ${
                    isSaved
                      ? 'bg-[#FFB703] text-[#582F0E] border-[#FFB703]'
                      : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
                  }`}
                  title="Save Destination"
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#582F0E]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Previous / Next Manual Arrow Navigation */}
            {slides.length > 1 && (
              <div className="absolute inset-y-0 inset-x-4 flex items-center justify-between z-10 pointer-events-none">
                <button
                  onClick={() => setActiveSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center pointer-events-auto transition cursor-pointer active:scale-95 shadow-lg"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setActiveSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center pointer-events-auto transition cursor-pointer active:scale-95 shadow-lg"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Center Hero Identity Callout */}
            <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto space-y-4 my-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-xs font-black text-amber-300 uppercase tracking-widest shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>{spot.subcategory.replaceAll('_', ' ')} • {spot.municipality}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black font-serif drop-shadow-2xl tracking-tight text-white">
                {spot.name}
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-amber-100/90 font-medium flex items-center justify-center gap-2 drop-shadow-md">
                <MapPin className="w-4 h-4 text-[#48C71D] shrink-0" />
                <span>{spot.address}</span>
              </p>

              {spot.questId && (
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFB703]/95 text-[#582F0E] font-black text-xs sm:text-sm shadow-xl mt-2">
                  <Trophy className="w-4 h-4 text-[#582F0E]" />
                  <span>Linked Quest Active (+250 mJDQ Bounty)</span>
                </div>
              )}
            </div>

            {/* Slideshow Progress Dots & Scroll Down Prompt */}
            <div className="relative z-10 pb-6 px-4 flex flex-col items-center gap-3">
              {/* Slide Indicator Dots */}
              {slides.length > 1 && (
                <div className="flex items-center gap-2">
                  {slides.map((_, idx) => (
                    <button
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

              {/* Scroll Down Prompt Button */}
              <button
                onClick={scrollToContent}
                className="group flex flex-col items-center gap-1 text-[#582F0E] hover:text-[#2D6A4F] transition cursor-pointer pt-2"
              >
                <span className="text-[11px] font-black uppercase tracking-wider group-hover:translate-y-0.5 transition drop-shadow-xs">
                  Scroll to Explore Details
                </span>
                <ChevronDown className="w-5 h-5 animate-bounce text-[#582F0E]" />
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. ROW-BASED UNCLUTTERED DESTINATION DETAILS SURFACE                       */}
          {/* ========================================================================= */}
          <div
            id="spot-details-surface"
            className="relative z-10 w-full bg-[#FAF9F5] border-t border-[#E3DFD5] pt-8 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8"
          >
            {/* ----------------------------------------------------------------------- */}
            {/* ROW 1: PRIMARY ACTION BUTTONS & TELEMETRY COMMAND BAR                   */}
            {/* ----------------------------------------------------------------------- */}
            <div className="bg-white p-6 sm:p-7 rounded-xl border border-[#E3DFD5] space-y-5">
              {/* Primary Call-to-Action Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                {/* Valhalla Turn-by-Turn Navigation */}
                <Link
                  href={navigateUrl}
                  onClick={trackDirections}
                  className="w-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-lg py-3.5 px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 shadow-xs transition active:scale-98 cursor-pointer text-center"
                >
                  <Compass className="w-4 h-4 text-[#FFB703]" />
                  <span>Navigate with Valhalla (Turn-by-Turn)</span>
                </Link>

                {/* Linked Quest Trigger (or fallback Explore Map CTA) */}
                {spot.questId ? (
                  <Link
                    href={`/quests/${spot.questId}`}
                    className="w-full bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] rounded-lg py-3.5 px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-98 text-center cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-[#582F0E]" />
                    <span>Play Linked Quest (+250 mJDQ Bounty)</span>
                  </Link>
                ) : (
                  <Link
                    href={`/map?lat=${spot.gpsLat}&lng=${spot.gpsLng}`}
                    className="w-full bg-[#FAF9F5] hover:bg-stone-100 text-[#582F0E] border border-[#D5C4AC] rounded-lg py-3.5 px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-98 text-center cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-[#2D6A4F]" />
                    <span>View on Province Map</span>
                  </Link>
                )}
              </div>

              {/* Quick Telemetry & Social Interaction Strip */}
              <div className="pt-3.5 border-t border-[#E8E5DE] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {/* Instagram-style Heart Button */}
                  <button
                    onClick={handleToggleLike}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border transition duration-150 active:scale-98 cursor-pointer ${
                      isLiked
                        ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold'
                        : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#582F0E] hover:border-rose-300'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600 text-rose-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold">{likeCount} Liked</span>
                  </button>

                  <button
                    onClick={() => {
                      const el = document.getElementById('community-forum-row');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] text-[#582F0E] text-xs font-bold hover:bg-stone-50 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    <span>{comments.length} Traveler Tips</span>
                  </button>
                </div>

                {/* Live Crowd Status Badge */}
                <div className="flex items-center gap-2.5">
                  {spot.crowdStatus === 'estimated_busy' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF3E8] border border-[#FFD8B8] text-xs font-bold text-[#D95D00]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D95D00]" />
                      <span>Peak Visitor Hours</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#2D6A4F]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
                      <span>Peaceful Traffic</span>
                    </span>
                  )}

                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: spot.name, url: window.location.href }).catch(() => {});
                      }
                    }}
                    className="p-2 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] text-gray-600 hover:text-[#582F0E] transition cursor-pointer"
                    title="Share Destination"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------------------- */}
            {/* ROW 2: DESTINATION NARRATIVE & PRACTICAL SPECIFICATIONS                 */}
            {/* ----------------------------------------------------------------------- */}
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#E3DFD5] space-y-7">
              {/* Narrative Story Section */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-[#E8E5DE]">
                  <Sparkles className="w-4 h-4 text-[#2D6A4F]" />
                  <h2 className="text-sm font-bold text-[#582F0E] uppercase tracking-wider font-serif">
                    Destination Narrative &amp; Story
                  </h2>
                </div>

                <p className="text-sm sm:text-base text-[#403526] leading-relaxed whitespace-pre-line">
                  {spot.description}
                </p>

                {/* Experience Tags */}
                {spot.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {spot.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-md bg-[#FAF9F5] text-[#582F0E] border border-[#E3DFD5] text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Practical Specifications 3-Column Grid */}
              <div className="space-y-3.5 pt-5 border-t border-[#E8E5DE]">
                <h3 className="text-xs font-bold text-[#7D5800] uppercase tracking-wider">
                  Practical Destination Specifications
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Hours */}
                  <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#2D6A4F]">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-bold text-xs text-[#582F0E]">Visiting Hours</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {Object.values(spot.hours)[0] || 'Open Daily (08:00 - 18:00)'}
                    </p>
                  </div>

                  {/* Road & Parking */}
                  <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#2D6A4F]">
                      <Car className="w-3.5 h-3.5" />
                      <span className="font-bold text-xs text-[#582F0E]">Parking &amp; Access</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {spot.amenities.includes('parking') ? 'Vehicle parking available on-site' : 'Local roadside parking'}
                    </p>
                  </div>

                  {/* Amenities */}
                  <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#2D6A4F]">
                      <Wifi className="w-3.5 h-3.5" />
                      <span className="font-bold text-xs text-[#582F0E]">Available Amenities</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {spot.amenities.join(', ') || 'Scenic view, rest areas'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nearby Serene Alternatives */}
              {alternatives.length > 0 && (
                <div className="space-y-3.5 pt-5 border-t border-[#E8E5DE]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2D6A4F]" />
                    <h3 className="font-serif font-bold text-sm text-[#582F0E]">
                      Nearby Serene Alternatives ({alternatives.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {alternatives.map((a) => (
                      <Link
                        key={a.id}
                        href={`/spots/${a.slug}`}
                        className="p-3.5 rounded-lg bg-[#FAF9F5] hover:bg-stone-50 border border-[#E3DFD5] flex items-center justify-between gap-3 transition group cursor-pointer"
                      >
                        <div className="flex-1">
                          <span className="text-xs font-bold text-[#582F0E] group-hover:text-[#2D6A4F] transition block">
                            {a.name}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {a.distanceKm ?? 12} km away • {a.municipality}
                          </span>
                        </div>
                        <div className="w-6 h-6 rounded-md bg-white border border-[#D5C4AC] text-[#2D6A4F] flex items-center justify-center group-hover:bg-[#2D6A4F] group-hover:text-white transition shrink-0">
                          <ArrowLeft className="w-3 h-3 rotate-180" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ----------------------------------------------------------------------- */}
            {/* ROW 3: COMMUNITY FIELD REPORTS & FORUM (BOTTOM)                         */}
            {/* ----------------------------------------------------------------------- */}
            <div
              id="community-forum-row"
              className="bg-white p-6 sm:p-8 rounded-xl border border-[#E3DFD5] space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DE]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#2D6A4F]" />
                  <h3 className="font-serif font-bold text-base text-[#582F0E]">
                    Community Field Reports &amp; Discussion ({comments.length})
                  </h3>
                </div>
                <span className="text-xs text-gray-500 font-medium">Verified Travelers</span>
              </div>

              {/* Inline Contribution Form */}
              <form onSubmit={handleAddComment} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add an on-site tip, condition report, or local recommendation..."
                  className="flex-1 bg-[#FAF9F5] border border-[#D5C4AC] rounded-lg px-4 py-2.5 text-xs text-[#582F0E] placeholder:text-[#837560] outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="bg-[#2D6A4F] hover:bg-[#1B4332] disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Report</span>
                </button>
              </form>

              {/* Tips & Discussion List */}
              <div className="space-y-3 pt-1">
                {comments.map((comment, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5 hover:border-[#D5C4AC] transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#582F0E]">{comment.author}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-50 border border-amber-200 text-[#7D5800] font-medium">
                          Traveler
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">{comment.time}</span>
                    </div>
                    <p className="text-xs text-[#403526] leading-relaxed">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
