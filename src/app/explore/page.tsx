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
  Zap
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel, isVideoMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth';

import { fetchWithCache } from '@/lib/cache';
import { SpotCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSavedLibrary } from '@/lib/saved-library';
import { publicTravelerProfiles, communityChoicePreview } from '@/lib/community';

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
  const { library: savedLibrary, toggle: toggleSaved, isSaved } = useSavedLibrary();

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
    toggleSaved('spots', spotId);
  };

  const savedSpotHighlights = spots.filter((s) => savedLibrary.spots.includes(s.id)).slice(0, 3);

  // Filter & Sort Logic
  const processedSpots = spots.filter((s) => {
    if (sortFlair === 'quests') return Boolean(s.questId);
    if (sortFlair === 'quiet') return s.crowdStatus === 'quiet' || s.crowdStatus === 'moderate';
    return true;
  });

  // Distinct recommendation selections
  const topRecommendation = spots[0] || null;
  const secondRecommendation = spots.find((s) => s.id !== topRecommendation?.id && s.imageUrl) || spots[1] || null;
  const thirdRecommendation = spots.find((s) => s.id !== topRecommendation?.id && s.id !== secondRecommendation?.id) || spots[2] || null;

  return (
    <Navigation>
      <div className="space-y-5">
        {/* Structured 3-Column Post Stream (Left: Portals & Scouts, Center: Feed, Right: Personalized & Leaderboard) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Actions & Discovery Column */}
          <aside className="lg:col-span-3 lg:col-start-1 lg:row-start-1 lg:sticky lg:top-20 lg:self-start space-y-5">
            
            {/* Quick Portal Shortcuts */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">Quick Portals</h3>
                <span className="text-[10px] font-bold text-[#837560]">Hub</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <Link
                  href="/quests"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/80 text-[#B45309]">
                      <Zap className="w-3.5 h-3.5 fill-[#FFB703] text-[#B45309]" />
                    </div>
                    <span>Quests &amp; Trails</span>
                  </div>
                  <span className="text-[10px] text-[#2D6A4F] font-bold group-hover:translate-x-0.5 transition-transform">Bounties →</span>
                </Link>

                <Link
                  href="/saved"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/90 hover:border-[#FFB703] hover:bg-amber-50 transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200/70 text-[#7D5800]">
                      <Bookmark className="w-3.5 h-3.5 fill-current text-[#B45309]" />
                    </div>
                    <span>Saved Library</span>
                  </div>
                  <span className="rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-black text-[#582F0E]">
                    {savedLibrary.spots.length + savedLibrary.quests.length}
                  </span>
                </Link>

                <Link
                  href="/community-choice/leaderboard"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/70 text-[#7D5800]">
                      <Trophy className="w-3.5 h-3.5 text-[#B45309]" />
                    </div>
                    <span>Community Choice</span>
                  </div>
                  <span className="text-[10px] text-[#7D5800] font-bold group-hover:translate-x-0.5 transition-transform">Awards →</span>
                </Link>

                <Link
                  href="/leaderboard"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-[#582F0E]">
                      <Award className="w-3.5 h-3.5 text-[#B45309]" />
                    </div>
                    <span>Scout Hall of Fame</span>
                  </div>
                  <span className="text-[10px] text-[#582F0E] font-bold group-hover:translate-x-0.5 transition-transform">Ranks →</span>
                </Link>

                <Link
                  href="/shop"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[#2D6A4F]">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <span>MSME Partner Deals</span>
                  </div>
                  <span className="text-[10px] text-[#2D6A4F] font-bold group-hover:translate-x-0.5 transition-transform">Shop →</span>
                </Link>

                <Link
                  href="/about"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-white transition group"
                >
                  <div className="flex items-center gap-2.5 font-bold text-[#2C221E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span>About JuanDerQuest</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold group-hover:translate-x-0.5 transition-transform">Story →</span>
                </Link>
              </div>
            </div>

            {/* Saved Places Continuation Block */}
            {savedSpotHighlights.length > 0 && (
              <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#B45309]">
                      Itinerary Planning
                    </span>
                    <h4 className="text-xs font-black text-[#582F0E]">Saved Destinations</h4>
                  </div>
                  <Link href="/saved" className="text-[10px] font-bold text-[#2D6A4F] hover:underline">
                    Library ({savedLibrary.spots.length}) →
                  </Link>
                </div>

                <div className="space-y-1.5 pt-1">
                  {savedSpotHighlights.map((spot) => (
                    <Link
                      key={spot.id}
                      href={`/spots/${spot.slug}`}
                      className="flex items-center gap-2.5 rounded-xl border border-amber-200/70 bg-white/90 p-2 text-xs transition hover:border-[#FFB703] hover:shadow-2xs group"
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

            {/* Community Scouts Discovery */}
            <div className="bg-white rounded-2xl p-5 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
                <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">Community Scouts</h3>
                <span className="text-[10px] font-bold text-[#837560]">Public Passports</span>
              </div>

              <div className="space-y-1.5">
                {publicTravelerProfiles.slice(0, 3).map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/users/${profile.id}`}
                    className="flex items-center justify-between gap-2.5 rounded-xl p-2.5 hover:bg-[#FAF9F5] border border-transparent hover:border-[#E3DFD5] transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-[11px] font-black text-white shadow-2xs group-hover:ring-2 group-hover:ring-[#FFB703]/50 transition">
                        {profile.initials}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-xs font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                            {profile.displayName}
                          </span>
                          <CheckCircle2 className="h-3 w-3 text-[#2D6A4F] shrink-0" />
                        </div>
                        <span className="block truncate text-[10px] text-[#837560]">
                          {profile.title} · Lv. {profile.scoutLevel}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#2D6A4F] group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Feed Column (Span 6) - Facebook Style Scrolling */}
          <div className="lg:col-span-6 lg:col-start-4 space-y-4 min-w-0">
            
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
                        {index === 0 && (
                          <div className="flex flex-wrap items-center gap-2 border-b border-emerald-100 pb-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#2D6A4F]">
                              <Sparkles className="h-3 w-3" />
                              A place you may like
                            </span>
                            <span className="text-[10px] font-medium text-[#837560]">Organic · Selected for your interests</span>
                          </div>
                        )}
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
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer ${
                                isSaved('spots', spot.id)
                                  ? 'bg-amber-100/80 text-[#7D5800] font-bold border border-amber-300/80 shadow-2xs'
                                  : 'hover:bg-[#FAF9F5] text-[#582F0E]'
                              }`}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isSaved('spots', spot.id) ? 'fill-current text-[#B45309]' : 'text-[#837560]'}`} />
                              <span>{isSaved('spots', spot.id) ? 'Saved' : 'Save'}</span>
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

        {/* Right Personalized Discovery Column (Span 3) */}
        <aside className="lg:col-span-3 lg:col-start-10 lg:row-start-1 lg:sticky lg:top-20 lg:self-start space-y-5">
          {topRecommendation && (
            <article className="overflow-hidden rounded-2xl border border-emerald-200/90 bg-white shadow-xs hover:shadow-md transition-all duration-300">
              {topRecommendation.imageUrl && (
                <Link href={`/spots/${topRecommendation.slug}`} className="block aspect-[16/10] overflow-hidden bg-stone-100 group">
                  <img
                    src={topRecommendation.imageUrl}
                    alt={`${topRecommendation.name} recommended destination`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
              )}
              <div className="space-y-2.5 p-4">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#2D6A4F]">
                  <Sparkles className="h-3 w-3" />
                  A place you may like
                </span>
                <div>
                  <h2 className="font-serif text-base font-black leading-snug text-[#582F0E]">
                    {topRecommendation.name}
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-[#2D6A4F]">
                    <MapPin className="h-3 w-3" />
                    {topRecommendation.municipality} · Pangasinan
                  </p>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-[#514532]">
                  {topRecommendation.description}
                </p>
                <Link
                  href={`/spots/${topRecommendation.slug}`}
                  className="flex w-full items-center justify-center rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] px-3 py-2 text-xs font-bold text-white transition shadow-xs active:scale-95"
                >
                  Explore Destination
                </Link>
              </div>
            </article>
          )}

          {/* Community Choice Standings Widget */}
          <section className="rounded-2xl border border-[#E3DFD5] bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DE]">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#B45309]">
                  Community Choice
                </span>
                <h3 className="text-xs font-black text-[#582F0E]">Monthly Standings</h3>
              </div>
              <Trophy className="h-4 w-4 text-[#FFB703] fill-[#FFB703]" />
            </div>

            <div className="space-y-2 pt-0.5">
              {communityChoicePreview.entries.slice(0, 3).map((entry) => {
                const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉';
                return (
                  <Link
                    key={entry.slug}
                    href={`/spots/${entry.slug}`}
                    className="block rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]/80 p-2.5 transition hover:bg-white hover:border-[#2D6A4F]/40 group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm">{medal}</span>
                        <span className="truncate text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                          {entry.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] font-black text-[#2D6A4F]">{entry.share}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-[#2D6A4F]"
                        style={{ width: `${entry.share}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>

            <Link
              href="/community-choice/leaderboard"
              className="mt-2 flex w-full items-center justify-center rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] hover:bg-white px-3 py-2 text-[10px] font-bold text-[#2D6A4F] transition"
            >
              Full Leaderboard &amp; Ballots →
            </Link>
            <p className="text-center text-[9px] text-[#837560] leading-tight">
              Equal-weight ballots · No pay-to-win
            </p>
          </section>
        </aside>

        </div>

      </div>
    </Navigation>
  );
}

