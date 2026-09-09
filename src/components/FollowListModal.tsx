'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  fetchFollowers,
  fetchFollowing,
  type PublicTravelerSummary,
  type FollowPageResult,
} from '@/lib/social';
import { FollowButton } from './FollowButton';
import { X, Users, UserCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  type: 'followers' | 'following';
}

export function FollowListModal({
  isOpen,
  onClose,
  userId,
  userName,
  type,
}: FollowListModalProps) {
  const [items, setItems] = useState<PublicTravelerSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const loadInitial = useCallback(async () => {
    if (!userId || !isOpen) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchFn = type === 'followers' ? fetchFollowers : fetchFollowing;
      const res: FollowPageResult | null = await fetchFn(userId, 20);
      if (res) {
        setItems(res.items);
        setNextCursor(res.next_cursor);
        setHasMore(res.has_more);
      } else {
        setError('Unable to load travelers.');
      }
    } catch {
      setError('Connection failed. Please check your network and retry.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isOpen, type]);

  useEffect(() => {
    if (isOpen) {
      loadInitial();
      // Auto-focus close button when modal opens
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    } else {
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
      setError(null);
    }
  }, [isOpen, loadInitial]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const fetchFn = type === 'followers' ? fetchFollowers : fetchFollowing;
      const res: FollowPageResult | null = await fetchFn(userId, 20, nextCursor);
      if (res) {
        setItems((prev) => [...prev, ...res.items]);
        setNextCursor(res.next_cursor);
        setHasMore(res.has_more);
      }
    } catch {
      // Keep existing items, just stop spinner
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (!isOpen) return null;

  const title = type === 'followers' ? `${userName}'s Followers` : `${userName} is Following`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full sm:max-w-md max-h-[85vh] sm:max-h-[75vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-[#E3DFD5] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2EFE9] bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-[#2D6A4F]">
              {type === 'followers' ? <Users className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            </div>
            <h2 id="follow-modal-title" className="font-serif text-base font-black text-[#2C221E] truncate max-w-[220px] sm:max-w-[280px]">
              {title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#837560] hover:bg-[#E8E5DE]/60 transition touch-manipulation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#2D6A4F]" />
              <p className="text-xs text-[#837560] font-medium">Loading travelers...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center px-4">
              <AlertCircle className="h-8 w-8 text-amber-600" />
              <p className="text-xs text-[#514532] max-w-xs">{error}</p>
              <button
                type="button"
                onClick={loadInitial}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] px-4 py-2 text-xs font-bold text-[#2D6A4F] hover:bg-emerald-50 transition min-h-[44px]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4 space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF9F5] border border-[#E3DFD5] text-[#837560]">
                {type === 'followers' ? <Users className="h-6 w-6" /> : <UserCheck className="h-6 w-6" />}
              </div>
              <p className="text-xs font-bold text-[#582F0E]">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
              <p className="text-[11px] text-[#837560] max-w-xs">
                {type === 'followers'
                  ? 'When other travelers follow this scout, they will appear here.'
                  : 'Public travelers followed by this scout will appear here.'}
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-1.5" role="list">
                {items.map((traveler) => {
                  const initials = traveler.display_name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join('');

                  return (
                    <li
                      key={traveler.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-transparent hover:border-[#E3DFD5] hover:bg-[#FAF9F5] transition"
                    >
                      <Link
                        href={`/users/${encodeURIComponent(traveler.id)}`}
                        onClick={onClose}
                        className="flex items-center gap-3 min-w-0 flex-1 group"
                      >
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-xs font-black text-white shadow-2xs overflow-hidden">
                          {traveler.avatar_url ? (
                            <img src={traveler.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{initials || 'TR'}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition">
                            {traveler.display_name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#837560]">
                            {traveler.handle && <span>@{traveler.handle}</span>}
                            <span>·</span>
                            <span>{traveler.scout_reputation || 0} Rep</span>
                          </div>
                        </div>
                      </Link>

                      <FollowButton
                        targetUserId={traveler.id}
                        targetDisplayName={traveler.display_name}
                        compact
                      />
                    </li>
                  );
                })}
              </ul>

              {hasMore && (
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-4 py-2 text-xs font-bold text-[#582F0E] hover:bg-[#E8E5DE]/60 transition min-h-[44px] w-full"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#2D6A4F]" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load more travelers</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
