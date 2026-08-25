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
  Award,
  Users,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle2,
  Tag,
  Filter,
  Zap
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fetchWithCache } from '@/lib/cache';
import { SpotCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const categories = [
  { id: 'all', label: 'All Destinations' },
  { id: 'eat_drink', label: '🍜 Food & Culinary' },
  { id: 'nature_outdoors', label: '🏖️ Nature & Beaches' },
  { id: 'culture_heritage', label: '🏛️ Heritage & Shrines' },
  { id: 'activities_wellness', label: '🧗 Outdoor & Eco' },
  { id: 'shopping_local', label: '🛍️ Local MSME Crafts' },
];

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
  const [sortFlair, setSortFlair] = useState<'hot' | 'new' | 'quests' | 'quiet'>('hot');
  const [search, setSearch] = useState('');
  const [likes, setLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [userComments, setUserComments] = useState<Record<string, string[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});

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
  const processedSpots = spots.filter((s) => {
    if (sortFlair === 'quests') return Boolean(s.questId);
    if (sortFlair === 'quiet') return s.crowdStatus === 'quiet' || s.crowdStatus === 'moderate';
    return true;
  });

  return (
    <Navigation>
      <div className="space-y-6">
        {/* JuanDerQuest Traveler Community Header Banner */}
        <div className="rounded-xl bg-white border border-[#E3DFD5] overflow-hidden shadow-xs">
          {/* Cover Header Banner */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#7D5800] p-5 sm:p-6 relative flex items-end justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(#FFB703_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
            <div className="relative z-10 text-white">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFB703] bg-black/30 px-2 py-0.5 rounded-md border border-white/10">
                Pangasinan Tourism Network
              </span>
              <h1 className="text-xl sm:text-3xl font-serif font-bold text-white mt-1 drop-shadow-sm">
                Traveler Discoveries &amp; Quests
              </h1>
            </div>
            <Link
              href="/spots/new"
              className="relative z-10 bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition active:scale-98 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Share a Destination</span>
            </Link>
          </div>

          {/* Stats & Community Info Bar */}
          <div className="px-5 py-3 bg-white flex flex-wrap items-center justify-between gap-4 border-t border-[#E8E5DE] text-xs">
            <p className="text-[#514532] font-medium max-w-xl">
              Explore authentic local spots across Pangasinan, discover quiet eco-trails, and unlock verified destination bounties.
            </p>
            <div className="flex items-center gap-4 text-[#7D5800] font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#48C71D] animate-pulse"></span>
                <span>3,280 Travelers Online</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>94 Active Quests</span>
              </span>
            </div>
          </div>
        </div>

        {/* Structured Multi-Column Post Stream (8 Cols Feed / 4 Cols Widgets) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Feed Column (Span 8) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Share / Post Box */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3DFD5] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2D6A4F] text-white font-bold flex items-center justify-center text-sm shrink-0">
                {user ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <Link
                href="/spots/new"
                className="flex-1 bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] rounded-xl px-4 py-2.5 text-xs text-[#837560] font-medium transition cursor-pointer flex items-center justify-between"
              >
                <span>Share a hidden beach, heritage spot, or local food tip...</span>
                <Camera className="w-4 h-4 text-[#2D6A4F]" />
              </Link>
            </div>

            {/* Sorting & Filter Flairs */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setSortFlair('hot')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      sortFlair === 'hot'
                        ? 'bg-[#FFB703] text-[#582F0E] shadow-xs'
                        : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Trending</span>
                  </button>

                  <button
                    onClick={() => setSortFlair('new')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      sortFlair === 'new'
                        ? 'bg-[#2D6A4F] text-white shadow-xs'
                        : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Recent</span>
                  </button>

                  <button
                    onClick={() => setSortFlair('quests')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      sortFlair === 'quests'
                        ? 'bg-[#582F0E] text-white shadow-xs'
                        : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 text-[#FFB703]" />
                    <span>Quests Only</span>
                  </button>

                  <button
                    onClick={() => setSortFlair('quiet')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      sortFlair === 'quiet'
                        ? 'bg-[#2D6A4F] text-white shadow-xs'
                        : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <span>🌿 Tranquil Gems</span>
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-56 sm:min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-[#837560] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search destinations..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#FAF9F5] rounded-xl text-xs border border-[#E3DFD5] outline-none focus:border-[#2D6A4F]"
                  />
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E3DFD5]/60">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                      category === cat.id
                        ? 'bg-[#2D6A4F]/15 text-[#2D6A4F] font-extrabold'
                        : 'text-[#7D5800] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
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
                {processedSpots.map((spot) => {
                  const likeState = likes[spot.id] || { count: 50, isLiked: false };
                  const isCommentsOpen = Boolean(openComments[spot.id]);
                  const customTips = userComments[spot.id] || [];
                  const defaultTips = mockCommunityTips.default;
                  const allTips = [...defaultTips, ...customTips];

                  return (
                    <article
                      key={spot.id}
                      className="bg-white rounded-2xl border border-[#E3DFD5] hover:border-[#2D6A4F]/40 shadow-xs hover:shadow-md transition duration-200 overflow-hidden"
                    >
                      {/* Post Main Body */}
                      <div className="p-4 sm:p-6 space-y-3">
                        {/* Meta Header */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#837560]">
                          <span className="font-extrabold text-[#2D6A4F] flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {spot.municipality}
                          </span>
                          <span>•</span>
                          <span>Shared by <strong className="text-[#582F0E]">{spot.sourceName}</strong></span>

                          {/* Provenance Badge */}
                          {spot.trustLevel === 'lgu_verified' && (
                            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold text-[10px] border border-blue-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>LGU Verified</span>
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <Link href={`/spots/${spot.slug}`} className="block group">
                          <h2 className="text-lg sm:text-xl font-black font-serif text-[#582F0E] group-hover:text-[#2D6A4F] transition leading-snug">
                            {spot.name}
                          </h2>
                        </Link>

                        {/* Crowd Status Banner */}
                        {spot.crowdStatus === 'estimated_busy' ? (
                          <div className="p-2.5 rounded-xl bg-[#FFF3E8] border border-[#FFD8B8] flex items-center justify-between text-xs text-[#9E3E00]">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-[#D95D00] shrink-0" />
                              <span className="font-bold">Peak Visitor Activity Reported</span>
                            </div>
                            <Link href={`/spots/${spot.slug}`} className="text-[11px] font-extrabold underline text-[#D95D00]">
                              View tranquil alternatives →
                            </Link>
                          </div>
                        ) : spot.crowdStatus === 'quiet' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E2F0E8] text-[#274E3C] text-[10px] font-extrabold">
                            <span>🌿 Serene &amp; Low Crowd</span>
                          </div>
                        ) : null}

                        {/* Description Text */}
                        <p className="text-xs sm:text-sm text-[#514532] leading-relaxed">
                          {spot.description}
                        </p>

                        {/* Photo Image Card with graceful fallback */}
                        {spot.imageUrl && (
                          <Link href={`/spots/${spot.slug}`} className="block rounded-2xl overflow-hidden border border-[#E3DFD5] group max-h-96 relative bg-[#FAF9F5] aspect-video">
                            <img
                              src={spot.imageUrl}
                              alt={spot.name}
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                              className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                            />
                            {spot.questId && (
                              <div className="absolute top-3 right-3 bg-[#FFB703] text-[#582F0E] px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md">
                                <Trophy className="w-3.5 h-3.5" />
                                <span>Quest Available (+250 mJDQ)</span>
                              </div>
                            )}
                          </Link>
                        )}

                        {/* Social Interaction Action Bar (Instagram-style Heart + Comments + Actions) */}
                        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-[#E3DFD5]/60 text-xs text-[#7D5800] font-bold gap-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {/* Instagram-style Heart Button */}
                            <button
                              onClick={() => handleToggleLike(spot.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition duration-150 transform active:scale-90 ${
                                likeState.isLiked
                                  ? 'bg-rose-50 text-rose-600 font-black'
                                  : 'hover:bg-[#FAF9F5] text-[#582F0E]'
                              }`}
                              aria-label={likeState.isLiked ? 'Unlike' : 'Like'}
                            >
                              <Heart
                                className={`w-4 h-4 transition ${
                                  likeState.isLiked
                                    ? 'fill-rose-600 text-rose-600 scale-110'
                                    : 'text-[#837560]'
                                }`}
                              />
                              <span className="text-xs font-extrabold">{likeState.count}</span>
                            </button>

                            {/* Tips & Reviews Button */}
                            <button
                              onClick={() => handleToggleComments(spot.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#FAF9F5] transition"
                            >
                              <MessageSquare className="w-4 h-4 text-[#837560]" />
                              <span>{allTips.length} Tips</span>
                            </button>

                            {/* Bookmark / Save */}
                            <button
                              onClick={() => toggleSave(spot.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                                savedPosts[spot.id] ? 'bg-amber-50 text-[#FFB703]' : 'hover:bg-[#FAF9F5]'
                              }`}
                            >
                              <Bookmark className="w-4 h-4" />
                              <span>{savedPosts[spot.id] ? 'Saved' : 'Save'}</span>
                            </button>
                          </div>

                          {/* Primary Direct Actions */}
                          <div className="flex items-center gap-2">
                            {spot.questId && (
                              <Link
                                href={`/quests/${spot.questId}`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs font-extrabold shadow-xs transition"
                              >
                                <Trophy className="w-3.5 h-3.5" />
                                <span>Play Quest</span>
                              </Link>
                            )}

                            <Link
                              href={`/navigate?name=${encodeURIComponent(spot.name)}&lat=${spot.gpsLat}&lng=${spot.gpsLng}&address=${encodeURIComponent(spot.address)}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-extrabold shadow-xs transition"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Navigate</span>
                            </Link>
                          </div>
                        </div>

                        {/* Interactive Discussion / Tips Section */}
                        {isCommentsOpen && (
                          <div className="mt-3 pt-3 border-t border-[#E3DFD5] space-y-3 animate-fadeIn">
                            <h4 className="text-xs font-extrabold text-[#582F0E]">Traveler Tips &amp; On-Site Advice</h4>
                            
                            <div className="space-y-2">
                              {allTips.map((tip, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs text-[#514532] flex items-start gap-2">
                                  <div className="w-5 h-5 rounded-full bg-[#3F6653]/15 text-[#2D6A4F] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                    ✓
                                  </div>
                                  <p>{tip}</p>
                                </div>
                              ))}
                            </div>

                            {/* Add Comment Input */}
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={commentInput[spot.id] || ''}
                                onChange={(e) => setCommentInput({ ...commentInput, [spot.id]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment(spot.id)}
                                placeholder="Add a travel tip or advice..."
                                className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF9F5] text-xs border border-[#E3DFD5] outline-none focus:border-[#2D6A4F]"
                              />
                              <button
                                onClick={() => handleAddComment(spot.id)}
                                className="p-2 rounded-xl bg-[#2D6A4F] text-white hover:bg-[#1B4332] transition"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar Widgets Column (Span 4 - Clean & Uncluttered) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Submit Spot CTA Card */}
            <div className="bg-white rounded-xl p-5 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E8E5DE]">
                <Compass className="w-4 h-4 text-[#2D6A4F]" />
                <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                  Community Tourism Feed
                </h3>
              </div>

              <p className="text-xs text-[#514532] leading-relaxed">
                Found an undocumented eco-spot, authentic Pangasinan eatery, or heritage landmark? Share it with fellow travelers.
              </p>

              <Link
                href="/spots/new"
                className="w-full py-3 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit New Destination Spot</span>
              </Link>
            </div>

            {/* Overcrowding Diversion Live Bounty Card */}
            <div className="bg-amber-50/70 rounded-xl p-5 border border-amber-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#D95D00] font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span className="uppercase tracking-wide">Live Anti-Crowd Alert</span>
              </div>

              <h4 className="text-sm font-bold text-[#582F0E]">
                Hundred Islands Peak Pressure
              </h4>

              <p className="text-xs text-[#6B4B00] leading-relaxed">
                High tourist density reported at Alaminos Lucap wharfs. Divert to tranquil nearby spots like <strong>Timmaw Cave</strong> or <strong>Tambobong Beach</strong> to unlock <strong>+1.5x mJDQ Points</strong>!
              </p>

              <button
                onClick={() => setSortFlair('quiet')}
                className="w-full py-2.5 rounded-lg bg-[#D95D00] hover:bg-[#B34D00] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
              >
                <span>Filter Tranquil Alternatives</span>
              </button>
            </div>

            {/* Quick Portal Shortcuts */}
            <div className="bg-white rounded-xl p-5 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">Quick Portals</h3>
              </div>

              <div className="space-y-2 text-xs">
                <Link
                  href="/quests"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] transition"
                >
                  <div className="flex items-center gap-2 font-bold text-[#2C221E]">
                    <Zap className="w-3.5 h-3.5 text-[#FFB703]" />
                    <span>Quests &amp; Event Campaigns</span>
                  </div>
                  <span className="text-[10px] text-[#2D6A4F] font-bold">Bounties →</span>
                </Link>

                <Link
                  href="/leaderboard"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] transition"
                >
                  <div className="flex items-center gap-2 font-bold text-[#2C221E]">
                    <Award className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>Scout Hall of Fame</span>
                  </div>
                  <span className="text-[10px] text-[#582F0E] font-bold">Ranks →</span>
                </Link>

                <Link
                  href="/shop"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] transition"
                >
                  <div className="flex items-center gap-2 font-bold text-[#2C221E]">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>MSME Partner Deals</span>
                  </div>
                  <span className="text-[10px] text-[#2D6A4F] font-bold">Shop →</span>
                </Link>

                <Link
                  href="/about"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] transition"
                >
                  <div className="flex items-center gap-2 font-bold text-[#2C221E]">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>About JuanDerQuest &amp; Team</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold">Story →</span>
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Navigation>
  );
}
