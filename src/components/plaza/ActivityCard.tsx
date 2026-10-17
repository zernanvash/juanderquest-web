import React, { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, MoreHorizontal, EyeOff, MapPin } from 'lucide-react';
import type { ActivityItem } from '@/lib/plaza-api';
import { formatActivityText } from './activityText';
import { CommentThread } from './CommentThread';

interface ActivityCardProps {
  activity: ActivityItem;
  isGuest?: boolean;
  onCheerToggle?: (activityId: string, cheered: boolean) => Promise<void>;
  onHideActivity?: (activityId: string) => Promise<void>;
  defaultCommentsOpen?: boolean;
}

function timeAgo(dateString: string): string {
  const d = new Date(dateString);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  isGuest,
  onCheerToggle,
  onHideActivity,
  defaultCommentsOpen = false,
}) => {
  const [cheered, setCheered] = useState(activity.cheered_by_me);
  const [cheerCount, setCheerCount] = useState(activity.cheer_count);
  const [commentCount, setCommentCount] = useState(activity.comment_count);
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [showMenu, setShowMenu] = useState(false);
  const [hidden, setHidden] = useState(false);

  const formatted = formatActivityText(activity);

  const handleCheerClick = async () => {
    if (isGuest) {
      window.location.href = `/login?redirect=/plaza?activity=${activity.id}`;
      return;
    }
    const nextState = !cheered;
    const nextCount = nextState ? cheerCount + 1 : Math.max(0, cheerCount - 1);
    // Optimistic toggle
    setCheered(nextState);
    setCheerCount(nextCount);

    if (onCheerToggle) {
      try {
        await onCheerToggle(activity.id, nextState);
      } catch {
        // Rollback on error
        setCheered(!nextState);
        setCheerCount(cheerCount);
      }
    }
  };

  const handleHide = async () => {
    if (!onHideActivity) return;
    try {
      await onHideActivity(activity.id);
      setHidden(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to hide activity');
    }
  };

  if (hidden) return null;

  return (
    <article
      id={`activity-${activity.id}`}
      aria-labelledby={`act-heading-${activity.id}`}
      className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 sm:p-5 shadow-xs hover:shadow-md transition space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border border-[var(--color-border-default)] flex items-center justify-center font-black text-amber-900 shrink-0 overflow-hidden shadow-2xs">
            {activity.actor.avatar_url ? (
              <img
                src={activity.actor.avatar_url}
                alt={activity.actor.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              activity.actor.display_name.charAt(0)
            )}
          </div>

          {/* Actor & Reason Chip */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {activity.actor.handle ? (
                <Link
                  href={`/profile/${activity.actor.handle}`}
                  className="text-xs sm:text-sm font-bold text-[var(--color-brand-brown)] hover:text-[var(--color-brand-primary)] transition truncate"
                >
                  {activity.actor.display_name}
                </Link>
              ) : (
                <span className="text-xs sm:text-sm font-bold text-[var(--color-brand-brown)] truncate">
                  {activity.actor.display_name}
                </span>
              )}

              {/* Context chip */}
              {activity.reason === 'following' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  Following
                </span>
              )}
              {activity.reason === 'you' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  You
                </span>
              )}
              {activity.reason === 'nearby' && activity.municipality && (
                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>Near {activity.municipality}</span>
                </span>
              )}
            </div>

            <span className="text-[10px] text-[var(--color-text-muted)] block">
              {timeAgo(activity.created_at)}
            </span>
          </div>
        </div>

        {/* Menu (if owner can hide) */}
        {activity.can_hide && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition"
              aria-label="Activity options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--color-border-default)] rounded-xl shadow-lg py-1 z-10 w-32">
                <button
                  type="button"
                  onClick={handleHide}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide activity</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sentence / Content */}
      <div id={`act-heading-${activity.id}`} className="space-y-1">
        <p className="text-xs sm:text-sm text-[var(--color-brand-brown)] leading-relaxed">
          {formatted.sentence}
          {formatted.pointsBadge && (
            <span className="ml-1.5 text-[11px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {formatted.pointsBadge}
            </span>
          )}
        </p>

        {activity.subject?.href && (
          <Link
            href={activity.subject.href}
            className="text-xs font-bold text-[var(--color-brand-primary)] hover:underline inline-block pt-0.5"
          >
            View {activity.subject.title} →
          </Link>
        )}
      </div>

      {/* Actions (Cheer, Comment) */}
      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handleCheerClick}
          aria-pressed={cheered}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
            cheered
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-subtle)]/80 text-[var(--color-brand-brown)] border border-[var(--color-border-default)]'
          }`}
        >
          <span>👏</span>
          <span>{cheerCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setCommentsOpen(!commentsOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-subtle)]/80 text-[var(--color-brand-brown)] border border-[var(--color-border-default)] text-xs font-bold transition"
        >
          <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Inline Comments */}
      {commentsOpen && (
        <CommentThread
          activityId={activity.id}
          isGuest={isGuest}
          onCommentCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
        />
      )}
    </article>
  );
};
