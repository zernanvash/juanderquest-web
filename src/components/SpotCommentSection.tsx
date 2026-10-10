'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Image as ImageIcon, 
  Smile, 
  Send, 
  X, 
  Loader2, 
  Check, 
  MessageSquare,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { PixelHeart } from '@/components/PixelIcons';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { triggerCelebration } from './CelebrationEffects';
import { UserBadgeChip, UserBadgesRow } from '@/components/Badges';
import { getActiveNametagBadges, SAMPLE_USER_BADGES } from '@/lib/badges';

export interface LocationPin {
  name: string;
  lat?: number;
  lng?: number;
}

export interface SpotComment {
  id: string;
  spot_id: string;
  user_id: string;
  author_name: string;
  author_badge?: string;
  author_avatar?: string;
  content: string;
  image_url?: string;
  location_pin?: LocationPin;
  helpful_count: number;
  helpful_user_ids: string[];
  created_at: string;
  is_verified_visit?: boolean;
}

interface SpotCommentSectionProps {
  spotId: string;
  spotName: string;
}

// Popular emojis for travelers & reactions
const QUICK_EMOJIS = [
  '❤️', '🔥', '😍', '👍', '🙌', '🎉', 
  '🌊', '🏖️', '🌴', '☀️', '🎒', '🥟', 
  '📸', '🧭', '🥥', '⛵', '⛰️', '✨', 
  '🥭', '🚲', '🗺️', '👏', '🤤', '🤩'
];

// Quick Pangasinan venue suggestions for location pin
const SUGGESTED_PINS = [
  'Hundred Islands National Park',
  'Patar White Beach, Bolinao',
  'Bolinao Falls 1',
  'Cape Bolinao Lighthouse',
  'Minor Basilica of Manaoag',
  'Lingayen Provincial Capitol Promenade',
  'Enchanted Cave, Bolinao',
  'Tondol White Sand Beach, Anda',
  'Colibra Island, Dasol',
  'Cabongaoan Death Pool, Burgos',
];

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

