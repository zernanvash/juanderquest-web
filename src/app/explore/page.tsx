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
  ArrowBigUp,
  ArrowBigDown,
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
  Filter
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const categories = [
  { id: 'all', label: 'All Posts' },
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
  const [upvotes, setUpvotes] = useState<Record<string, { count: number; userVoted: number }>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [userComments, setUserComments] = useState<Record<string, string[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});

  const loadSpots = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = {};
      if (category !== 'all') params.categories = category;
      if (search) params.q = search;

      const res = await api.get('/spots', { params });
      const rawSpots: SpotModel[] = res.data.data.map(normalizeSpot);
      setSpots(rawSpots);

      // Initialize mock dynamic upvotes & interaction states
      const initialVotes: Record<string, { count: number; userVoted: number }> = {};
      rawSpots.forEach((s, idx) => {
        initialVotes[s.id] = {
          count: 42 + (idx * 17) % 180,
          userVoted: 0,
        };
      });
      setUpvotes(initialVotes);
    } catch {
      setError('Could not load destination community feed.');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    loadSpots();
  }, [loadSpots]);

  const handleVote = (spotId: string, direction: number) => {
    setUpvotes((prev) => {
      const current = prev[spotId] || { count: 50, userVoted: 0 };
      if (current.userVoted === direction) {
        // Toggle off
        return {
          ...prev,
          [spotId]: { count: current.count - direction, userVoted: 0 },
        };
      } else {
        return {
          ...prev,
          [spotId]: {
            count: current.count + direction - current.userVoted,
            userVoted: direction,
          },
        };
      }
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
        {/* Reddit-Style Subreddit Community Header */}
        <div className="rounded-3xl bg-white border border-[#E3DFD5] overflow-hidden shadow-xs">
          {/* Cover Header Banner */}
          <div className="h-36 sm:h-44 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#7D5800] p-6 relative flex items-end justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(#FFB703_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
            <div className="relative z-10 text-white">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB703] bg-black/30 px-2.5 py-1 rounded-full border border-white/10">
                Pangasinan Tourism Hub
              </span>
              <h1 className="text-2xl sm:text-4xl font-serif font-black text-white mt-1 drop-shadow-sm">
                r/JuanDerQuest
              </h1>
            </div>
            <Link
              href="/spots/new"
              className="relative z-10 bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-md transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Share a Hidden Gem</span>
            </Link>
          </div>

          {/* Subreddit Stats & Description Bar */}
          <div className="px-6 py-3.5 bg-white flex flex-wrap items-center justify-between gap-4 border-t border-[#E3DFD5]/60 text-xs">
            <p className="text-[#514532] font-medium max-w-xl">
              The official traveler community for discovering lesser-known spots, validating on-site visits, and sharing crowd-free Pangasinan itineraries.
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

        {/* Two-Column Reddit Forum Layout (8 Cols Feed / 4 Cols Sticky Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Feed Column (Span 8) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Create Post / Share Tip Quick Box */}
            <div className="bg-white rounded-2xl p-4 border border-[#E3DFD5] shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2D6A4F] text-white font-bold flex items-center justify-center text-sm shrink-0">
                {user ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <Link
                href="/spots/new"
                className="flex-1 bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#E3DFD5] rounded-xl px-4 py-2.5 text-xs text-[#837560] font-medium transition cursor-pointer flex items-center justify-between"
              >
                <span>Share a hidden beach, heritage tip, or local food spot...</span>
                <Camera className="w-4 h-4 text-[#2D6A4F]" />
              </Link>
            </div>

            {/* Sorting & Category Flairs Bar */}
            <div className="bg-white rounded-2xl p-3 border border-[#E3DFD5] shadow-xs space-y-3">
              {/* Flairs (Hot, New, Quests, Quiet) */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSortFlair('hot')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      sortFlair === 'hot'
                        ? 'bg-[#FFB703] text-[#582F0E] shadow-xs'
                        : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Hot</span>
                  </button>

                  <button
                    onClick={() => setSortFlair('new')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      sortFlair === 'new'
                        ? 'bg-[#2D6A4F] text-white shadow-xs'
                        : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>

                  <button
                    onClick={() => setSortFlair('quests')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
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
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                      sortFlair === 'quiet'
                        ? 'bg-[#2D6A4F] text-white shadow-xs'
                        : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <span>🌿 Quiet Gems</span>
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative min-w-[140px] sm:min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-[#837560] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search posts..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#FAF9F5] rounded-xl text-xs border border-[#E3DFD5] outline-none focus:border-[#2D6A4F]"
                  />
                </div>
              </div>

              {/* Category Sub-Flairs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-[#E3DFD5]/60">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
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
              <div className="bg-white rounded-3xl p-16 border border-[#E3DFD5] flex flex-col items-center justify-center text-[#837560]">
                <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F] mb-3" />
                <span className="text-xs font-bold text-[#582F0E]">Curating community feed...</span>
              </div>
            ) : error ? (
              <div className="bg-white rounded-3xl p-8 border border-red-200 text-center space-y-3">
                <p className="text-xs text-[#BC4749] font-bold">{error}</p>
                <button onClick={loadSpots} className="px-4 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold">
                  Retry
                </button>
              </div>
            ) : processedSpots.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-[#E3DFD5] text-center space-y-2">
                <Compass className="w-10 h-10 text-[#D5C4AC] mx-auto" />
                <h3 className="font-bold text-sm text-[#582F0E]">No posts found</h3>
                <p className="text-xs text-[#837560]">Try adjusting your search or category filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {processedSpots.map((spot) => {
                  const voteState = upvotes[spot.id] || { count: 50, userVoted: 0 };
                  const isCommentsOpen = Boolean(openComments[spot.id]);
                  const customTips = userComments[spot.id] || [];
                  const defaultTips = mockCommunityTips.default;
                  const allTips = [...defaultTips, ...customTips];

                  return (
                    <article
                      key={spot.id}
                      className="bg-white rounded-2xl border border-[#E3DFD5] hover:border-[#2D6A4F]/40 shadow-xs hover:shadow-md transition duration-200 overflow-hidden flex flex-col sm:flex-row"
                    >
                      {/* Left Upvote Bar (Reddit Style) */}
                      <div className="bg-[#FAF9F5] sm:w-14 p-2 sm:py-4 flex sm:flex-col items-center justify-between sm:justify-start gap-1 border-b sm:border-b-0 sm:border-r border-[#E3DFD5]/70 shrink-0">
                        <button
                          onClick={() => handleVote(spot.id, 1)}
                          className={`p-1.5 rounded-lg transition ${
                            voteState.userVoted === 1
                              ? 'text-[#FFB703] bg-[#FFB703]/20 font-black'
                              : 'text-[#837560] hover:text-[#FFB703] hover:bg-white'
                          }`}
                          aria-label="Upvote"
                        >
                          <ArrowBigUp className="w-6 h-6" />
                        </button>
                        <span className="text-xs font-black text-[#582F0E]">{voteState.count}</span>
                        <button
                          onClick={() => handleVote(spot.id, -1)}
                          className={`p-1.5 rounded-lg transition ${
                            voteState.userVoted === -1
                              ? 'text-[#BC4749] bg-red-50'
                              : 'text-[#837560] hover:text-[#BC4749] hover:bg-white'
                          }`}
                          aria-label="Downvote"
                        >
                          <ArrowBigDown className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Post Main Body */}
                      <div className="flex-1 p-4 sm:p-5 space-y-3">
                        {/* Meta Header */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#837560]">
                          <span className="font-extrabold text-[#2D6A4F] hover:underline cursor-pointer">
                            p/{spot.municipality.toLowerCase().replace(/\s+/g, '')}
                          </span>
                          <span>•</span>
                          <span>Posted by <strong className="text-[#582F0E]">u/{spot.sourceName.replace(/\s+/g, '')}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#7D5800]">
                            <MapPin className="w-3 h-3" />
                            {spot.municipality}
                          </span>

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
                          <h2 className="text-lg font-black font-serif text-[#582F0E] group-hover:text-[#2D6A4F] transition leading-snug">
                            {spot.name}
                          </h2>
                        </Link>

                        {/* Crowd Pressure Banner (Reddit Warning Style) */}
                        {spot.crowdStatus === 'estimated_busy' ? (
                          <div className="p-2.5 rounded-xl bg-[#FFF3E8] border border-[#FFD8B8] flex items-center justify-between text-xs text-[#9E3E00]">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-[#D95D00] shrink-0" />
                              <span className="font-bold">Peak Tourist Hours Detected</span>
                            </div>
                            <Link href={`/spots/${spot.slug}`} className="text-[11px] font-extrabold underline text-[#D95D00]">
                              View quiet alternatives →
                            </Link>
                          </div>
                        ) : spot.crowdStatus === 'quiet' ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E2F0E8] text-[#274E3C] text-[10px] font-extrabold">
                            <span>🌿 Serene &amp; Low Crowd</span>
                          </div>
                        ) : null}

                        {/* Description Text */}
                        <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                          {spot.description}
                        </p>

                        {/* Photo Image Card */}
                        {spot.imageUrl && (
                          <Link href={`/spots/${spot.slug}`} className="block rounded-2xl overflow-hidden border border-[#E3DFD5] group max-h-80 relative bg-stone-100">
                            <img
                              src={spot.imageUrl}
                              alt={spot.name}
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

                        {/* Interaction Bar */}
                        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#E3DFD5]/60 text-xs text-[#7D5800] font-bold gap-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button
                              onClick={() => handleToggleComments(spot.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#FAF9F5] transition"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span>{allTips.length} Tips &amp; Reviews</span>
                            </button>

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

                          <div className="flex items-center gap-2">
                            {spot.questId && (
                              <Link
                                href={`/quests/${spot.questId}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs font-extrabold shadow-xs transition"
                              >
                                <Trophy className="w-3.5 h-3.5" />
                                <span>Play Quest</span>
                              </Link>
                            )}

                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${spot.gpsLat},${spot.gpsLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-extrabold shadow-xs transition"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Directions</span>
                            </a>
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

          {/* Right Sidebar Widgets Column (Span 4 - Fixed & Sticky) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* About Community Panel */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3DFD5] shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E3DFD5]">
                <ShieldCheck className="w-5 h-5 text-[#2D6A4F]" />
                <h3 className="font-serif font-black text-base text-[#582F0E]">About Community</h3>
              </div>

              <p className="text-xs text-[#514532] leading-relaxed">
                JuanDerQuest is Pangasinan&apos;s decentralized eco-tourism network. Tourists verify their visits with GPS &amp; AR, earning off-chain rewards while helping distribute foot traffic to tranquil hidden gems.
              </p>

              <div className="grid grid-cols-2 gap-2 text-center py-2 bg-[#FAF9F5] rounded-2xl border border-[#E3DFD5]/60">
                <div className="p-2">
                  <span className="block font-serif font-black text-lg text-[#582F0E]">14 LGUs</span>
                  <span className="text-[10px] text-[#837560] font-bold">Partner Towns</span>
                </div>
                <div className="p-2 border-l border-[#E3DFD5]">
                  <span className="block font-serif font-black text-lg text-[#2D6A4F]">94 Quests</span>
                  <span className="text-[10px] text-[#837560] font-bold">Active Bounties</span>
                </div>
              </div>

              <Link
                href="/spots/new"
                className="w-full py-3 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit New Destination Spot</span>
              </Link>
            </div>

            {/* Overcrowding Diversion Live Bounty Card */}
            <div className="bg-gradient-to-br from-[#FFF3E8] to-[#FFF9F5] rounded-3xl p-5 border border-[#FFD8B8] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#D95D00] font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span className="uppercase tracking-wide">Live Anti-Crowd Bounty</span>
              </div>

              <h4 className="font-serif font-black text-base text-[#582F0E]">
                Hundred Islands Peak Pressure Alert
              </h4>

              <p className="text-xs text-[#6B4B00] leading-relaxed">
                High traveler density reported at Alaminos wharfs. Divert to tranquil nearby spots like <strong>Timmaw Cave</strong> or <strong>Tambobong Beach</strong> to unlock <strong>+1.5x mJDQ Points</strong>!
              </p>

              <button
                onClick={() => setSortFlair('quiet')}
                className="w-full py-2.5 rounded-xl bg-[#D95D00] hover:bg-[#B34D00] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <span>Filter Serene Alternatives</span>
              </button>
            </div>

            {/* Top Scouts Leaderboard */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3DFD5]">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FFB703]" />
                  <h3 className="font-serif font-bold text-sm text-[#582F0E]">Top JuanDerer Scouts</h3>
                </div>
                <span className="text-[10px] font-bold text-[#837560]">Weekly</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F5]">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#FFB703]">1</span>
                    <span className="font-bold text-[#582F0E]">u/PangasinanExplorer</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#2D6A4F]">3,420 PTS</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F5]">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#A7A7A7]">2</span>
                    <span className="font-bold text-[#582F0E]">u/BolinaoWave</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#2D6A4F]">2,890 PTS</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9F5]">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#CD7F32]">3</span>
                    <span className="font-bold text-[#582F0E]">u/HeritageSeeker</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#2D6A4F]">2,150 PTS</span>
                </div>
              </div>
            </div>

            {/* MSME Local Partner Deals */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3DFD5]">
                <h3 className="font-serif font-bold text-sm text-[#582F0E]">Partner Merchant Deals</h3>
                <Link href="/shop" className="text-[10px] text-[#2D6A4F] font-extrabold hover:underline">
                  View All Shop →
                </Link>
              </div>

              <div className="space-y-2">
                <Link href="/shop" className="block p-3 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] hover:border-[#FFB703] transition">
                  <span className="text-[10px] font-black uppercase text-[#2D6A4F]">Bolinao Craft Salt</span>
                  <p className="font-bold text-xs text-[#582F0E]">20% OFF Authentic Dasol Salt Pack</p>
                  <span className="text-[10px] text-[#837560]">Redeem with 150 PTS</span>
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Navigation>
  );
}
