'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Compass,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Loader2,
  PlusCircle,
  MessageSquare,
  Heart,
  Share2,
  Bookmark,
  ExternalLink,
  Flame,
  Clock,
  Camera,
  Film,
  Award,
  Users,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle2,
  Tag,
  Filter,
  Zap,
  Sun,
  Waves,
  Gift,
  Coins,
  Navigation as NavIcon,
  ChevronDown
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel, isVideoMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth';

import { fetchWithCache } from '@/lib/cache';
import { SpotCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';


const mockCommunityTips: Record<string, string[]> = {
  default: [
    'Best visited in the early morning before 9:00 AM to beat tourist buses!',
    'Local stalls right outside serve authentic Pangasinan kaleskes and fresh coconut water.',
    'Parking is available on the north side entrance for ₱20.',
  ],
};

export default function ExplorePage() {
  const { user } = useAuth();
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [sortFlair, setSortFlair] = useState<'for_you' | 'hot' | 'new' | 'quests' | 'quiet' | 'saved'>('for_you');
  const [search, setSearch] = useState('');
  const [likes, setLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [userComments, setUserComments] = useState<Record<string, string[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [openCircuits, setOpenCircuits] = useState(true);
  const [openRecent, setOpenRecent] = useState(true);

  const loadSpots = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      const cacheKey = `spots_${category}_${search.trim().toLowerCase()}`;
      const { data: rawSpots } = await fetchWithCache(
        cacheKey,
        async () => {
          const params: Record<string, string | number> = {};
          if (category !== 'all') params.categories = category;
          if (search.trim()) params.q = search.trim();
          const res = await api.get('/spots', { params });
          return (res.data.data as Parameters<typeof normalizeSpot>[0][]).map(normalizeSpot);
        },
        { ttlMs: 120_000, forceRefresh }
      );

      setSpots(rawSpots);

      // Initialize dynamic like states
      const initialLikes: Record<string, { count: number; isLiked: boolean }> = {};
      rawSpots.forEach((s, idx) => {
        initialLikes[s.id] = {
          count: 42 + (idx * 17) % 180,
          isLiked: false,
        };
      });
      setLikes(initialLikes);
    } catch {
      setError('Could not load destination community feed.');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    loadSpots();
  }, [loadSpots]);

  const handleToggleLike = (spotId: string) => {
    setLikes((prev) => {
      const current = prev[spotId] || { count: 50, isLiked: false };
      const newLiked = !current.isLiked;
      return {
        ...prev,
        [spotId]: {
          count: newLiked ? current.count + 1 : current.count - 1,
          isLiked: newLiked,
        },
      };
    });
  };

  const handleToggleComments = (spotId: string) => {
    setOpenComments((prev) => ({ ...prev, [spotId]: !prev[spotId] }));
  };

  const handleAddComment = (spotId: string) => {
    const text = commentInput[spotId]?.trim();
    if (!text) return;
    setUserComments((prev) => ({
      ...prev,
      [spotId]: [...(prev[spotId] || []), text],
    }));
    setCommentInput((prev) => ({ ...prev, [spotId]: '' }));
  };

  const toggleSave = (spotId: string) => {
    setSavedPosts((prev) => ({ ...prev, [spotId]: !prev[spotId] }));
  };

  // Filter & Sort Logic
  const savedCount = Object.values(savedPosts).filter(Boolean).length;
  const processedSpots = spots.filter((s) => {
    if (sortFlair === 'quests') return Boolean(s.questId);
    if (sortFlair === 'quiet') return s.crowdStatus === 'quiet' || s.crowdStatus === 'moderate';
    if (sortFlair === 'saved') return Boolean(savedPosts[s.id]);
    return true;
  });

  // Distinct recommendation selections
  const topRecommendation = spots[0] || null;
  const secondRecommendation = spots.find((s) => s.id !== topRecommendation?.id && s.imageUrl) || spots[1] || null;
  const thirdRecommendation = spots.find((s) => s.id !== topRecommendation?.id && s.id !== secondRecommendation?.id) || spots[2] || null;

  return (
    <Navigation>
      <div className="space-y-5">
        {/* Top "A place you may like" recommendation card */}
        {false && topRecommendation && (
          <article className="rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-white to-amber-50/40 p-4 sm:p-5 shadow-xs transition-all duration-300 ease-out hover:shadow-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-100 text-[#2D6A4F] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#2D6A4F]" />
                    A place you may like
                  </span>
                  <span className="text-[10px] text-[#837560] font-medium">· Organic recommendation</span>
                </div>
                <h2 className="text-base sm:text-lg font-black font-serif text-[#582F0E]">
                  {topRecommendation.name}
                </h2>
                <p className="text-xs leading-relaxed text-[#514532] line-clamp-2">
                  {topRecommendation.description}
                </p>
                <p className="text-[11px] font-bold text-[#2D6A4F] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {topRecommendation.municipality} · Selected based on your interests &amp; activity
                </p>
              </div>
              <Link
                href={`/spots/${topRecommendation.slug}`}
                className="shrink-0 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] px-4 py-2.5 text-center text-xs font-bold text-white transition-all duration-200 shadow-xs active:scale-95"
              >
                View this place →
              </Link>
            </div>
          </article>
        )}

        {/* Three-column discovery layout: actions / feed / recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
          
          {/* Main Feed Column (Mobile: order-1, Desktop: Center Column 6 cols) */}
          <div className="order-1 lg:order-none lg:col-span-6 lg:col-start-4 space-y-4 min-w-0">
            

            {/* Share / Post Box with Quick Action Buttons */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D6A4F] text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                  {user ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <Link
                  href="/spots/new"
                  className="flex-1 bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] rounded-xl px-4 py-2.5 text-xs text-[#837560] font-medium transition cursor-pointer flex items-center justify-between"
                >
                  <span>Share a hidden beach, heritage spot, or local tip...</span>
                  <div className="flex items-center gap-1.5 text-[#2D6A4F]">
                    <Film className="w-4 h-4" />
                    <Camera className="w-4 h-4" />
                  </div>
                </Link>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#F2EFE9] text-xs text-[#6B5E4C] px-1">
                <Link href="/spots/new" className="flex items-center gap-1.5 hover:text-[#2D6A4F] transition font-bold">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Photo Post</span>
                </Link>
                <Link href="/spots/new" className="flex items-center gap-1.5 hover:text-[#2D6A4F] transition font-bold">
                  <Film className="w-4 h-4 text-amber-600" />
                  <span>Video Tip</span>
                </Link>
                <Link href="/spots/new" className="flex items-center gap-1.5 hover:text-[#2D6A4F] transition font-bold">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Pin Spot</span>
                </Link>
                <Link href="/quests" className="flex items-center gap-1.5 hover:text-[#2D6A4F] transition font-bold">
                  <Trophy className="w-4 h-4 text-[#FFB703]" />
                  <span>Earn mJDQ</span>
                </Link>
              </div>
            </div>


            {/* Post Feed List */}
            {loading ? (
              <div className="space-y-4" aria-busy="true" aria-label="Loading destinations">
                <SpotCardSkeleton />
                <SpotCardSkeleton />
                <SpotCardSkeleton />
              </div>
            ) : error ? (
              <div className="bg-white rounded-3xl p-8 border border-red-200 text-center space-y-3 shadow-xs">
                <p className="text-xs text-[#BC4749] font-bold">{error}</p>
                <button
                  onClick={() => loadSpots(true)}
                  className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  Retry Loading
                </button>
              </div>
            ) : processedSpots.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-[#E3DFD5] text-center space-y-3 shadow-xs">
                <Compass className="w-10 h-10 text-[#D5C4AC] mx-auto" />
                <h3 className="font-bold text-sm text-[#582F0E]">No destinations found</h3>
                <p className="text-xs text-[#837560]">Try adjusting your search or category filter.</p>
                <button
                  onClick={() => {
                    setCategory('all');
                    setSearch('');
                    setSortFlair('hot');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs font-bold text-[#582F0E] hover:bg-white transition"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {processedSpots.map((spot, index) => {

                  const likeState = likes[spot.id] || { count: 50, isLiked: false };
                  const isCommentsOpen = Boolean(openComments[spot.id]);
                  const customTips = userComments[spot.id] || [];
                  const defaultTips = mockCommunityTips.default;
                  const allTips = [...defaultTips, ...customTips];

                  return (
                    <React.Fragment key={spot.id}>
                      <article
                        className="bg-white rounded-2xl border border-[#E3DFD5] hover:border-[#2D6A4F]/40 shadow-xs hover:shadow-md transition-all duration-300 ease-out overflow-hidden"
                      >
                        {/* Reddit-style Post Header & Caption Area */}
                        <div className="px-4 pt-3.5 pb-2 sm:px-5 sm:pt-4 sm:pb-2.5 space-y-2">
                          {/* Author & Municipality Header */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[#2D6A4F]/10 border border-[#2D6A4F]/20 flex items-center justify-center text-[#2D6A4F] text-[11px] font-black shrink-0">
                                {spot.municipality.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <Link
                                  href={`/search?muni=${encodeURIComponent(spot.municipality)}`}
                                  className="font-bold text-[#2C221E] hover:underline cursor-pointer truncate"
                                >
                                  p/{spot.municipality.toLowerCase().replace(/\s+/g, '')}
                                </Link>
                                <span className="text-[#837560] text-[10px]">·</span>
                                <span className="text-[#837560] text-[11px]">Shared by <strong className="text-[#582F0E]">{spot.sourceName}</strong></span>
                                {spot.trustLevel === 'lgu_verified' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[9px] border border-blue-200 shrink-0">
                                    <ShieldCheck className="w-2.5 h-2.5" />
                                    <span>LGU Verified</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {spot.crowdStatus === 'quiet' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E2F0E8] text-[#274E3C] text-[10px] font-bold shrink-0">
                                🌿 Quiet
                              </span>
                            ) : spot.crowdStatus === 'estimated_busy' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF3E8] text-[#D95D00] text-[10px] font-bold shrink-0 border border-[#FFD8B8]">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Peak
                              </span>
                            ) : null}
                          </div>

                          {/* Title */}
                          <Link href={`/spots/${spot.slug}`} className="block group">
                            <h2 className="text-base sm:text-lg font-bold font-serif text-[#2C221E] group-hover:text-[#2D6A4F] transition leading-snug">
                              {spot.name}
                            </h2>
                          </Link>

                          {/* Description Text */}
                          <p className="text-xs text-[#514532] leading-relaxed line-clamp-2 sm:line-clamp-3">
                            {spot.description}
                          </p>
                        </div>

                        {/* Reddit-style Inset Media Container */}
                        {spot.imageUrl && (
                          <div className="px-4 pb-2 sm:px-5">
                            {isVideoMedia(spot.imageUrl) ? (
                              <div className="relative w-full rounded-2xl border border-[#E3DFD5] bg-black aspect-[16/10] sm:aspect-[16/9] max-h-[480px] overflow-hidden group">
                                <video
                                  src={spot.imageUrl}
                                  controls
                                  playsInline
                                  muted
                                  preload="metadata"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-3 left-3 bg-[#0F172A]/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-md pointer-events-none">
                                  <Film className="w-3.5 h-3.5 text-[#FFB703]" />
                                  <span>Video Post</span>
                                </div>
                                {spot.questId && (
                                  <div className="absolute top-3 right-3 bg-[#FFB703] text-[#582F0E] px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md pointer-events-none">
                                    <Trophy className="w-3 h-3" />
                                    <span>Quest Available (+250 mJDQ)</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Link
                                href={`/spots/${spot.slug}`}
                                className="block w-full rounded-2xl border border-[#E3DFD5] group relative bg-stone-900/5 aspect-[16/10] sm:aspect-[16/9] max-h-[480px] overflow-hidden"
                              >
                                <img
                                  src={spot.imageUrl}
                                  alt={spot.name}
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                {spot.questId && (
                                  <div className="absolute top-3 right-3 bg-[#FFB703] text-[#582F0E] px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md">
                                    <Trophy className="w-3 h-3" />
                                    <span>Quest Available (+250 mJDQ)</span>
                                  </div>
                                )}
                              </Link>
                            )}
                          </div>
                        )}

                        {/* Reddit-style Pill Action Bar */}
                        <div className="px-4 pb-3 sm:px-5 sm:pb-3.5 pt-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between text-xs text-[#582F0E] font-bold gap-2">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              {/* Upvote / Heart Pill */}
                              <button
                                onClick={() => handleToggleLike(spot.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition duration-150 transform active:scale-95 border cursor-pointer ${
                                  likeState.isLiked
                                    ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold'
                                    : 'bg-[#FAF9F5] hover:bg-[#F2EFE9] border-[#E3DFD5] text-[#582F0E]'
                                }`}
                                aria-label={likeState.isLiked ? 'Unlike' : 'Like'}
                              >
                                <Heart
                                  className={`w-3.5 h-3.5 transition ${
                                    likeState.isLiked
                                      ? 'fill-rose-600 text-rose-600 scale-110'
                                      : 'text-[#837560]'
                                  }`}
                                />
                                <span className="text-xs font-black">{likeState.count}</span>
                              </button>

                              {/* Tips / Comments Pill */}
                              <button
                                onClick={() => handleToggleComments(spot.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] transition text-[#582F0E] active:scale-95 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-[#837560]" />
                                <span>{allTips.length} Tips</span>
                              </button>

                              {/* Share Pill */}
                              <button
                                onClick={() => {
                                  if (typeof navigator !== 'undefined' && navigator.share) {
                                    navigator.share({ title: spot.name, url: `/spots/${spot.slug}` }).catch(() => {});
                                  } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                    navigator.clipboard.writeText(window.location.origin + `/spots/${spot.slug}`);
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] transition text-[#582F0E] active:scale-95 cursor-pointer"
                              >
                                <Share2 className="w-3.5 h-3.5 text-[#837560]" />
                                <span className="hidden sm:inline">Share</span>
                              </button>

                              {/* Save Pill */}
                              <button
                                onClick={() => toggleSave(spot.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition active:scale-95 border cursor-pointer ${
                                  savedPosts[spot.id]
                                    ? 'bg-amber-50 border-amber-200 text-[#FFB703]'
                                    : 'bg-[#FAF9F5] hover:bg-[#F2EFE9] border-[#E3DFD5] text-[#582F0E]'
                                }`}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${savedPosts[spot.id] ? 'fill-[#FFB703]' : ''}`} />
                                <span className="hidden sm:inline">{savedPosts[spot.id] ? 'Saved' : 'Save'}</span>
                              </button>
                            </div>

                            {/* Primary Direct Actions */}
                            <div className="flex items-center gap-1.5">
                              {spot.questId && (
                                <Link
                                  href={`/quests/${spot.questId}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-[11px] font-black shadow-2xs transition active:scale-95"
                                >
                                  <Trophy className="w-3 h-3" />
                                  <span>Play Quest</span>
                                </Link>
                              )}

                              <Link
                                href={`/spots/${spot.slug}`}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-[11px] font-extrabold shadow-2xs transition active:scale-95"
                              >
                                <span>Explore</span>
                                <span>→</span>
                              </Link>
                            </div>
                          </div>

                          {/* Interactive Discussion / Tips Section */}
                          {isCommentsOpen && (
                            <div className="mt-2 pt-2 border-t border-[#E3DFD5] space-y-2 animate-fadeIn">
                              <h4 className="text-[11px] font-bold text-[#582F0E]">Traveler Tips &amp; On-Site Advice</h4>
                              
                              <div className="space-y-1.5">
                                {allTips.map((tip, idx) => (
                                  <div key={idx} className="p-2 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-[11px] text-[#514532] flex items-start gap-1.5">
                                    <div className="w-4 h-4 rounded-full bg-[#3F6653]/15 text-[#2D6A4F] font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                                      ✓
                                    </div>
                                    <p>{tip}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Add Comment Input */}
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <input
                                  type="text"
                                  value={commentInput[spot.id] || ''}
                                  onChange={(e) => setCommentInput({ ...commentInput, [spot.id]: e.target.value })}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(spot.id)}
                                  placeholder="Add a travel tip or advice..."
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#FAF9F5] text-xs border border-[#E3DFD5] outline-none focus:border-[#2D6A4F]"
                                />
                                <button
                                  onClick={() => handleAddComment(spot.id)}
                                  className="p-1.5 rounded-lg bg-[#2D6A4F] text-white hover:bg-[#1B4332] transition cursor-pointer"
                                >
                                  <Send className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </article>

                    {/* Interleaved Native Suggested Destination Card (Like Facebook feed ad after post #3) */}
                    {false && index === 2 && secondRecommendation && (
                      <article className="bg-gradient-to-br from-[#FAF9F5] via-white to-emerald-50/50 rounded-2xl border border-emerald-300/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-300 ease-out space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-black text-xs shadow-xs">
                              <Sparkles className="w-4 h-4 text-[#FFB703]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-[#582F0E]">A place you may like</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-[#2D6A4F] uppercase tracking-wider">
                                  Suggested Spot
                                </span>
                              </div>
                              <p className="text-[10px] text-[#837560] leading-none mt-0.5">
                                Sponsored · Recommended destination for your itinerary
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[#2D6A4F] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {secondRecommendation.municipality}
                          </span>
                        </div>

                        {secondRecommendation.imageUrl && (
                          <Link href={`/spots/${secondRecommendation.slug}`} className="block relative rounded-xl overflow-hidden aspect-[16/9] max-h-60 bg-stone-100 border border-[#E3DFD5] group">
                            <img
                              src={secondRecommendation.imageUrl}
                              alt={secondRecommendation.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                              <h3 className="font-serif font-bold text-base sm:text-lg text-white drop-shadow-sm">
                                {secondRecommendation.name}
                              </h3>
                              <p className="text-[11px] text-white/90 font-medium">
                                {secondRecommendation.subcategory || secondRecommendation.category.replace('_', ' ')} · {secondRecommendation.address}
                              </p>
                            </div>
                          </Link>
                        )}

                        <p className="text-xs text-[#514532] leading-relaxed">
                          {secondRecommendation.description}
                        </p>

                        <div className="pt-2 border-t border-[#E8E5DE] flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-[#837560] flex items-center gap-1">
                            🌿 Uncrowded &amp; community verified
                          </span>
                          <Link
                            href={`/spots/${secondRecommendation.slug}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <span>Explore Destination</span>
                            <span>→</span>
                          </Link>
                        </div>
                      </article>
                    )}

                    {/* Interleaved Native Suggested Destination Card (Like Facebook feed ad after post #6) */}
                    {false && index === 5 && thirdRecommendation && (
                      <article className="bg-gradient-to-br from-[#FAF9F5] via-white to-amber-50/50 rounded-2xl border border-amber-300/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-300 ease-out space-y-3 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#582F0E] text-white flex items-center justify-center font-black text-xs shadow-xs">
                              <Compass className="w-4 h-4 text-[#FFB703]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-[#582F0E]">A place you may like</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-[#935610] uppercase tracking-wider">
                                  Suggested Spot
                                </span>
                              </div>
                              <p className="text-[10px] text-[#837560] leading-none mt-0.5">
                                Sponsored · Featured Pangasinan Heritage &amp; Culture Spot
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[#582F0E] bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
                            {thirdRecommendation.municipality}
                          </span>
                        </div>

                        {thirdRecommendation.imageUrl && (
                          <Link href={`/spots/${thirdRecommendation.slug}`} className="block relative rounded-xl overflow-hidden aspect-[16/9] max-h-60 bg-stone-100 border border-[#E3DFD5] group">
                            <img
                              src={thirdRecommendation.imageUrl}
                              alt={thirdRecommendation.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />
                            <div className="absolute bottom-3 left-3 right-3 text-white">
                              <h3 className="font-serif font-bold text-base sm:text-lg text-white drop-shadow-sm">
                                {thirdRecommendation.name}
                              </h3>
                              <p className="text-[11px] text-white/90 font-medium">
                                {thirdRecommendation.subcategory || thirdRecommendation.category.replace('_', ' ')} · {thirdRecommendation.address}
                              </p>
                            </div>
                          </Link>
                        )}

                        <p className="text-xs text-[#514532] leading-relaxed">
                          {thirdRecommendation.description}
                        </p>

                        <div className="pt-2 border-t border-[#E8E5DE] flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-[#837560] flex items-center gap-1">
                            🏛️ Verified Cultural Landmark
                          </span>
                          <Link
                            href={`/spots/${thirdRecommendation.slug}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#935610] hover:bg-[#72420B] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <span>Explore Landmark</span>
                            <span>→</span>
                          </Link>
                        </div>
                      </article>
                    )}
                  </React.Fragment>
                );
              })}

            </div>
          )}
        </div>

        {/* Left Actions Column (Order 3 on mobile, Left Column on desktop) */}
        <aside className="order-3 lg:order-none lg:col-span-3 lg:col-start-1 lg:row-start-1 lg:sticky lg:top-20 lg:self-start space-y-3.5">



          {/* Reddit-style Feeds & Navigation Rail */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E3DFD5] shadow-xs space-y-1">
            <h3 className="text-[10px] font-bold text-[#837560] uppercase tracking-wider px-2.5 pb-1">
              Feeds
            </h3>

            <button
              onClick={() => setSortFlair('for_you')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer active:scale-98 ${
                sortFlair === 'for_you'
                  ? 'bg-[#2D6A4F] text-white shadow-xs'
                  : 'hover:bg-[#FAF9F5] text-[#2C221E]'
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Explore All</span>
            </button>

            <button
              onClick={() => setSortFlair('hot')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer active:scale-98 ${
                sortFlair === 'hot'
                  ? 'bg-[#2D6A4F] text-white shadow-xs'
                  : 'hover:bg-[#FAF9F5] text-[#2C221E]'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Popular Places</span>
            </button>

            <button
              onClick={() => setSortFlair('quests')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer active:scale-98 ${
                sortFlair === 'quests'
                  ? 'bg-[#2D6A4F] text-white shadow-xs'
                  : 'hover:bg-[#FAF9F5] text-[#2C221E]'
              }`}
            >
              <Zap className="w-4 h-4 text-[#FFB703] shrink-0" />
              <span>Quests &amp; Bounties</span>
            </button>

            <button
              onClick={() => setSortFlair('quiet')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer active:scale-98 ${
                sortFlair === 'quiet'
                  ? 'bg-[#2D6A4F] text-white shadow-xs'
                  : 'hover:bg-[#FAF9F5] text-[#2C221E]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Quiet &amp; Serene</span>
            </button>

            {savedCount > 0 && (
              <button
                onClick={() => setSortFlair('saved')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer active:scale-98 ${
                  sortFlair === 'saved'
                    ? 'bg-[#2D6A4F] text-white shadow-xs'
                    : 'hover:bg-[#FAF9F5] text-[#2C221E]'
                }`}
              >
                <Bookmark className="w-4 h-4 text-[#FFB703] shrink-0" />
                <span>Saved Places ({savedCount})</span>
              </button>
            )}

            {/* Reddit-style "+ Submit a Spot" Button */}
            <div className="pt-2 border-t border-[#F2EFE9] mt-1.5">
              <Link
                href="/spots/new"
                className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] text-xs font-bold text-[#2C221E] hover:text-[#2D6A4F] transition shadow-2xs group"
              >
                <PlusCircle className="w-4 h-4 text-[#2D6A4F] group-hover:scale-110 transition" />
                <span>Submit a Spot or Tip</span>
              </Link>
            </div>
          </div>

          {/* Tourism Circuits (Collapsible, Reddit-style) */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E3DFD5] shadow-xs space-y-1">
            <button
              onClick={() => setOpenCircuits(!openCircuits)}
              className="w-full flex items-center justify-between text-[10px] font-bold text-[#837560] uppercase tracking-wider px-2.5 py-1 hover:text-[#2C221E] cursor-pointer"
            >
              <span>Tourism Circuits</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openCircuits ? 'rotate-180' : ''}`} />
            </button>

            {openCircuits && (
              <div className="space-y-0.5 pt-1 text-xs animate-fadeIn">
                <Link
                  href="/search?cat=nature_outdoors"
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#FAF9F5] text-[#514532] hover:text-[#2D6A4F] transition text-left cursor-pointer"
                >
                  <span className="truncate">🌊 Western Coast (Bolinao, Alaminos)</span>
                  <span className="text-[10px] text-[#837560]">Beaches →</span>
                </Link>
                <Link
                  href="/search?cat=culture_heritage"
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#FAF9F5] text-[#514532] hover:text-[#2D6A4F] transition text-left cursor-pointer"
                >
                  <span className="truncate">🏛️ Central Heritage (Lingayen, Dagupan)</span>
                  <span className="text-[10px] text-[#837560]">History →</span>
                </Link>
                <Link
                  href="/search?cat=activities_wellness"
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#FAF9F5] text-[#514532] hover:text-[#2D6A4F] transition text-left cursor-pointer"
                >
                  <span className="truncate">🌄 Eastern Ecotourism (San Nicolas, Tayug)</span>
                  <span className="text-[10px] text-[#837560]">Trek →</span>
                </Link>
              </div>
            )}
          </div>

          {/* Popular / Recent Destinations (Reddit-style with circular avatars) */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E3DFD5] shadow-xs space-y-1">
            <button
              onClick={() => setOpenRecent(!openRecent)}
              className="w-full flex items-center justify-between text-[10px] font-bold text-[#837560] uppercase tracking-wider px-2.5 py-1 hover:text-[#2C221E] cursor-pointer"
            >
              <span>Featured Destinations</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openRecent ? 'rotate-180' : ''}`} />
            </button>

            {openRecent && (
              <div className="space-y-1 pt-1 text-xs animate-fadeIn">
                <Link
                  href="/spots/hundred-islands"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF9F5] text-[#2C221E] hover:text-[#2D6A4F] transition group"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#2D6A4F] flex items-center justify-center text-[10px] font-bold shrink-0">
                    🏝️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate group-hover:text-[#2D6A4F]">Hundred Islands</p>
                    <p className="text-[10px] text-[#837560] truncate">Alaminos City · 124 islands</p>
                  </div>
                </Link>

                <Link
                  href="/spots/cape-bolinao-lighthouse"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF9F5] text-[#2C221E] hover:text-[#2D6A4F] transition group"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-[#582F0E] flex items-center justify-center text-[10px] font-bold shrink-0">
                    🗼
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate group-hover:text-[#2D6A4F]">Cape Bolinao Lighthouse</p>
                    <p className="text-[10px] text-[#837560] truncate">Bolinao · 1905 Heritage</p>
                  </div>
                </Link>

                <Link
                  href="/spots/manaoag-church"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF9F5] text-[#2C221E] hover:text-[#2D6A4F] transition group"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                    ⛪
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate group-hover:text-[#2D6A4F]">Minor Basilica of Manaoag</p>
                    <p className="text-[10px] text-[#837560] truncate">Manaoag · Pilgrim Shrine</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Portals Shortcuts */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E3DFD5] shadow-xs space-y-1">
            <h3 className="text-[10px] font-bold text-[#837560] uppercase tracking-wider px-2.5 pb-1">
              Explorer Tools
            </h3>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <Link
                href="/map"
                className="flex items-center gap-1.5 p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] text-[#2C221E] hover:text-[#2D6A4F] font-bold transition"
              >
                <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>OSM Map</span>
              </Link>
              <Link
                href="/navigate"
                className="flex items-center gap-1.5 p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] text-[#2C221E] hover:text-blue-600 font-bold transition"
              >
                <NavIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Valhalla</span>
              </Link>
              <Link
                href="/leaderboard"
                className="flex items-center gap-1.5 p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] text-[#2C221E] hover:text-[#B45309] font-bold transition"
              >
                <Award className="w-3.5 h-3.5 text-[#B45309]" />
                <span>Ranks</span>
              </Link>
              <Link
                href="/shop"
                className="flex items-center gap-1.5 p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] text-[#2C221E] hover:text-emerald-600 font-bold transition"
              >
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Deals</span>
              </Link>
            </div>
          </div>

          {/* Coastal Weather & Travel Conditions Snapshot */}
          <div className="bg-gradient-to-br from-white to-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100">
              <span className="text-[11px] font-bold text-[#2D6A4F] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>Pangasinan Coastal Weather</span>
              </span>
              <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Live</span>
            </div>
            <div className="space-y-1 text-xs text-[#514532]">
              <div className="flex items-center justify-between">
                <span className="text-[#837560] text-[11px]">Lingayen Gulf:</span>
                <span className="font-bold text-[#2C221E] text-[11px]">☀️ 31°C · Clear Sky</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#837560] text-[11px]">Bolinao Reefs:</span>
                <span className="font-bold text-[#2D6A4F] text-[11px]">🌊 Calm · Low Tide</span>
              </div>
            </div>
            <p className="text-[10px] text-[#837560] leading-tight pt-1 border-t border-emerald-100/70">
              Favorable sea breezes and sunny skies across western Pangasinan. Great for beach exploration and outdoor heritage walks today!
            </p>
          </div>
        </aside>

        {/* Right Personalized Discovery Column (Order 2 on mobile, Right Column on desktop) */}
        <aside className="order-2 lg:order-none lg:col-span-3 lg:col-start-10 lg:row-start-1 lg:sticky lg:top-20 lg:self-start space-y-4">

          {/* Personalized "A place you may like" Spotlight */}
          {topRecommendation && (
            <article className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xs group">
              {topRecommendation.imageUrl && (
                <Link href={`/spots/${topRecommendation.slug}`} className="block aspect-[16/10] overflow-hidden bg-stone-100 relative">
                  <img
                    src={topRecommendation.imageUrl}
                    alt={`${topRecommendation.name} recommended destination`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1 shadow-xs">
                    <Sparkles className="h-2.5 w-2.5 text-[#2D6A4F]" />
                    <span>A place you may like</span>
                  </div>
                </Link>
              )}
              <div className="space-y-2.5 p-4">
                <div>
                  <h2 className="font-serif text-base font-black leading-snug text-[#582F0E] group-hover:text-[#2D6A4F] transition">
                    <Link href={`/spots/${topRecommendation.slug}`}>
                      {topRecommendation.name}
                    </Link>
                  </h2>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#2D6A4F]">
                    <MapPin className="h-3 w-3" />
                    {topRecommendation.municipality} · Pangasinan
                  </p>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-[#514532]">
                  {topRecommendation.description}
                </p>
                <p className="text-[10px] text-[#837560] font-medium italic">
                  Curated based on your interests &amp; community ratings
                </p>
                <Link
                  href={`/spots/${topRecommendation.slug}`}
                  className="flex w-full items-center justify-center rounded-xl bg-[#2D6A4F] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1B4332] active:scale-95 shadow-xs"
                >
                  Explore Destination →
                </Link>
              </div>
            </article>
          )}

          {/* Active Quests & Bounties */}
          <div className="bg-white rounded-2xl p-4 border border-[#E3DFD5] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#FFB703]" />
                <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">Top Quests</h3>
              </div>
              <Link href="/quests" className="text-[10px] font-bold text-[#2D6A4F] hover:underline">
                All Quests →
              </Link>
            </div>

            <div className="space-y-2">
              <Link
                href="/quests"
                className="block p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] hover:border-[#FFB703] transition space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C221E] group-hover:text-[#2D6A4F]">Hundred Islands Peak</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FFB703]/20 text-[#854D0E]">+250 mJDQ</span>
                </div>
                <p className="text-[10px] text-[#837560] leading-tight">Climb Governor's Island peak and check in with GPS.</p>
              </Link>

              <Link
                href="/quests"
                className="block p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] hover:border-[#FFB703] transition space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C221E] group-hover:text-[#2D6A4F]">Bolinao Lighthouse</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FFB703]/20 text-[#854D0E]">+200 mJDQ</span>
                </div>
                <p className="text-[10px] text-[#837560] leading-tight">Check in at the historic 1905 Cape Bolinao tower.</p>
              </Link>

              <Link
                href="/quests"
                className="block p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] hover:border-[#FFB703] transition space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C221E] group-hover:text-[#2D6A4F]">Lingayen Veterans Memorial</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FFB703]/20 text-[#854D0E]">+150 mJDQ</span>
                </div>
                <p className="text-[10px] text-[#837560] leading-tight">Visit the historic Capitol grounds and beach park.</p>
              </Link>
            </div>
          </div>

          {/* Local MSME Partner Deals & Perks */}
          <div className="bg-white rounded-2xl p-4 border border-[#E3DFD5] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">Merchant Perks</h3>
              </div>
              <Link href="/shop" className="text-[10px] font-bold text-[#2D6A4F] hover:underline">
                Shop →
              </Link>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B4332]">Alaminos Longganisa Deli</span>
                  <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">10% OFF</span>
                </div>
                <p className="text-[10px] text-[#514532]">Claim voucher with 100 mJDQ points at Alaminos partners.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#582F0E]">Patar Surf &amp; Kayak Rentals</span>
                  <span className="text-[9px] font-extrabold text-[#935610] bg-amber-100 px-1.5 py-0.5 rounded">₱50 OFF</span>
                </div>
                <p className="text-[10px] text-[#514532]">Bolinao eco-adventure discount with 80 mJDQ points.</p>
              </div>
            </div>
          </div>

          {/* Saved Destinations Badge */}
          {savedCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#FFB703] fill-[#FFB703]" />
                <span className="font-bold text-[#582F0E]">{savedCount} destination{savedCount > 1 ? 's' : ''} saved</span>
              </div>
              <button
                onClick={() => setSortFlair(sortFlair === 'saved' ? 'for_you' : 'saved')}
                className="text-[11px] font-bold text-[#2D6A4F] hover:underline cursor-pointer"
              >
                {sortFlair === 'saved' ? 'Show All' : 'View Saved →'}
              </button>
            </div>
          )}

          {/* Academic Capstone & Responsible Tourism Footer (Reddit-style) */}
          <div className="px-2 pt-2 text-[11px] text-[#837560] space-y-2 border-t border-[#E8E5DE]">
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-medium text-[11px]">
              <Link href="/about" className="hover:underline hover:text-[#2D6A4F]">About</Link>
              <Link href="/terms" className="hover:underline hover:text-[#2D6A4F]">Terms</Link>
              <Link href="/privacy" className="hover:underline hover:text-[#2D6A4F]">Privacy</Link>
              <Link href="/campaigns" className="hover:underline hover:text-[#2D6A4F]">Campaigns</Link>
              <Link href="/map" className="hover:underline hover:text-[#2D6A4F]">OSM Map</Link>
            </div>
            <p className="text-[10px] text-[#9E907E] leading-relaxed">
              JuanDerQuest: A Gamified Blockchain-based System for Promoting Tourist Destinations in Pangasinan.
            </p>
            <p className="text-[10px] text-[#9E907E]">
              Universidad de Dagupan · © 2026 JuanDerQuest
            </p>
          </div>
        </aside>

        </div>

      </div>
    </Navigation>
  );
}

