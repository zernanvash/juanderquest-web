'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
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
  CheckCircle2
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel } from '@/lib/api';

const defaultMockTips = [
  {
    author: 'HeritageGuide_Carl',
    time: '3 hours ago',
    text: 'If visiting in the afternoon, bring an umbrella as there is limited shade along the outer trail. The view is completely worth it though!',
    upvotes: 24,
  },
  {
    author: 'PangasinanLocal',
    time: '1 day ago',
    text: 'Do not miss the fresh tupig vendors near the town hall junction before heading up. Freshly grilled and very warm.',
    upvotes: 18,
  },
];

export default function SpotDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [spot, setSpot] = useState<SpotModel | null>(null);
  const [alternatives, setAlternatives] = useState<SpotModel[]>([]);
  const [error, setError] = useState('');
  const [likeCount, setLikeCount] = useState(142);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [comments, setComments] = useState(defaultMockTips);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/spots/${slug}`),
      api.get(`/spots/${slug}/alternatives`),
    ])
      .then(([detail, alts]) => {
        const current = normalizeSpot(detail.data.data);
        setSpot(current);
        setAlternatives(alts.data.data.map(normalizeSpot));
        api.post(`/spots/${current.id}/interactions`, { type: 'view' }).catch(() => {});
      })
      .catch(() => setError('Destination spot not found.'));
  }, [slug]);

  const handleToggleLike = () => {
    if (isLiked) {
      setLikeCount((prev) => prev - 1);
      setIsLiked(false);
    } else {
      setLikeCount((prev) => prev + 1);
      setIsLiked(true);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments((prev) => [
      {
        author: 'You',
        time: 'Just now',
        text: newComment.trim(),
        upvotes: 1,
      },
      ...prev,
    ]);
    setNewComment('');
  };

  if (error) {
    return (
      <Navigation>
        <div className="p-12 text-center bg-white rounded-3xl border border-red-200">
          <p className="text-sm font-bold text-[#BC4749]">{error}</p>
          <Link href="/explore" className="mt-3 inline-block font-extrabold text-xs text-[#2D6A4F]">
            ← Return to Community Feed
          </Link>
        </div>
      </Navigation>
    );
  }

  if (!spot) {
    return (
      <Navigation>
        <div className="p-20 text-center text-[#837560]">
          <span className="text-xs font-bold text-[#582F0E]">Loading destination thread...</span>
        </div>
      </Navigation>
    );
  }

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${spot.gpsLat},${spot.gpsLng}`;
  const trackDirections = () => api.post(`/spots/${spot.id}/interactions`, { type: 'directions' }).catch(() => {});

  return (
    <Navigation>
      <article className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link href="/explore" className="inline-flex items-center gap-2 text-xs font-extrabold text-[#2D6A4F] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Community Feed</span>
        </Link>

        {/* Main Post Card */}
        <div className="bg-white rounded-3xl border border-[#E3DFD5] shadow-xs overflow-hidden">
          {/* Post Header */}
          <div className="p-6 pb-4 flex items-start justify-between gap-4 border-b border-[#E3DFD5]/60">
            <div className="flex items-center gap-3">
              {/* Instagram-style Heart Button */}
              <button
                onClick={handleToggleLike}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border transition duration-150 transform active:scale-90 ${
                  isLiked
                    ? 'bg-rose-50 border-rose-200 text-rose-600 font-black'
                    : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#582F0E] hover:border-rose-300'
                }`}
                aria-label={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart
                  className={`w-4 h-4 transition ${
                    isLiked
                      ? 'fill-rose-600 text-rose-600 scale-110'
                      : 'text-[#837560]'
                  }`}
                />
                <span className="text-xs font-black">{likeCount}</span>
              </button>

              <div>
                <div className="flex items-center gap-2 text-xs text-[#837560]">
                  <span className="font-extrabold text-[#2D6A4F] flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {spot.municipality}
                  </span>
                  <span>•</span>
                  <span>Shared by <strong className="text-[#582F0E]">{spot.sourceName}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase font-black bg-emerald-50 text-[#2D6A4F] px-2 py-0.5 rounded">
                    {spot.subcategory.replaceAll('_', ' ')}
                  </span>
                  {spot.trustLevel === 'lgu_verified' && (
                    <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>LGU Verified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-2 rounded-xl border transition ${isSaved ? 'bg-amber-50 border-amber-200 text-[#FFB703]' : 'border-[#E3DFD5] text-[#837560] hover:bg-[#FAF9F5]'}`}
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

          {/* Photo Gallery Banner */}
          <div className="h-72 sm:h-96 w-full bg-stone-100 relative overflow-hidden">
            {spot.imageUrl ? (
              <img src={spot.imageUrl} alt={spot.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#837560]">
                <Camera className="w-12 h-12 mb-2 text-[#D5C4AC]" />
                <span className="text-xs">Community Photo Upload in Progress</span>
              </div>
            )}

            {spot.questId && (
              <div className="absolute top-4 right-4 bg-[#FFB703] text-[#582F0E] px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg">
                <Trophy className="w-4 h-4" />
                <span>Play Quest (+250 mJDQ)</span>
              </div>
            )}
          </div>

          {/* Post Content */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#582F0E]">{spot.name}</h1>
              <p className="text-xs sm:text-sm text-[#837560] mt-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#2D6A4F]" />
                <span>{spot.address}</span>
              </p>
            </div>

            {/* Overcrowding Alert */}
            {spot.crowdStatus === 'estimated_busy' && (
              <div className="rounded-2xl bg-[#FFF3E8] border border-[#FFD8B8] p-4 text-xs text-[#9E3E00] space-y-1">
                <p className="font-extrabold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#D95D00]" />
                  <span>High Tourist Activity Reported</span>
                </p>
                <p className="text-[#6B4B00]">
                  Based on recent JuanderQuest check-in density. If you want a peaceful time, consider exploring one of the nearby serene alternatives below for bonus rewards!
                </p>
              </div>
            )}

            <p className="text-sm leading-relaxed text-[#514532] whitespace-pre-line">{spot.description}</p>

            {/* Destination Practical Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E3DFD5]/60">
                <div className="flex items-center gap-1.5 text-[#2D6A4F] font-bold mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Visiting Hours</span>
                </div>
                <p className="text-[#582F0E] font-medium">{Object.values(spot.hours)[0] || 'Open Daily'}</p>
              </div>

              <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E3DFD5]/60">
                <div className="flex items-center gap-1.5 text-[#2D6A4F] font-bold mb-1">
                  <Car className="w-4 h-4" />
                  <span>Parking &amp; Access</span>
                </div>
                <p className="text-[#582F0E] font-medium">
                  {spot.amenities.includes('parking') ? 'On-site parking' : 'Roadside / local parking'}
                </p>
              </div>

              <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E3DFD5]/60">
                <div className="flex items-center gap-1.5 text-[#2D6A4F] font-bold mb-1">
                  <Wifi className="w-4 h-4" />
                  <span>Amenities</span>
                </div>
                <p className="text-[#582F0E] font-medium">{spot.amenities.join(', ') || 'Scenic view, rest areas'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                onClick={trackDirections}
                href={directions}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-2xl py-3.5 px-5 text-xs font-black flex items-center justify-center gap-2 shadow-xs transition"
              >
                <MapPin className="w-4 h-4" />
                <span>Get Directions (Google Maps)</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
              </a>

              {spot.questId && (
                <Link
                  href={`/quests/${spot.questId}`}
                  className="flex-1 bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] rounded-2xl py-3.5 px-5 text-xs font-black flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Play Quest at this Location (+250 mJDQ)</span>
                </Link>
              )}
            </div>
          </div>

          {/* Traveler Discussion & Reviews Section (Forum Style) */}
          <div className="bg-[#FAF9F5] p-6 sm:p-8 border-t border-[#E3DFD5] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#2D6A4F]" />
                <h3 className="font-serif font-black text-base text-[#582F0E]">
                  Traveler Tips &amp; On-Site Discussion ({comments.length})
                </h3>
              </div>
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share a tip or advice for future visitors..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-white text-xs border border-[#E3DFD5] outline-none focus:border-[#2D6A4F]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#1B4332] transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Tip</span>
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-3 pt-2">
              {comments.map((c, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white border border-[#E3DFD5]/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#837560]">
                    <span className="font-extrabold text-[#582F0E]">{c.author}</span>
                    <span>{c.time}</span>
                  </div>
                  <p className="text-xs text-[#514532] leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Similar Places Nearby (Spread the Adventure) */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-[#7D5800]">Spread the Adventure</p>
              <h2 className="text-xl font-black font-serif text-[#582F0E]">Nearby Tranquil Gems</h2>
            </div>
            <Link href="/explore" className="text-xs text-[#2D6A4F] font-extrabold hover:underline">
              View All Feed →
            </Link>
          </div>

          {alternatives.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {alternatives.map((a) => (
                <Link
                  href={`/spots/${a.slug}`}
                  key={a.id}
                  className="bg-white border border-[#E3DFD5] rounded-2xl p-4 hover:border-[#2D6A4F] shadow-xs hover:shadow-md transition group"
                >
                  <h4 className="font-bold text-sm text-[#582F0E] group-hover:text-[#2D6A4F] transition">{a.name}</h4>
                  <p className="text-[11px] text-[#837560] mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2D6A4F]" />
                    <span>{a.municipality} · {a.distanceKm?.toFixed(1)} km</span>
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {a.recommendationReasons.slice(0, 2).map((r) => (
                      <span key={r} className="text-[9px] font-extrabold rounded bg-emerald-50 text-emerald-800 px-2 py-0.5">
                        {r}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center text-xs text-[#837560] border border-[#E3DFD5]">
              No similar spots listed within 25 km yet.
            </div>
          )}
        </section>
      </article>
    </Navigation>
  );
}
