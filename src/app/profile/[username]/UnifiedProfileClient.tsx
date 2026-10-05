'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, isUnauthorizedError, normalizeSubmission, type SubmissionModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  fetchMyProfile,
  type AuthenticatedUserProfile,
} from '@/lib/social';
import {
  fetchPublicUserProfile,
  type PublicUserProfile,
  type FetchUserProfileResult,
} from '@/lib/search';
import { FollowButton } from '@/components/FollowButton';
import { FollowListModal } from '@/components/FollowListModal';
import { BaseSepoliaReadiness } from '@/components/BaseSepoliaReadiness';
import { fetchMyEngagement, type EngagementSummary } from '@/lib/engagement';
import {
  Award,
  Compass,
  Sparkles,
  Users,
  UserCheck,
  ShieldCheck,
  Shield,
  Globe,
  Wallet,
  History,
  Settings,
  Leaf,
  Landmark,
  Utensils,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

interface UnifiedProfileClientProps {
  username: string;
}

export function UnifiedProfileClient({ username }: UnifiedProfileClientProps) {
  const router = useRouter();
  const { user, wallet, isLoading: authLoading } = useAuth();

  // Normalize query param
  const cleanParam = decodeURIComponent(username).trim().toLowerCase().replace(/^@/, '');
  const userHandle = user?.handle ? user.handle.trim().toLowerCase().replace(/^@/, '') : '';
  const userSeedId = user?.seedId ? user.seedId.trim().toLowerCase() : '';
  const userId = user?.id ? user.id.trim().toLowerCase() : '';
  const userDisplayNameNorm = user?.displayName ? user.displayName.trim().toLowerCase().replace(/\s+/g, '_') : '';

  // Determine if viewing own profile
  const isMine = Boolean(
    user &&
    (
      cleanParam === 'me' ||
      (userHandle && cleanParam === userHandle) ||
      (userSeedId && cleanParam === userSeedId) ||
      (userId && cleanParam === userId) ||
      (userDisplayNameNorm && cleanParam === userDisplayNameNorm)
    )
  );

  // Own Profile States
  const [myProfile, setMyProfile] = useState<AuthenticatedUserProfile | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [engagement, setEngagement] = useState<EngagementSummary | null>(null);

  // Other Traveler Profile States
  const [publicResult, setPublicResult] = useState<FetchUserProfileResult | null>(null);
  const [loadingPublic, setLoadingPublic] = useState(!isMine);
  const [sharedBadges, setSharedBadges] = useState<Array<{ id: string; name: string; category: string }> | null>(null);
  const [loadingBadges, setLoadingBadges] = useState(false);

  // Modals
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);

  // Load Own Profile Details (Exclusive info cause it's mine)
  const loadMyData = useCallback(async () => {
    if (!user) return;
    try {
      const [profileRes, engagementRes] = await Promise.allSettled([
        fetchMyProfile(),
        fetchMyEngagement(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setMyProfile(profileRes.value);
      }

      if (engagementRes.status === 'fulfilled') {
        setEngagement(engagementRes.value);
      }
    } catch (e) {
      console.error('Failed to load traveler profile details', e);
    }

    try {
      const { data: rawSubmissions } = await fetchWithCache(
        `user_submissions:${user.id}`,
        async () => {
          const res = await api.get('/submissions');
          if (!res.data?.success) throw new Error('Submissions unavailable');
          return (res.data.data as Parameters<typeof normalizeSubmission>[0][]).map(normalizeSubmission);
        },
        { ttlMs: 60_000 }
      );
      setSubmissions(rawSubmissions);
    } catch (e) {
      if (!isUnauthorizedError(e)) console.error('Failed to load submission history', e);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [user]);

  // Load Other Traveler Public Details
  const loadPublicData = useCallback(async (target: string) => {
    setLoadingPublic(true);
    setPublicResult(null);
    try {
      const res = await fetchPublicUserProfile(target);
      setPublicResult(res);

      if (res.kind === 'success' && res.profile.id) {
        // Attempt to fetch public achievements if sharing is enabled
        setLoadingBadges(true);
        try {
          const badgeRes = await api.get(`/users/${encodeURIComponent(res.profile.id)}/achievements`, { timeout: 6000 });
          if (badgeRes.data?.success && Array.isArray(badgeRes.data?.data?.badges)) {
            setSharedBadges(badgeRes.data.data.badges);
          } else {
            setSharedBadges(null);
          }
        } catch {
          // If 404, traveler disabled badge sharing
          setSharedBadges(null);
        } finally {
          setLoadingBadges(false);
        }
      }
    } catch {
      setPublicResult({ kind: 'error', message: 'Unable to connect to traveler network.' });
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (isMine) {
      void loadMyData();
    } else {
      void loadPublicData(cleanParam);
    }
  }, [authLoading, isMine, cleanParam, loadMyData, loadPublicData]);

  // Base badges definitions
  const badgeDefinitions = [
    { name: 'Eco Pioneer', icon: Leaf, desc: 'Complete verified eco-tourism quest' },
    { name: 'Heritage Keeper', icon: Landmark, desc: 'Complete verified cultural heritage quest' },
    { name: 'Food Explorer', icon: Utensils, desc: 'Complete verified food & culinary quest' },
  ];

  const approvedCategories = new Set(
    submissions.filter((s) => s.status === 'approved').map((s) => s.category)
  );

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display traveler profile">
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
          {/* ======================================================== */}
          {/* CASE 1: Loading State */}
          {/* ======================================================== */}
          {(authLoading || (isMine ? false : loadingPublic)) && (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-primary)]" />
              <p className="mt-3 text-xs text-[var(--color-text-muted)] font-medium">
                Loading traveler passport...
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* CASE 2: Other Traveler — Not Found or Private */}
          {/* ======================================================== */}
          {!authLoading && !isMine && !loadingPublic && publicResult?.kind === 'not_found' && (
            <div className="bg-white rounded-3xl border border-[var(--color-border-default)] p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--color-brand-brown)]">
                  Traveler Unavailable
                </h1>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                  This explorer profile is either set to private or does not exist on the Pangasinan network.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-extrabold hover:bg-[var(--color-brand-primary-hover)] transition shadow-xs"
                >
                  <Compass className="w-4 h-4" />
                  <span>Back to Explore Feed</span>
                </Link>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* CASE 3: Other Traveler — Error */}
          {/* ======================================================== */}
          {!authLoading && !isMine && !loadingPublic && publicResult?.kind === 'error' && (
            <div className="bg-white rounded-3xl border border-red-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-red-900">
                  Profile Error
                </h1>
                <p className="text-xs sm:text-sm text-red-700/80 mt-1">
                  {publicResult.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadPublicData(cleanParam)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition cursor-pointer"
              >
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* CASE 4: Other Traveler — Public Passport Display */}
          {/* ======================================================== */}
          {!authLoading && !isMine && !loadingPublic && publicResult?.kind === 'success' && (() => {
            const profile = publicResult.profile;
            const initials = profile.display_name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join('');
            const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : 2026;
            const scoutLevel = Math.max(1, Math.floor((profile.scout_reputation || 0) / 100) + 1);

            return (
              <div className="space-y-6">
                {/* Expedition Cover Banner & Identity Card */}
                <section className="overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-xs">
                  <div className="relative h-36 sm:h-48 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C] overflow-hidden">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FAF9F5_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute bottom-3 right-4 flex items-center gap-2 text-white/90 text-[10px] font-bold uppercase tracking-wider bg-black/30 px-3 py-1 rounded-full backdrop-blur-xs">
                      <Compass className="h-3.5 w-3.5 text-[#FFB703]" />
                      <span>Explorer · Member since {joinedYear}</span>
                    </div>
                  </div>

                  <div className="px-6 pb-6 sm:px-8">
                    <div className="-mt-14 sm:-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      {/* Avatar + Main Info */}
                      <div className="flex min-w-0 flex-col gap-3.5 sm:flex-row sm:items-end">
                        <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-2xl sm:text-3xl font-black text-[#582F0E] shadow-md ring-2 ring-[#2D6A4F]/20 overflow-hidden">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{initials || 'TR'}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-xl sm:text-2xl font-black text-[#2C221E]">
                              {profile.display_name}
                            </h1>
                            <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#2D6A4F]">
                              Public Traveler
                            </span>
                          </div>
                          {profile.handle && (
                            <p className="text-xs font-bold text-[#2D6A4F]">@{profile.handle}</p>
                          )}
                        </div>
                      </div>

                      {/* Follow Button */}
                      <div className="shrink-0">
                        <FollowButton
                          targetUserId={profile.id}
                          targetDisplayName={profile.display_name}
                        />
                      </div>
                    </div>

                    {/* Bio & Status Display (Clean text display) */}
                    <div className="mt-5 space-y-2 border-t border-[#F2EFE9] pt-4">
                      {profile.status_text && (
                        <p className="text-xs sm:text-sm font-semibold text-[#582F0E] italic">
                          &ldquo;{profile.status_text}&rdquo;
                        </p>
                      )}
                      {profile.bio ? (
                        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                          {profile.bio}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)] italic">
                          This traveler has not added a public bio yet.
                        </p>
                      )}
                    </div>

                    {/* Social Stats Pill Bar */}
                    <div className="mt-5 pt-4 border-t border-[#F2EFE9] flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setModalType('followers')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 transition cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-[#2D6A4F]" />
                        <span className="text-[#2D6A4F]">{profile.follower_count || 0}</span>
                        <span>Followers</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalType('following')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 transition cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-[#2D6A4F]" />
                        <span className="text-[#2D6A4F]">{profile.following_count || 0}</span>
                        <span>Following</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Public Scout Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="theme-card p-4 text-center">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-1">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-black text-[#582F0E]">Lv. {scoutLevel}</div>
                    <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Scout Level</div>
                  </div>

                  <div className="theme-card p-4 text-center">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center mx-auto mb-1">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-black text-[#2D6A4F]">{profile.scout_reputation || 0}</div>
                    <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Reputation</div>
                  </div>

                  <div className="theme-card p-4 text-center">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto mb-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-black text-blue-900">{profile.follower_count || 0}</div>
                    <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Followers</div>
                  </div>

                  <div className="theme-card p-4 text-center">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto mb-1">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-black text-purple-900">{profile.following_count || 0}</div>
                    <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Following</div>
                  </div>
                </div>

                {/* Shared Badges / Soulbound Achievements */}
                <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-default)]">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-[var(--color-brand-primary)]" />
                      <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                        Verified Achievements
                      </h2>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                      Soulbound Badges
                    </span>
                  </div>

                  {loadingBadges ? (
                    <div className="py-6 flex items-center justify-center text-xs text-stone-400">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Checking verified achievements...</span>
                    </div>
                  ) : sharedBadges && sharedBadges.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {sharedBadges.map((b) => (
                        <div key={b.id} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-emerald-950 truncate">{b.name}</div>
                            <div className="text-[10px] text-emerald-700 capitalize">{b.category} Quest</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-stone-400">
                      <Lock className="w-6 h-6 mx-auto mb-1 text-stone-300" />
                      <p className="text-xs font-semibold">
                        This traveler has chosen to keep their achievements private.
                      </p>
                    </div>
                  )}
                </section>

                {/* Follow List Modal */}
                {modalType && (
                  <FollowListModal
                    isOpen={Boolean(modalType)}
                    onClose={() => setModalType(null)}
                    userId={profile.id}
                    userName={profile.display_name}
                    type={modalType}
                    ownerView={false}
                  />
                )}
              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* CASE 5: Own Profile — Exclusive Info Cause It's Mine */}
          {/* ======================================================== */}
          {!authLoading && isMine && user && (() => {
            const displayName = myProfile?.display_name || user.displayName || 'Explorer';
            const handleText = myProfile?.handle || user.seedId || 'traveler';
            const initials = displayName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join('');
            const joinedYear = myProfile?.created_at ? new Date(myProfile.created_at).getFullYear() : 2026;
            const currentPoints = user.points ?? 0;
            const currentLevel = Math.floor(currentPoints / 50) + 1;

            return (
              <div className="space-y-6">
                {/* Passport Cover Banner & Header Card */}
                <section className="overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-xs">
                  <div className="relative h-36 sm:h-48 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C] overflow-hidden">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FAF9F5_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute bottom-3 right-4 flex items-center gap-2 text-white/90 text-[10px] font-bold uppercase tracking-wider bg-black/30 px-3 py-1 rounded-full backdrop-blur-xs">
                      <Compass className="h-3.5 w-3.5 text-[#FFB703]" />
                      <span>Your Passport · Member since {joinedYear}</span>
                    </div>
                  </div>

                  <div className="px-6 pb-6 sm:px-8">
                    <div className="-mt-14 sm:-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      {/* Avatar + Main Identity Info */}
                      <div className="flex min-w-0 flex-col gap-3.5 sm:flex-row sm:items-end">
                        <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-2xl sm:text-3xl font-black text-[#582F0E] shadow-md ring-2 ring-[#2D6A4F]/20 overflow-hidden">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{initials || 'ME'}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-xl sm:text-2xl font-black text-[#2C221E]">
                              {displayName}
                            </h1>
                            <span className="shrink-0 rounded-full bg-[var(--color-brand-primary)]/10 border border-[var(--color-brand-primary)]/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--color-brand-primary)]">
                              {user.role === 'admin' ? 'ADMINISTRATOR' : 'YOU (OWNER)'}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${
                                myProfile?.is_public
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-stone-100 text-stone-600 border-stone-200'
                              }`}
                            >
                              {myProfile?.is_public ? 'Public Profile' : 'Private Profile'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[var(--color-brand-primary)]">
                            @{handleText}
                          </p>
                        </div>
                      </div>

                      {/* Action Button: Edit in Settings */}
                      <div className="shrink-0">
                        <Link
                          href="/settings"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)] text-xs font-extrabold text-[var(--color-brand-brown)] shadow-xs transition cursor-pointer hover:bg-[var(--color-bg-subtle)]"
                        >
                          <Settings className="w-4 h-4 text-[var(--color-brand-primary)]" />
                          <span>Edit in Settings</span>
                        </Link>
                      </div>
                    </div>

                    {/* Bio & Status Display (Pure Display, No form inputs) */}
                    <div className="mt-5 space-y-2 border-t border-[#F2EFE9] pt-4">
                      {myProfile?.status_text && (
                        <p className="text-xs sm:text-sm font-semibold text-[#582F0E] italic">
                          &ldquo;{myProfile.status_text}&rdquo;
                        </p>
                      )}
                      {myProfile?.bio ? (
                        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                          {myProfile.bio}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)] italic">
                          No public bio set. Go to{' '}
                          <Link href="/settings" className="font-bold text-[var(--color-brand-primary)] underline">
                            Settings
                          </Link>{' '}
                          to write your traveler bio.
                        </p>
                      )}
                    </div>

                    {/* Social Counters */}
                    {myProfile && (
                      <div className="mt-5 pt-4 border-t border-[#F2EFE9] flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setModalType('followers')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 transition cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-[var(--color-brand-primary)]" />
                          <span className="text-[var(--color-brand-primary)]">{myProfile.follower_count}</span>
                          <span>Followers</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalType('following')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 transition cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4 text-[var(--color-brand-primary)]" />
                          <span className="text-[var(--color-brand-primary)]">{myProfile.following_count}</span>
                          <span>Following</span>
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {/* Exclusive Section 1: Balances & mJDQ Governance Wallet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="theme-card p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-primary-light)] text-[var(--color-brand-primary)] flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                          mJDQ Governance Wallet
                        </div>
                        <div className="text-sm font-extrabold text-[var(--color-brand-primary)]">
                          {wallet ? `${wallet.balanceMjdq.toLocaleString()} mJDQ (${wallet.balanceJdq} JDQ)` : '500 mJDQ'}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">Exclusive owner balance</div>
                      </div>
                    </div>
                  </div>

                  <div className="theme-card p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-accent-light)] text-[var(--color-brand-accent-dark)] flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                          Demo Reward Points & Level
                        </div>
                        <div className="text-sm font-extrabold text-[var(--color-brand-accent-dark)]">
                          Level {currentLevel} • {currentPoints} PTS
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">Off-chain expedition XP</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exclusive Section 2: Community Journey & Streaks */}
                {engagement && (
                  <section className="theme-card p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
                      <div>
                        <h2 className="text-base font-black text-[var(--color-brand-brown)]">
                          Your Community Journey
                        </h2>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Participation status from finalized voting rounds and verified GPS visits.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--color-brand-primary)] uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Owner View
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="rounded-xl bg-[var(--color-bg-subtle)] p-3">
                        <strong className="block text-xl text-[var(--color-brand-primary)]">{engagement.streak.current}</strong>
                        <span className="text-[11px] text-[var(--color-text-muted)]">Current streak</span>
                      </div>
                      <div className="rounded-xl bg-[var(--color-bg-subtle)] p-3">
                        <strong className="block text-xl text-[var(--color-brand-brown)]">{engagement.streak.longest}</strong>
                        <span className="text-[11px] text-[var(--color-text-muted)]">Longest streak</span>
                      </div>
                      <div className="rounded-xl bg-[var(--color-bg-subtle)] p-3">
                        <strong className="block text-xl text-[#B45309]">{engagement.impact.unique_destinations}</strong>
                        <span className="text-[11px] text-[var(--color-text-muted)]">Destinations</span>
                      </div>
                      <div className="rounded-xl bg-[var(--color-bg-subtle)] p-3">
                        <strong className="block text-xl text-purple-700">{engagement.impact.finalized_participations}</strong>
                        <span className="text-[11px] text-[var(--color-text-muted)]">Votes completed</span>
                      </div>
                    </div>

                    {engagement.challenges && engagement.challenges.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
                        <span className="text-xs font-bold text-[var(--color-brand-brown)] block">Active Challenges</span>
                        {engagement.challenges.slice(0, 3).map((ch) => (
                          <div key={ch.id} className="text-xs flex items-center justify-between p-2 rounded-xl bg-[var(--color-bg-subtle)]">
                            <span className="flex items-center gap-1.5 font-medium">
                              {ch.complete && <span className="text-emerald-600 font-bold">✓</span>}
                              {ch.title}
                            </span>
                            <span className="font-bold text-[var(--color-brand-primary)]">
                              {ch.progress}/{ch.target}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Exclusive Section 3: Verified Badges */}
                <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-default)]">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-[var(--color-brand-primary)]" />
                      <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                        Earned Soulbound Badges
                      </h2>
                    </div>
                    <Link
                      href="/settings"
                      className="text-[10px] font-bold text-[var(--color-brand-primary)] hover:underline"
                    >
                      {engagement?.share_achievements ? 'Publicly shared' : 'Private (Manage in Settings)'}
                    </Link>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {badgeDefinitions.map((b) => {
                      const isUnlocked = approvedCategories.has(b.name.toLowerCase().split(' ')[0]);
                      const Icon = b.icon;
                      return (
                        <div
                          key={b.name}
                          className={`p-3.5 rounded-xl border transition ${
                            isUnlocked
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                              : 'bg-stone-50 border-stone-200 text-stone-400 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isUnlocked ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-black">{b.name}</div>
                              <div className="text-[10px]">{isUnlocked ? '✓ Verified Unlocked' : 'Locked'}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Exclusive Section 4: Submissions & Proof History */}
                <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-default)]">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-[var(--color-brand-primary)]" />
                      <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                        Submission & Proof History
                      </h2>
                    </div>
                    <Link
                      href="/history"
                      className="text-xs font-bold text-[var(--color-brand-primary)] hover:underline flex items-center gap-1"
                    >
                      <span>Full History</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {loadingSubmissions ? (
                    <div className="py-6 flex items-center justify-center text-xs text-stone-400">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Loading your proof logs...</span>
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="py-8 text-center text-stone-400">
                      <Compass className="w-8 h-8 mx-auto mb-1.5 text-stone-300" />
                      <p className="text-xs font-semibold text-stone-600">No submissions yet</p>
                      <p className="text-[11px] text-stone-400 max-w-xs mx-auto mt-0.5">
                        Visit destinations and check in with GPS proof to submit your explorer photos.
                      </p>
                      <Link
                        href="/explore"
                        className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-bold hover:bg-[var(--color-brand-primary-hover)] transition"
                      >
                        Explore Pangasinan
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-3 divide-y divide-[var(--color-border-default)]/60">
                      {submissions.slice(0, 5).map((sub) => (
                        <div key={sub.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--color-brand-brown)] truncate">
                              {sub.questTitle || 'Pangasinan Destination Proof'}
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              {new Date(sub.createdAt).toLocaleDateString()} · {sub.category}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              sub.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Exclusive Section 5: Base Sepolia Readiness */}
                <BaseSepoliaReadiness signedInSeedId={user.seedId} />

                {/* Follow List Modal */}
                {modalType && (
                  <FollowListModal
                    isOpen={Boolean(modalType)}
                    onClose={() => setModalType(null)}
                    userId={user.id}
                    userName={displayName}
                    type={modalType}
                    ownerView={true}
                  />
                )}
              </div>
            );
          })()}
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
