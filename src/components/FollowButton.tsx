'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  fetchUserRelationship,
  followUser,
  unfollowUser,
  type UserRelationship,
} from '@/lib/social';
import { UserPlus, UserCheck, Loader2, ShieldAlert, Edit3 } from 'lucide-react';

interface FollowButtonProps {
  targetUserId: string;
  targetDisplayName?: string;
  onCountChange?: (delta: number) => void;
  compact?: boolean;
  className?: string;
}

export function FollowButton({
  targetUserId,
  targetDisplayName = 'Traveler',
  onCountChange,
  compact = false,
  className = '',
}: FollowButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [relationship, setRelationship] = useState<UserRelationship | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingRel, setIsLoadingRel] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showPrivateModal, setShowPrivateModal] = useState(false);

  const isSelf = user?.id === targetUserId;

  // Load relationship once authenticated user is known
  const loadRelationship = useCallback(async () => {
    if (!user || isSelf) return;
    setIsLoadingRel(true);
    try {
      const rel = await fetchUserRelationship(targetUserId);
      if (rel) {
        setRelationship(rel);
        setIsFollowing(rel.is_following);
      }
    } finally {
      setIsLoadingRel(false);
    }
  }, [user, targetUserId, isSelf]);

  useEffect(() => {
    loadRelationship();
  }, [loadRelationship]);

  // Handle click for guest vs authenticated
  const handleClick = async () => {
    if (!user) {
      // Guest: redirect to login with return URL
      const returnUrl = encodeURIComponent(pathname || '/explore');
      router.push(`/login?redirect=${returnUrl}`);
      return;
    }

    if (isSelf || isPending) return;

    // Check if actor needs to make profile public
    if (relationship && !relationship.can_follow && relationship.reason === 'PROFILE_VISIBILITY_REQUIRED') {
      setShowPrivateModal(true);
      return;
    }

    const nextState = !isFollowing;
    const delta = nextState ? 1 : -1;

    // Optimistic Update
    setIsFollowing(nextState);
    setIsPending(true);
    setStatusMessage(nextState ? `Following ${targetDisplayName}` : `Unfollowed ${targetDisplayName}`);
    if (onCountChange) {
      onCountChange(delta);
    }

    try {
      if (nextState) {
        const result = await followUser(targetUserId);
        if (!result.success) {
          // Rollback
          setIsFollowing(!nextState);
          if (onCountChange) onCountChange(-delta);

          if (result.error?.code === 'PROFILE_VISIBILITY_REQUIRED') {
            setShowPrivateModal(true);
            setStatusMessage('Your profile must be public before you can follow travelers.');
          } else {
            setStatusMessage(result.error?.message || 'Unable to follow. Please try again.');
          }
        }
      } else {
        const result = await unfollowUser(targetUserId);
        if (!result.success) {
          // Rollback
          setIsFollowing(!nextState);
          if (onCountChange) onCountChange(-delta);
          setStatusMessage(result.error?.message || 'Unable to unfollow. Please try again.');
        }
      }
    } catch {
      // Rollback on unexpected exception
      setIsFollowing(!nextState);
      if (onCountChange) onCountChange(-delta);
      setStatusMessage('Action failed due to network error.');
    } finally {
      setIsPending(false);
    }
  };

  // If viewing self on a profile page: render Edit Profile link
  if (isSelf) {
    if (compact) return null;
    return (
      <Link
        href="/profile"
        className={`inline-flex items-center gap-1.5 rounded-xl border border-[#D5C4AC] bg-white px-4 py-2 text-xs font-bold text-[#582F0E] shadow-2xs hover:bg-[#FAF9F5] transition min-h-[44px] ${className}`}
      >
        <Edit3 className="h-4 w-4 text-[#2D6A4F]" />
        <span>Edit Profile</span>
      </Link>
    );
  }

  return (
    <>
      <div className="relative inline-flex items-center">
        {/* Accessible live region for screen readers */}
        <div aria-live="polite" className="sr-only">
          {statusMessage}
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={isPending || isLoadingRel}
          aria-label={
            !user
              ? `Sign in to follow ${targetDisplayName}`
              : isFollowing
              ? `Unfollow ${targetDisplayName}`
              : `Follow ${targetDisplayName}`
          }
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition min-h-[44px] touch-manipulation shadow-2xs disabled:opacity-70 ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
          } ${
            isFollowing
              ? 'bg-[#FAF9F5] text-[#2D6A4F] border border-[#2D6A4F]/30 hover:bg-emerald-50'
              : 'bg-[#2D6A4F] text-white hover:bg-[#1B4332] active:scale-[0.98]'
          } ${className}`}
        >
          {isPending || isLoadingRel ? (
            <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />
          ) : isFollowing ? (
            <>
              <UserCheck className="h-4 w-4 text-[#2D6A4F] shrink-0" />
              <span>Following</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 text-white shrink-0" />
              <span>Follow</span>
            </>
          )}
        </button>
      </div>

      {/* Modal dialog when private user attempts to follow */}
      {showPrivateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="private-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E3DFD5] space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#B45309]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 id="private-modal-title" className="text-base font-black text-[#2C221E]">
                Public Profile Required
              </h3>
            </div>

            <p className="text-xs text-[#514532] leading-relaxed">
              JuanDerQuest social discovery is public-to-public. To follow travelers and build your Pangasinan scout network, please enable your public profile in settings.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2EFE9]">
              <button
                type="button"
                onClick={() => setShowPrivateModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-[#837560] hover:bg-[#FAF9F5] transition min-h-[44px]"
              >
                Cancel
              </button>
              <Link
                href="/profile"
                className="inline-flex items-center justify-center rounded-xl bg-[#2D6A4F] px-4 py-2 text-xs font-bold text-white hover:bg-[#1B4332] transition min-h-[44px]"
              >
                Go to Profile Settings
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
