'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { PublicUserProfile } from '@/lib/search';
import { FollowButton } from '@/components/FollowButton';
import { FollowListModal } from '@/components/FollowListModal';
import {
  Award,
  Compass,
  MapPin,
  Sparkles,
  Users,
  UserCheck,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

interface UserProfileViewProps {
  profile: PublicUserProfile;
}

export function UserProfileView({ profile }: UserProfileViewProps) {
  const [followerCount, setFollowerCount] = useState<number>(profile.follower_count ?? 0);
  const [followingCount] = useState<number>(profile.following_count ?? 0);
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);

  const scoutLevel = Math.max(1, Math.floor((profile.scout_reputation || 0) / 100) + 1);
  const initials = profile.display_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

  const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : 2026;

  const stats: Array<{ label: string; value: number | string; subtext: string; icon: LucideIcon; color: string }> = [
    {
      label: 'Scout Level',
      value: `Lv. ${scoutLevel}`,
      subtext: `${profile.scout_reputation || 0} Scout Rep`,
      icon: Award,
      color: 'text-[#B45309] bg-amber-100/70',
    },
    {
      label: 'Reputation',
      value: `${profile.scout_reputation || 0} RP`,
      subtext: 'Non-inflationary Rep',
      icon: Sparkles,
      color: 'text-[#2D6A4F] bg-emerald-100/70',
    },
    {
      label: 'Followers',
      value: followerCount,
      subtext: 'Public Travelers',
      icon: Users,
      color: 'text-blue-700 bg-blue-100/70',
    },
    {
      label: 'Following',
      value: followingCount,
      subtext: 'Scouts Followed',
      icon: UserCheck,
      color: 'text-purple-700 bg-purple-100/70',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Privacy Notice Pill */}
      <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-white to-amber-50/60 p-4 text-xs text-[#7D5800] shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-[#B45309] shrink-0" />
          <span>
            <strong>Public Traveler Passport:</strong> This public profile is discoverable across JuanDerQuest feeds and directory searches.
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-amber-200/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#582F0E]">
          Public Profile
        </span>
      </div>

      {/* Profile Card with Cover Banner */}
      <section className="overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-xs">
        {/* Expedition Cover Banner */}
        <div className="relative h-36 sm:h-44 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C] overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FAF9F5_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute bottom-3 right-4 flex items-center gap-2 text-white/85 text-[10px] font-bold uppercase tracking-wider bg-black/25 px-3 py-1 rounded-full backdrop-blur-xs">
            <Compass className="h-3.5 w-3.5 text-[#FFB703]" />
            <span>Pangasinan Explorer · Member since {joinedYear}</span>
          </div>
        </div>

        <div className="px-6 pb-8 sm:px-8">
          <div className="-mt-14 sm:-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar + Primary Identity Info */}
            <div className="flex min-w-0 flex-col gap-3.5 sm:flex-row sm:items-end">
              <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-2xl sm:text-3xl font-black text-[#582F0E] shadow-md ring-2 ring-[#2D6A4F]/20 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials || 'TR'}</span>
                )}
              </div>

              <div className="min-w-0 pb-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#2C221E] tracking-tight">
                    {profile.display_name}
                  </h1>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-[#2D6A4F] border border-emerald-200">
                    Level {scoutLevel}
                  </span>
                </div>

                {profile.handle && (
                  <p className="text-xs font-bold text-[#2D6A4F]">@{profile.handle}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="inline-flex items-center gap-1 text-xs text-[#514532] font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-[#2D6A4F]" />
                    Pangasinan, Philippines
                  </span>

                  {/* Clickable Follower / Following counters */}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setModalType('followers')}
                      className="inline-flex items-center gap-1 text-[#2C221E] hover:text-[#2D6A4F] font-bold hover:underline transition touch-manipulation min-h-[32px]"
                    >
                      <span className="text-[#2D6A4F]">{followerCount}</span>
                      <span className="text-[#837560]">Followers</span>
                    </button>
                    <span className="text-[#E3DFD5]">·</span>
                    <button
                      type="button"
                      onClick={() => setModalType('following')}
                      className="inline-flex items-center gap-1 text-[#2C221E] hover:text-[#2D6A4F] font-bold hover:underline transition touch-manipulation min-h-[32px]"
                    >
                      <span className="text-[#2D6A4F]">{followingCount}</span>
                      <span className="text-[#837560]">Following</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Follow / Edit Action Button */}
            <div className="pt-2 sm:pt-0">
              <FollowButton
                targetUserId={profile.id}
                targetDisplayName={profile.display_name}
                onCountChange={(delta) => setFollowerCount((prev) => Math.max(0, prev + delta))}
              />
            </div>
          </div>

          {/* Bio & Travel Status */}
          <div className="mt-6 pt-5 border-t border-[#F2EFE9] space-y-3">
            {profile.bio ? (
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-[#514532]">
                {profile.bio}
              </p>
            ) : (
              <p className="max-w-2xl text-xs text-[#837560] italic">
                No public biography provided yet.
              </p>
            )}

            {profile.status_text && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF9F5] border border-[#E3DFD5] px-3 py-1 text-[11px] font-bold text-[#2C221E]">
                  <Compass className="h-3.5 w-3.5 text-[#2D6A4F]" />
                  <span>{profile.status_text}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4 Expedition Metrics Grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, subtext, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-[#E3DFD5] bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#837560]">
                Activity
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#2C221E] tracking-tight">{value}</div>
              <div className="text-xs font-bold text-[#582F0E] mt-0.5">{label}</div>
              <div className="text-[10px] text-[#837560] font-medium">{subtext}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Action Link back to Explore */}
      <div className="pt-2 text-center">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#2D6A4F] hover:underline min-h-[44px]"
        >
          <span>← Return to Community Feed</span>
        </Link>
      </div>

      {/* Follow List Modal (Followers / Following) */}
      <FollowListModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        userId={profile.id}
        userName={profile.display_name}
        type={modalType || 'followers'}
      />
    </div>
  );
}