function getLocalComments(spotId: string): SpotComment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`jdq_comments_${spotId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalComments(spotId: string, items: SpotComment[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`jdq_comments_${spotId}`, JSON.stringify(items));
  } catch {}
}

export function SpotCommentSection({ spotId, spotName }: SpotCommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<SpotComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draft state
  const [content, setContent] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedPin, setAttachedPin] = useState<LocationPin | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Popover toggles
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPinPicker, setShowPinPicker] = useState(false);
  const [customPinInput, setCustomPinInput] = useState('');
  
  // Image zoom modal
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load comments on mount
  useEffect(() => {
    let mounted = true;
    const cached = getLocalComments(spotId);
    if (cached.length > 0) {
      setComments(cached);
      setLoading(false);
    }

    const fetchComments = async () => {
      try {
        const res = await api.get<{ success: boolean; data: SpotComment[] }>(`/spots/${spotId}/comments`);
        if (mounted && res?.data?.data) {
          const serverList = res.data.data;
          const serverIds = new Set(serverList.map((c) => c.id));
          const localOnly = cached.filter((c) => !serverIds.has(c.id));
          const merged = [...localOnly, ...serverList];
          setComments(merged);
          saveLocalComments(spotId, merged);
        }
      } catch (err: unknown) {
        if (mounted && cached.length === 0) {
          // Fallback demo comments if empty
          const fallback: SpotComment[] = [
            {
              id: 'local-demo-1',
              spot_id: spotId,
              user_id: 'u-demo-1',
              author_name: 'Pangasinan Explorer',
              author_badge: 'Explorer',
              content: `Great spot to visit! 🌊 Highly recommend visiting during early morning or sunset hours. ✨`,
              helpful_count: 5,
              helpful_user_ids: [],
              created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
            }
          ];
          setComments(fallback);
          saveLocalComments(spotId, fallback);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchComments();
    return () => {
      mounted = false;
    };
  }, [spotId]);

  // Insert emoji into textarea
  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Handle image upload from file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Photo must be smaller than 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Attach a location pin
  const handleSelectPin = (pinName: string) => {
    setAttachedPin({ name: pinName });
    setShowPinPicker(false);
    setCustomPinInput('');
  };

  // Submit new comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text && !attachedImage) return;

    setSubmitting(true);
    try {
      const payload = {
        content: text || (attachedImage ? 'Shared a photo' : 'Pinned a location'),
        image_url: attachedImage || undefined,
        location_pin: attachedPin || undefined,
        author_name: user?.displayName || 'Traveler',
        author_avatar: user?.avatarUrl,
      };

      const res = await api.post<{ success: boolean; data: SpotComment }>(
        `/spots/${spotId}/comments`,
        payload
      );

      if (res?.data?.data) {
        const newComment = res.data.data;
        setComments((prev) => {
          const next = [newComment, ...prev.filter((c) => c.id !== newComment.id)];
          saveLocalComments(spotId, next);
          return next;
        });
        setContent('');
        setAttachedImage(null);
        setAttachedPin(null);
        setShowEmojiPicker(false);
        setShowPinPicker(false);
        triggerCelebration({ type: 'poppers', particleCount: 30 });
      }
    } catch (err: unknown) {
      // Local optimistic fallback
      const optimisticComment: SpotComment = {
        id: `opt-${Date.now()}`,
        spot_id: spotId,
        user_id: user?.id || 'guest',
        author_name: user?.displayName || 'Traveler',
        author_badge: 'Explorer',
        author_avatar: user?.avatarUrl,
        content: text || 'Shared a photo',
        image_url: attachedImage || undefined,
        location_pin: attachedPin || undefined,
        helpful_count: 0,
        helpful_user_ids: [],
        created_at: new Date().toISOString(),
      };

      setComments((prev) => {
        const next = [optimisticComment, ...prev];
        saveLocalComments(spotId, next);
        return next;
      });
      setContent('');
      setAttachedImage(null);
      setAttachedPin(null);
      setShowEmojiPicker(false);
      setShowPinPicker(false);
      triggerCelebration({ type: 'poppers', particleCount: 25 });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle comment like/heart
  const handleToggleLike = async (commentId: string) => {
    const currentUserId = user?.id || 'guest-actor';
    setComments((prev) => {
      const next = prev.map((c) => {
        if (c.id !== commentId) return c;
        const isLiked = c.helpful_user_ids.includes(currentUserId);
        return {
          ...c,
          helpful_count: isLiked ? Math.max(0, c.helpful_count - 1) : c.helpful_count + 1,
          helpful_user_ids: isLiked
            ? c.helpful_user_ids.filter((id) => id !== currentUserId)
            : [...c.helpful_user_ids, currentUserId],
        };
      });
      saveLocalComments(spotId, next);
      return next;
    });

    try {
      await api.post(`/spots/${spotId}/comments/${commentId}/helpful`, {});
    } catch {
      // Silently keep optimistic update
    }
  };

  const currentUserInitials = (user?.displayName || 'TR')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="space-y-4">
      {/* Header with Comment Counter */}
      <div className="flex items-center justify-between pb-1 border-b border-[#E8E5DE]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#2D6A4F]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[#582F0E]">
            Comments &amp; Travel Chat
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-[#E2F0E8] text-[#2D6A4F] text-[10px] font-black">
            {comments.length}
          </span>
        </div>
        <span className="text-[10px] text-[#837560]">Public discussion</span>
      </div>

      {/* Modern Comment Composer */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E3DFD5] p-3 space-y-2.5 shadow-2xs focus-within:border-[#2D6A4F] transition-all">
        {/* User Identity Preview & Input Area */}
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-[10px] font-black text-white shadow-2xs overflow-hidden mt-0.5">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{currentUserInitials || 'ME'}</span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Share thoughts, tips, or experiences about ${spotName}...`}
              rows={2}
              className="w-full resize-none bg-transparent text-xs text-[#2C221E] placeholder:text-[#837560] outline-none leading-relaxed"
            />

            {/* Attached Items Preview Strip */}
            {(attachedPin || attachedImage) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#F2F0EB]">
                {/* Attached Location Pin Pill */}
                {attachedPin && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#2D6A4F] text-[11px] font-bold">
                    <MapPin className="w-3 h-3 text-[#2D6A4F] shrink-0" />
                    <span className="truncate max-w-[200px]">{attachedPin.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachedPin(null)}
                      className="p-0.5 rounded-full hover:bg-emerald-200 transition text-[#2D6A4F] ml-0.5"
                      title="Remove location pin"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Attached Image Thumbnail */}
                {attachedImage && (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-[#E3DFD5] shadow-xs group">
                    <img
                      src={attachedImage}
                      alt="Attachment preview"
                      className="h-14 w-20 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black transition shadow-xs"
                      title="Remove attached photo"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar & Action Row */}
        <div className="flex items-center justify-between pt-1 border-t border-[#F0ECE1]">
          {/* Quick Attachment Buttons */}
          <div className="flex items-center gap-1">
            {/* 📷 Photo Attachment Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-xl text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                attachedImage 
                  ? 'bg-emerald-50 text-[#2D6A4F] font-bold' 
                  : 'text-[#837560] hover:text-[#2D6A4F] hover:bg-[#FAF9F5]'
              }`}
              title="Attach a photo"
              aria-label="Attach a photo"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Photo</span>
            </button>

            {/* 📍 Location Pin Attachment Button */}
            <button
              type="button"
              onClick={() => setShowPinPicker(!showPinPicker)}
              className={`p-2 rounded-xl text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                attachedPin 
                  ? 'bg-emerald-50 text-[#2D6A4F] font-bold' 
                  : 'text-[#837560] hover:text-[#2D6A4F] hover:bg-[#FAF9F5]'
              }`}
              title="Tag a location pin"
              aria-label="Tag a location pin"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Location</span>
            </button>

            {/* 😊 Emoji Picker Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-xl text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                showEmojiPicker 
                  ? 'bg-amber-50 text-[#B45309] font-bold' 
                  : 'text-[#837560] hover:text-[#582F0E] hover:bg-[#FAF9F5]'
              }`}
              title="Add emojis"
              aria-label="Add emojis"
            >
              <Smile className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Emoji</span>
            </button>
          </div>

          {/* Post Comment Button */}
          <button
            type="submit"
            disabled={submitting || (!content.trim() && !attachedImage)}
            className={`btn-tactile inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold transition shadow-xs ${
              content.trim() || attachedImage
                ? 'bg-[#2D6A4F] hover:bg-[#1B4332] text-white cursor-pointer active:scale-95'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Post</span>
          </button>
        </div>

        {/* Emoji Quick Picker Popover */}
        {showEmojiPicker && (
          <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] animate-fadeIn">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#E8E5DE]">
              <span className="text-[10px] font-black uppercase text-[#837560]">Travel &amp; Reaction Emojis</span>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-1 text-base">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleInsertEmoji(emoji)}
                  className="p-1.5 rounded-lg hover:bg-white hover:scale-125 transition-transform flex items-center justify-center cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Location Pin Picker Popover */}
        {showPinPicker && (
          <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between pb-1 border-b border-[#E8E5DE]">
              <span className="text-[10px] font-black uppercase text-[#837560] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#2D6A4F]" />
                <span>Tag Venue or Landmark</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPinPicker(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Custom Location Input */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customPinInput}
                onChange={(e) => setCustomPinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customPinInput.trim()) {
                    e.preventDefault();
                    handleSelectPin(customPinInput.trim());
                  }
                }}
                placeholder="Type location name (e.g. Patar Lighthouse)..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#E3DFD5] text-xs outline-none focus:border-[#2D6A4F]"
              />
              <button
                type="button"
                disabled={!customPinInput.trim()}
                onClick={() => handleSelectPin(customPinInput.trim())}
                className="px-3 py-1.5 rounded-lg bg-[#2D6A4F] text-white text-xs font-bold disabled:opacity-40"
              >
                Attach
              </button>
            </div>

            {/* Suggested Popular Spots */}
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-[#837560] uppercase tracking-wider block">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                {SUGGESTED_PINS.map((pin) => (
                  <button
                    key={pin}
                    type="button"
                    onClick={() => handleSelectPin(pin)}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 border border-[#E3DFD5] hover:border-emerald-300 text-[10px] font-semibold text-[#514532] hover:text-[#2D6A4F] transition text-left cursor-pointer"
                  >
                    📍 {pin}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="py-6 text-center space-y-2">
          <Loader2 className="w-5 h-5 text-[#2D6A4F] animate-spin mx-auto" />
          <p className="text-xs text-[#837560]">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-white border border-[#E3DFD5] space-y-1">
          <MessageSquare className="w-7 h-7 text-[#E3DFD5] mx-auto" />
          <p className="text-xs font-bold text-[#582F0E]">No comments yet</p>
          <p className="text-[11px] text-[#837560]">
            Be the first to share tips, recommend a spot, or attach a photo!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isLiked = user?.id ? comment.helpful_user_ids.includes(user.id) : false;
            const initials = comment.author_name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join('');

            return (
              <article
                key={comment.id}
                className="bg-white rounded-2xl border border-[#E3DFD5] p-3.5 space-y-2.5 shadow-2xs hover:border-[#2D6A4F]/30 transition"
              >
                {/* Comment Header: Author & Time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-[10px] font-black text-white shadow-2xs overflow-hidden">
                      {comment.author_avatar ? (
                        <img src={comment.author_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{initials || 'TR'}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate text-xs font-bold text-[#2C221E]">
                          {comment.author_name}
                        </span>
                        <UserBadgesRow
                          userIdOrName={comment.user_id || comment.author_name}
                          isCurrentUser={comment.user_id === user?.id}
                          size="xs"
                        />
                        {comment.is_verified_visit && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-[#2D6A4F] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            <Check className="w-2.5 h-2.5" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-[#837560] font-mono shrink-0">
                    {formatTimeAgo(comment.created_at)}
                  </span>
                </div>

                {/* Comment Text Content */}
                <p className="text-xs text-[#3D332A] leading-relaxed pl-9 whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Attached Location Pin Chip */}
                {comment.location_pin && (
                  <div className="pl-9">
                    <Link
                      href={`/map?search=${encodeURIComponent(comment.location_pin.name)}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/90 text-[#7D5800] text-[11px] font-bold transition group"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#B45309] shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate max-w-[240px]">{comment.location_pin.name}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                    </Link>
                  </div>
                )}

                {/* Attached Image Preview */}
                {comment.image_url && (
                  <div className="pl-9">
                    <div 
                      onClick={() => setZoomedImage(comment.image_url || null)}
                      className="relative inline-block rounded-xl overflow-hidden border border-[#E3DFD5] shadow-xs cursor-pointer group max-w-sm"
                    >
                      <img
                        src={comment.image_url}
                        alt="User attached photo"
                        className="max-h-48 w-auto object-cover group-hover:scale-102 transition duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  </div>
                )}

                {/* Comment Footer: Like Action */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-100 pl-9">
                  <span className="text-[10px] text-stone-400">Pangasinan Community</span>

                  <button
                    type="button"
                    onClick={() => handleToggleLike(comment.id)}
                    className={`btn-tactile inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      isLiked
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <PixelHeart isLiked={isLiked} size="xs" />
                    <span>{comment.helpful_count > 0 ? comment.helpful_count : 'Like'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Image Zoom Lightbox Modal */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-black shadow-2xl">
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black transition z-10"
              title="Close image"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Enlarged view"
              className="max-h-[85vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
