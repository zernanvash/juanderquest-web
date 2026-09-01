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
  Vote,
  History
} from 'lucide-react';

import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel, isVideoMedia } from '@/lib/api';
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
  const [sortFlair, setSortFlair] = useState<'for_you' | 'hot' | 'new' | 'quests' | 'quiet'>('for_you');
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

  // Distinct recommendation selections
  const algorithmRecommendedSpot = spots.find((s) => s.slug !== 'hundred-islands-national-park' && s.imageUrl) || spots[1] || spots[0];
  const secondRecommendation = spots.find((s) => s.id !== algorithmRecommendedSpot?.id && s.slug !== 'hundred-islands-national-park' && s.imageUrl) || spots[2] || null;
  const thirdRecommendation = spots.find((s) => s.id !== algorithmRecommendedSpot?.id && s.id !== secondRecommendation?.id) || spots[3] || null;

  return (
    <Navigation>
      <div className="space-y-5">
        {/* Structured Multi-Column Post Stream (4 Cols Sticky Left Panel / 8 Cols Infinite Feed) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Function Buttons & Quick Portals (Span 4 on Desktop, Sticky) */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-1 order-2 lg:order-1">
            {/* User Mini Card */}
            {user && (
              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-[#E3DFD5] shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D6A4F] text-white font-black flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-[#582F0E] truncate">{user.displayName}</h4>
                  <p className="text-[11px] text-[#2D6A4F] font-bold">Pangasinan Scout</p>
                </div>
                <Link
                  href="/profile"
                  className="text-[11px] font-bold text-[#2D6A4F] hover:underline"
                >
                  Profile →
                </Link>
              </div>
            )}

            {/* Quick Portals & Function Buttons Panel */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
                  Quick Portals
                </h3>
                <span className="text-[10px] text-[#837560] font-semibold">Shortcuts</span>
              </div>

              {/* Function Buttons List */}
              <div className="space-y-1.5 text-xs">
                <Link
                  href="/quests"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-emerald-50/60 border border-[#E3DFD5] hover:border-[#2D6A4F] transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Zap className="w-3.5 h-3.5 text-[#935610]" />
                    </div>
                    <span>Quests &amp; Event Campaigns</span>
                  </div>
                  <span className="text-[10px] text-[#2D6A4F] font-bold">Bounties →</span>
                </Link>

                <Link
                  href="/map"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-emerald-50/60 border border-[#E3DFD5] hover:border-[#2D6A4F] transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    </div>
                    <span>Interactive Map &amp; Routing</span>
                  </div>
                  <span className="text-[10px] text-[#2D6A4F] font-bold">Explore →</span>
                </Link>

                <Link
                  href="/leaderboard"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-emerald-50/60 border border-[#E3DFD5] hover:border-[#2D6A4F] transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Award className="w-3.5 h-3.5 text-[#B45309]" />
                    </div>
                    <span>Scout Hall of Fame</span>
                  </div>
                  <span className="text-[10px] text-[#582F0E] font-bold">Ranks →</span>
                </Link>

                <Link
                  href="/shop"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-emerald-50/60 border border-[#E3DFD5] hover:border-[#2D6A4F] transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Tag className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    </div>
                    <span>MSME Partner Deals</span>
                  </div>
                  <span className="text-[10px] text-[#2D6A4F] font-bold">Shop →</span>
                </Link>

                <Link
                  href="/vote"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-emerald-50/60 border border-[#E3DFD5] hover:border-[#2D6A4F] transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Vote className="w-3.5 h-3.5 text-blue-700" />
                    </div>
                    <span>Community Governance</span>
                  </div>
                  <span className="text-[10px] text-blue-700 font-bold">Vote →</span>
                </Link>

                <Link
                  href="/history"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-emerald-50/60 border border-[#E3DFD5] hover:border-[#2D6A4F] transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                    <div className="w-7 h-7 rounded-lg bg-stone-200 flex items-center justify-center shrink-0">
                      <History className="w-3.5 h-3.5 text-[#582F0E]" />
                    </div>
                    <span>My Submissions &amp; Activity</span>
                  </div>
                  <span className="text-[10px] text-[#837560] font-bold">Logs →</span>
                </Link>

                <Link
                  href="/about"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-emerald-50/60 border border-[#E3DFD5] hover:border-[#2D6A4F] transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    </div>
                    <span>About JuanDerQuest</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold">Story →</span>
                </Link>
              </div>

              {/* Primary Function Action Button */}
              <div className="pt-2 border-t border-[#E8E5DE]">
                <Link
                  href="/spots/new"
                  className="w-full py-2.5 px-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-xs active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Share New Destination</span>
                </Link>
              </div>
            </div>

            {/* Category Quick Filter */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E3DFD5] shadow-xs space-y-2.5">
              <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#2D6A4F]" />
                Filter by Category
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      category === c.id
                        ? 'bg-[#2D6A4F] text-white shadow-2xs'
                        : 'bg-[#FAF9F5] text-[#582F0E] border border-[#E3DFD5] hover:bg-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Feed Column (Span 8 on Desktop) - Infinite Scroll Stream */}
          <div className="lg:col-span-8 space-y-4 min-w-0 order-1 lg:order-2">
            
            {/* Share / Post Box */}
            <div className="bg-white rounded-xl p-4 border border-[#E3DFD5] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2D6A4F] text-white font-bold flex items-center justify-center text-sm shrink-0">
                {user ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <Link
                href="/spots/new"
                className="flex-1 bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] rounded-xl px-4 py-2.5 text-xs text-[#837560] font-medium transition cursor-pointer flex items-center justify-between"
              >
                <span>Share a video clip, hidden beach, heritage spot, or local tip...</span>
                <div className="flex items-center gap-1 text-[#2D6A4F]">
                  <Film className="w-4 h-4" />
                  <Camera className="w-4 h-4" />
                </div>
              </Link>
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
                {/* Special Algorithm-Curated Post ("A place you may like") right on top of Hundred Islands */}
                {algorithmRecommendedSpot && (
                  <article className="bg-white rounded-2xl border-2 border-emerald-500/35 hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all duration-300 ease-out overflow-hidden">
                    {/* Special Algorithm Header */}
                    <div className="px-4 pt-3.5 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3 space-y-2 bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/40 border-b border-[#E3DFD5]/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1B4332] text-[#FFB703] flex items-center justify-center font-black text-xs shadow-xs border border-[#2D6A4F]/40">
                            <Compass className="w-4 h-4 text-[#FFB703]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-[#582F0E]">JuanDerQuest Algorithm</span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-[#2D6A4F] font-black text-[9px] uppercase tracking-wider">
                                <Sparkles className="w-2.5 h-2.5 text-[#2D6A4F]" />
                                Special Post
                              </span>
                            </div>
                            <p className="text-[10px] text-[#837560] leading-none mt-0.5">
                              Curated for you · Based on traveler preferences &amp; activity
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#2D6A4F] bg-white px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                          A place you may like
                        </span>
                      </div>

                      {/* Intro Caption */}
                      <p className="text-xs text-[#514532] pt-0.5">
                        ✨ A high-quality Pangasinan destination chosen by the recommendation engine:
                      </p>

                      {/* Spot Title & Municipality */}
                      <div className="flex items-baseline justify-between pt-0.5">
                        <Link href={`/spots/${algorithmRecommendedSpot.slug}`} className="block group">
                          <h2 className="text-base sm:text-lg font-bold font-serif text-[#582F0E] group-hover:text-[#2D6A4F] transition leading-snug">
                            {algorithmRecommendedSpot.name}
                          </h2>
                        </Link>
                        <span className="font-bold text-[#2D6A4F] text-[11px] flex items-center gap-1 shrink-0">
                          <MapPin className="w-3 h-3" />
                          {algorithmRecommendedSpot.municipality}
                        </span>
                      </div>
                    </div>

                    {/* Photo */}
                    {algorithmRecommendedSpot.imageUrl && (
                      <Link
                        href={`/spots/${algorithmRecommendedSpot.slug}`}
                        className="block w-full border-y border-[#E3DFD5] group relative bg-stone-900/5 aspect-[16/10] sm:aspect-[16/9] max-h-[480px] overflow-hidden"
                      >
                        <img
                          src={algorithmRecommendedSpot.imageUrl}
                          alt={algorithmRecommendedSpot.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        {algorithmRecommendedSpot.questId && (
                          <div className="absolute top-3 right-3 bg-[#FFB703] text-[#582F0E] px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md">
                            <Trophy className="w-3 h-3" />
                            <span>Quest Available (+250 mJDQ)</span>
                          </div>
                        )}
                      </Link>
                    )}

                    {/* Post Content & Description */}
                    <div className="px-4 py-3 sm:px-5 space-y-2">
                      <p className="text-xs text-[#514532] leading-relaxed">
                        {algorithmRecommendedSpot.description}
                      </p>

                      {/* Quick Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E8E5DE]">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleLike(algorithmRecommendedSpot.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition duration-150 transform active:scale-90 ${
                              likes[algorithmRecommendedSpot.id]?.isLiked
                                ? 'bg-rose-50 text-rose-600'
                                : 'text-[#837560] hover:bg-stone-100'
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                likes[algorithmRecommendedSpot.id]?.isLiked
                                  ? 'fill-rose-600 text-rose-600'
                                  : 'text-[#837560]'
                              }`}
                            />
                            <span className="text-xs font-bold">
                              {likes[algorithmRecommendedSpot.id]?.count || 88}
                            </span>
                          </button>

                          <button
                            onClick={() => handleToggleComments(algorithmRecommendedSpot.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[#837560] hover:bg-stone-100 transition duration-150"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs font-bold">Travel Tips</span>
                          </button>
                        </div>

                        <Link
                          href={`/spots/${algorithmRecommendedSpot.slug}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs active:scale-95"
                        >
                          <span>Explore Destination</span>
                          <span>→</span>
                        </Link>
                      </div>

                      {/* Community Tips Drawer if open */}
                      {openComments[algorithmRecommendedSpot.id] && (
                        <div className="pt-3 border-t border-[#E8E5DE] space-y-2 text-xs">
                          <div className="space-y-1.5">
                            {mockCommunityTips.default.map((tip, tIdx) => (
                              <div key={tIdx} className="bg-[#FAF9F5] p-2.5 rounded-lg border border-[#E3DFD5] text-[#582F0E]">
                                <p>{tip}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                )}

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


                      {/* Compact Post Header & Caption Area */}
                      <div className="px-4 pt-3.5 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3 space-y-2">
                        {/* Meta Header */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#837560] leading-none">
                          <span className="font-bold text-[#2D6A4F] flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {spot.municipality}
                          </span>
                          <span>•</span>
                          <span>Shared by <strong className="text-[#582F0E]">{spot.sourceName}</strong></span>

                          {/* Provenance Badge */}
                          {spot.trustLevel === 'lgu_verified' && (
                            <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px] border border-blue-200">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              <span>LGU Verified</span>
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <Link href={`/spots/${spot.slug}`} className="block group">
                          <h2 className="text-base sm:text-lg font-bold font-serif text-[#582F0E] group-hover:text-[#2D6A4F] transition leading-snug">
                            {spot.name}
                          </h2>
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

                      {/* Full-Bleed Edge-to-Edge Photo or Video Clip */}
                      {spot.imageUrl && (
                        isVideoMedia(spot.imageUrl) ? (
                          <div className="relative w-full border-y border-[#E3DFD5] bg-black aspect-[16/10] sm:aspect-[16/9] max-h-[480px] overflow-hidden group">
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
                            className="block w-full border-y border-[#E3DFD5] group relative bg-stone-900/5 aspect-[16/10] sm:aspect-[16/9] max-h-[480px] overflow-hidden"
                          >
                            <img
                              src={spot.imageUrl}
                              alt={spot.name}
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                              className="w-full h-full object-cover"
                            />

                            {spot.questId && (
                              <div className="absolute top-3 right-3 bg-[#FFB703] text-[#582F0E] px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md">
                                <Trophy className="w-3 h-3" />
                                <span>Quest Available (+250 mJDQ)</span>
                              </div>
                            )}
                          </Link>
                        )
                      )}


                      {/* Compact Social Interaction Action Bar & Comments Area */}
                      <div className="px-4 py-2.5 sm:px-5 sm:py-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between text-xs text-[#7D5800] font-bold gap-2">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {/* Instagram-style Heart Button */}
                            <button
                              onClick={() => handleToggleLike(spot.id)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition duration-150 transform active:scale-90 ${
                                likeState.isLiked
                                  ? 'bg-rose-50 text-rose-600 font-bold'
                                  : 'hover:bg-[#FAF9F5] text-[#582F0E]'
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
                              <span className="text-xs font-extrabold">{likeState.count}</span>
                            </button>

                            {/* Tips & Reviews Button */}
                            <button
                              onClick={() => handleToggleComments(spot.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#FAF9F5] transition text-[#582F0E]"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#837560]" />
                              <span>{allTips.length} Tips</span>
                            </button>

                            {/* Bookmark / Save */}
                            <button
                              onClick={() => toggleSave(spot.id)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                                savedPosts[spot.id] ? 'bg-amber-50 text-[#FFB703]' : 'hover:bg-[#FAF9F5] text-[#582F0E]'
                              }`}
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                              <span>{savedPosts[spot.id] ? 'Saved' : 'Save'}</span>
                            </button>
                          </div>

                          {/* Primary Direct Actions */}
                          <div className="flex items-center gap-1.5">
                            {spot.questId && (
                              <Link
                                href={`/quests/${spot.questId}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-[11px] font-extrabold shadow-2xs transition"
                              >
                                <Trophy className="w-3 h-3" />
                                <span>Play Quest</span>
                              </Link>
                            )}

                            <Link
                              href={`/navigate?name=${encodeURIComponent(spot.name)}&lat=${spot.gpsLat}&lng=${spot.gpsLng}&address=${encodeURIComponent(spot.address)}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-[11px] font-extrabold shadow-2xs transition"
                            >
                              <MapPin className="w-3 h-3 text-[#FFB703]" />
                              <span>Navigate</span>
                            </Link>
                          </div>
                        </div>

                        {/* Interactive Discussion / Tips Section */}
                        {isCommentsOpen && (
                          <div className="mt-2 pt-2 border-t border-[#E3DFD5] space-y-2 animate-fadeIn">
                            <h4 className="text-[11px] font-bold text-[#582F0E]">Traveler Tips &amp; On-Site Advice</h4>
                            
                            <div className="space-y-1.5">
                              {allTips.map((tip, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] text-[11px] text-[#514532] flex items-start gap-1.5">
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
                                className="p-1.5 rounded-lg bg-[#2D6A4F] text-white hover:bg-[#1B4332] transition"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>

                    {/* Interleaved Native Suggested Destination Card (Like Facebook feed ad after post #3) */}
                    {index === 2 && secondRecommendation && (
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
                    {index === 5 && thirdRecommendation && (
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

        </div>


      </div>
    </Navigation>
  );
}
