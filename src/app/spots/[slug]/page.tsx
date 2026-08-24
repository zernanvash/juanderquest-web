'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { SpotDetailSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const defaultMockTips = [
  {
    author: 'HeritageGuide_Carl',
    time: '3 hours ago',
    text: 'If visiting in the afternoon, bring an umbrella as there is limited shade along the outer trail. The view is completely worth it though!',
    upvotes: 24,
  },
  {
    author: 'EcoScout_Alyana',
    time: 'Yesterday',
    text: 'Local tricycle drivers near the town plaza can take you straight to the entrance for around ₱30-₱50 per person.',
    upvotes: 12,
  },
];

export default function SpotDetailPage() {
  const params = useParams();
  const router = useRouter();
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

  // Compute slides array from spot data
  const slides = spot
    ? [
        spot.imageUrl,
        '/bg_landscape.png',
      ].filter(Boolean) as string[]
    : ['/bg_landscape.png'];

  // Auto-play slideshow every 6 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

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

  const handleToggleLike = async () => {
    if (!spot) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikeCount((prev) => (nextState ? prev + 1 : prev - 1));
    try {
      await api.post(`/spots/${spot.id}/interactions`, { type: 'helpful' });
    } catch {
      // Revert if request fails
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

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to load Destination Spot">
        <div className="space-y-6">
          {/* Breadcrumb & Navigation Bar */}
          <div className="flex items-center justify-between">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-xs font-black text-[#7D5800] hover:text-[#582F0E] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Pangasinan Explore Feed</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSave}
                className={`p-2.5 rounded-2xl border transition cursor-pointer active:scale-95 ${
                  isSaved
                    ? 'bg-[#FFB703] text-[#582F0E] border-[#FFB703]'
                    : 'bg-white border-[#E3DFD5] text-gray-500 hover:text-[#582F0E]'
                }`}
                title="Save Destination"
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#582F0E]' : ''}`} />
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: spot.name, url: window.location.href }).catch(() => {});
                  }
                }}
                className="p-2.5 rounded-2xl bg-white border border-[#E3DFD5] text-gray-500 hover:text-[#582F0E] transition cursor-pointer active:scale-95"
                title="Share Spot"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expansive Full-Width 2-Column Grid (12 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Visual Media, Overview, & Discussion Forum (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Hero Image Slideshow Carousel (Stitch Slideshow Experience) */}
              <div className="bg-white rounded-3xl border border-[#E3DFD5] overflow-hidden shadow-xs">
                <div className="relative w-full h-80 sm:h-[420px] bg-stone-900 group">
                  {/* Current Active Slide Image */}
                  <img
                    src={slides[activeSlide] || spot.imageUrl || '/bg_landscape.png'}
                    alt={`${spot.name} - View ${activeSlide + 1}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/bg_landscape.png';
                    }}
                    className="w-full h-full object-cover transition-all duration-700 transform scale-100"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

                  {/* Top Status & Quest Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
                    <span className="px-3.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-black flex items-center gap-1.5 shadow-md">
                      <Camera className="w-3.5 h-3.5 text-[#FFB703]" />
                      <span>{activeSlide + 1} / {slides.length}</span>
                    </span>

                    {spot.questId && (
                      <div className="bg-[#FFB703] text-[#582F0E] px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg">
                        <Trophy className="w-4 h-4" />
                        <span>Quest Available (+250 mJDQ)</span>
                      </div>
                    )}
                  </div>

                  {/* Slideshow Previous / Next Controls */}
                  {slides.length > 1 && (
                    <div className="absolute inset-y-0 inset-x-3 flex items-center justify-between pointer-events-none">
                      <button
                        onClick={() => setActiveSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                        className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center pointer-events-auto transition cursor-pointer active:scale-95 shadow-md"
                        aria-label="Previous Slide"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                        className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center pointer-events-auto transition cursor-pointer active:scale-95 shadow-md"
                        aria-label="Next Slide"
                      >
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </button>
                    </div>
                  )}

                  {/* Slide Indicator Dots */}
                  {slides.length > 1 && (
                    <div className="absolute bottom-20 inset-x-0 flex items-center justify-center gap-2 z-10">
                      {slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSlide(idx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            activeSlide === idx ? 'w-6 bg-[#FFB703]' : 'w-2 bg-white/60 hover:bg-white'
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Title & Location Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-white z-10">
                    <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-1">
                      <h1 className="text-xl sm:text-2xl font-black font-serif drop-shadow-sm">{spot.name}</h1>
                      <p className="text-xs text-amber-200 font-bold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#48C71D]" />
                        <span>{spot.address}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Interaction Bar */}
                <div className="p-4 bg-[#FAF9F5] border-t border-[#E3DFD5] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleToggleLike}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition duration-150 transform active:scale-95 cursor-pointer ${
                        isLiked
                          ? 'bg-rose-50 border-rose-200 text-rose-600 font-black'
                          : 'bg-white border-[#E3DFD5] text-[#582F0E] hover:border-rose-300'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : 'text-gray-400'}`} />
                      <span className="text-xs font-black">{likeCount} Travelers Liked</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <span className="capitalize">{spot.subcategory.replaceAll('_', ' ')}</span>
                    <span>•</span>
                    <span className="text-[#2D6A4F]">{spot.municipality}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Narrative & Description */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3DFD5] shadow-xs space-y-4">
                <h2 className="text-sm font-black text-[#582F0E] uppercase tracking-wider">About this Destination:</h2>
                <p className="text-xs sm:text-sm text-[#514532] leading-relaxed whitespace-pre-line">
                  {spot.description}
                </p>

                {/* Tags Flair */}
                {spot.tags.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                      Experience Highlights:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {spot.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-xl bg-amber-50 text-[#7D5800] border border-amber-200/60 text-xs font-bold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Traveler Discussion & Forum Section */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3DFD5] shadow-xs space-y-5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#2D6A4F]" />
                  <h3 className="font-serif font-black text-base text-[#582F0E]">
                    Traveler Tips &amp; Field Reports ({comments.length})
                  </h3>
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share an on-site tip or local recommendation..."
                    className="flex-1 bg-[#FAF9F5] border border-[#D5C4AC] rounded-2xl px-4 py-3 text-xs text-[#582F0E] placeholder:text-[#837560] outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="bg-[#2D6A4F] hover:bg-[#1B4332] disabled:opacity-50 text-white rounded-2xl px-5 py-3 text-xs font-black flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>

                <div className="space-y-3 pt-2">
                  {comments.map((comment, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#582F0E]">{comment.author}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">{comment.time}</span>
                      </div>
                      <p className="text-xs text-[#514532] leading-relaxed">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Navigation Action, Crowd Telemetry, & Serene Alternatives (5 cols) */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
              {/* Primary Action Card: In-App Valhalla Navigation */}
              <div className="bg-[#FFFDF7] rounded-3xl p-6 border border-[#E8DCB8] shadow-md space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[#7D5800] uppercase tracking-wider block">
                    Traveler Action Center
                  </span>
                  <h2 className="text-lg font-black text-[#582F0E]">Ready to Visit?</h2>
                </div>

                <Link
                  href={navigateUrl}
                  onClick={trackDirections}
                  className="w-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-2xl py-4 px-6 text-sm font-black flex items-center justify-center gap-2.5 shadow-lg transition transform hover:scale-[1.01] active:scale-95 cursor-pointer text-center"
                >
                  <NavIcon className="w-5 h-5 text-[#FFB703]" />
                  <span>Navigate with Valhalla (Turn-by-Turn)</span>
                </Link>

                {spot.questId && (
                  <Link
                    href={`/quests/${spot.questId}`}
                    className="w-full bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] rounded-2xl py-3.5 px-6 text-xs font-black flex items-center justify-center gap-2 shadow-sm transition active:scale-95 text-center"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Play Linked Quest (+250 mJDQ)</span>
                  </Link>
                )}
              </div>

              {/* Overcrowding Status & Diversion Alert */}
              {spot.crowdStatus === 'estimated_busy' ? (
                <div className="rounded-3xl bg-[#FFF3E8] border border-[#FFD8B8] p-5 text-xs text-[#9E3E00] space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 text-sm font-black text-[#D95D00]">
                    <AlertTriangle className="w-5 h-5" />
                    <span>High Tourist Density Reported</span>
                  </div>
                  <p className="text-xs text-[#6B4B00] leading-relaxed">
                    Based on recent check-in frequency. Consider visiting one of the peaceful nearby alternatives below to enjoy tranquil scenery and earn bonus discovery rewards!
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl bg-emerald-50/70 border border-emerald-200/70 p-5 text-xs text-emerald-900 flex items-center gap-3 shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-[#2D6A4F] text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-[#2D6A4F] block">Peaceful Visitor Traffic</span>
                    <span className="text-[11px] text-gray-600">Great time to explore with low crowd congestion.</span>
                  </div>
                </div>
              )}

              {/* Destination Practical Specs */}
              <div className="bg-white p-6 rounded-3xl border border-[#E3DFD5] shadow-xs space-y-4">
                <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">Spot Specifications</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5]">
                    <Clock className="w-4 h-4 text-[#2D6A4F] mt-0.5" />
                    <div>
                      <span className="font-bold text-[#582F0E] block">Visiting Hours</span>
                      <span className="text-gray-600">{Object.values(spot.hours)[0] || 'Open Daily (08:00 - 18:00)'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5]">
                    <Car className="w-4 h-4 text-[#2D6A4F] mt-0.5" />
                    <div>
                      <span className="font-bold text-[#582F0E] block">Parking &amp; Accessibility</span>
                      <span className="text-gray-600">
                        {spot.amenities.includes('parking') ? 'On-site vehicle parking available' : 'Local roadside parking'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5]">
                    <Wifi className="w-4 h-4 text-[#2D6A4F] mt-0.5" />
                    <div>
                      <span className="font-bold text-[#582F0E] block">Available Amenities</span>
                      <span className="text-gray-600">{spot.amenities.join(', ') || 'Scenic view, rest areas'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Serene Alternatives Carousel / List */}
              <div className="bg-white p-6 rounded-3xl border border-[#E3DFD5] shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2D6A4F]" />
                  <h3 className="font-serif font-black text-sm text-[#582F0E]">
                    Nearby Serene Alternatives ({alternatives.length})
                  </h3>
                </div>

                {alternatives.length > 0 ? (
                  <div className="space-y-3">
                    {alternatives.map((a) => (
                      <Link
                        key={a.id}
                        href={`/spots/${a.slug}`}
                        className="p-3.5 rounded-2xl bg-[#FAF9F5] hover:bg-stone-50 border border-[#E3DFD5] flex items-center justify-between gap-3 transition block group"
                      >
                        <div className="flex-1">
                          <span className="text-xs font-black text-[#582F0E] group-hover:text-[#2D6A4F] transition block">
                            {a.name}
                          </span>
                          <span className="text-[11px] text-gray-500">{a.distanceKm ?? 12} km away • {a.municipality}</span>
                        </div>
                        <div className="w-7 h-7 rounded-xl bg-white border border-[#D5C4AC] text-[#2D6A4F] flex items-center justify-center group-hover:bg-[#2D6A4F] group-hover:text-white transition">
                          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No alternate spots listed within 25 km.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
