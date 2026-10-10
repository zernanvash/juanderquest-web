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
  Check,
  X,
  Flame,
  Crown,
  ChevronRight,
  Tag,
  Info,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { UserBadgeChip, UserBadgeIcon, UserBadgesRow } from '@/components/Badges';
import {
  getActiveNametagBadges,
  getActiveNametagBadgeIds,
  setActiveNametagBadgeIds,
  onBadgesUpdated,
  SAMPLE_USER_BADGES,
  type UserBadge,
} from '@/lib/badges';

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

  // Modals & UI Controls
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);
  const [badgeFilterTab, setBadgeFilterTab] = useState<'all' | 'nft' | 'achievement' | 'civic'>('all');
  const [selectedBadgeModal, setSelectedBadgeModal] = useState<UserBadge | null>(null);
  const [activeBadgeIds, setActiveBadgeIds] = useState<string[]>(() => getActiveNametagBadgeIds());

  useEffect(() => {
    const unsubscribe = onBadgesUpdated((ids) => {
      setActiveBadgeIds(ids);
    });
    return unsubscribe;
  }, []);

  // Load Own Profile Details
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
        setLoadingBadges(true);
        try {
          const badgeRes = await api.get(`/users/${encodeURIComponent(res.profile.id)}/achievements`, { timeout: 6000 });
          const rawBadges = badgeRes.data?.data?.badges || badgeRes.data?.data?.achievements;
          if (badgeRes.data?.success && Array.isArray(rawBadges)) {
            setSharedBadges(rawBadges.map((item: any) => ({
              id: item.id || item.achievement_id || 'achievement',
              name: item.name || item.definition?.title || item.title || 'Verified Achievement',
              category: item.category || item.definition?.category || item.definition?.track || 'milestone',
            })));
          } else {
            setSharedBadges(null);
          }
        } catch {
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

  const filteredBadges = SAMPLE_USER_BADGES.filter((b) => {
    if (badgeFilterTab === 'all') return true;
    if (badgeFilterTab === 'nft') return b.isNft;
    if (badgeFilterTab === 'achievement') return b.type === 'achievement';
    if (badgeFilterTab === 'civic') return b.type === 'civic' || b.type === 'scout';
    return true;
  });

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display traveler profile">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-16">
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
          {/* CASE 4: Other Traveler — Public Passport Display (Widescreen) */}
          {/* ======================================================== */}
          {!authLoading && !isMine && !loadingPublic && publicResult?.kind === 'success' && (() => {
            const profile = publicResult.profile;
            const displayName = profile.display_name?.trim() || profile.handle?.trim() || 'Traveler';
            const initials = displayName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() || '')
              .join('') || 'TR';
            const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : 2026;
            const scoutRep = profile.scout_reputation || 0;
            const scoutLevel = Math.max(1, Math.floor(scoutRep / 100) + 1);
            const repInLevel = scoutRep % 100;
            const scoutLevelProgress = Math.min(100, Math.round((repInLevel / 100) * 100));

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Sticky Traveler Identity Sidebar (4 cols) */}
                <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
                  {/* Expedition Cover & Identity Card */}
                  <section className="overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-xs">
                    <div className="relative h-32 sm:h-36 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C] overflow-hidden">
                      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FAF9F5_1px,transparent_1px)] [background-size:16px_16px]" />
                      <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 text-white/90 text-[10px] font-bold uppercase tracking-wider bg-black/35 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        <Compass className="h-3 w-3 text-[#FFB703]" />
                        <span>Member since {joinedYear}</span>
                      </div>
                    </div>

                    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                      <div className="-mt-12 sm:-mt-14 flex items-end justify-between gap-3">
                        <div className="relative flex h-24 w-24 sm:h-26 sm:w-26 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-2xl font-black text-[#582F0E] shadow-md ring-2 ring-[#2D6A4F]/20 overflow-hidden">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>

                        {/* Follow Button */}
                        <div className="pb-1">
                          <FollowButton
                            targetUserId={profile.id}
                            targetDisplayName={displayName}
                          />
                        </div>
                      </div>

                      {/* Name, Nametag Badges & Handle */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h1 className="truncate text-lg sm:text-xl font-black text-[#2C221E]">
                            {displayName}
                          </h1>
                          <UserBadgesRow userIdOrName={profile.id || displayName} size="sm" />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {profile.handle && (
                            <span className="font-bold text-[#2D6A4F]">@{profile.handle}</span>
                          )}
                          <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[9px] font-black uppercase text-[#2D6A4F]">
                            Public Traveler
                          </span>
                        </div>
                      </div>

                      {/* Bio & Status Display */}
                      <div className="mt-4 space-y-2 border-t border-[#F2EFE9] pt-3.5">
                        {profile.status_text && (
                          <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]/60 text-xs font-semibold text-[#582F0E] italic flex items-start gap-1.5">
                            <span className="text-[#FFB703] font-serif text-sm leading-none">&ldquo;</span>
                            <span>{profile.status_text}</span>
                            <span className="text-[#FFB703] font-serif text-sm leading-none">&rdquo;</span>
                          </div>
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

                      {/* Level Progress Gauge */}
                      <div className="mt-4 p-3 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-[#582F0E]">
                            <Award className="w-3.5 h-3.5 text-[#FFB703]" />
                            <span>Level {scoutLevel} Scout</span>
                          </span>
                          <span className="text-[11px] text-[#2D6A4F] font-black">
                            {scoutRep} Rep ({scoutLevelProgress}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#E3DFD5]/70 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#2D6A4F] to-[#40916C] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(6, scoutLevelProgress)}%` }}
                          />
                        </div>
                      </div>

                      {/* Social Followers & Following Count Buttons */}
                      <div className="mt-4 pt-3.5 border-t border-[#F2EFE9] grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setModalType('followers')}
                          className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 transition cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-[#2D6A4F]" />
                          <span className="text-[#2D6A4F]">{profile.follower_count || 0}</span>
                          <span className="text-[11px]">Followers</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalType('following')}
                          className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 transition cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
                          <span className="text-[#2D6A4F]">{profile.following_count || 0}</span>
                          <span className="text-[11px]">Following</span>
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Explorer Credentials & Metadata Card */}
                  <div className="theme-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                      <span>Explorer Credentials</span>
                    </div>
                    <div className="divide-y divide-[#F2EFE9] text-xs">
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#837560]">Base Region</span>
                        <span className="font-bold text-[#2C221E]">Pangasinan, Region 1</span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#837560]">Verification Engine</span>
                        <span className="font-bold text-[#2D6A4F] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Haversine GPS (&le;100m)
                        </span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#837560]">Explorer Status</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                          Active &amp; Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Showcase, Badges & Journey (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Top Metrics Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="theme-card p-4 text-center">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black text-[#2D6A4F]">{scoutRep}</div>
                      <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Scout Reputation</div>
                    </div>

                    <div className="theme-card p-4 text-center">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black text-[#582F0E]">Lv. {scoutLevel}</div>
                      <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Explorer Tier</div>
                    </div>

                    <div className="theme-card p-4 text-center">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black text-blue-900">{profile.follower_count || 0}</div>
                      <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Traveler Friends</div>
                    </div>

                    <div className="theme-card p-4 text-center">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                        <Compass className="w-4 h-4 text-purple-700" />
                      </div>
                      <div className="text-xl font-black text-purple-900">{sharedBadges?.length || 3}</div>
                      <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Badges Earned</div>
                    </div>
                  </div>

                  {/* Interactive Soulbound Badges & NFT Trophy Showcase */}
                  <section className="bg-white rounded-3xl border border-[var(--color-border-default)] p-5 sm:p-7 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border-default)]">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-[var(--color-brand-primary)]" />
                          <h2 className="text-base sm:text-lg font-black text-[var(--color-brand-brown)]">
                            Soulbound Badges &amp; NFT Showcase
                          </h2>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          Base L2 Soulbound achievements and gamified expedition tokens. Click any badge to inspect.
                        </p>
                      </div>

                      {/* Filter tabs */}
                      <div className="flex items-center gap-1 p-1 bg-[#FAF9F5] border border-[#E3DFD5] rounded-xl self-start sm:self-center">
                        {(['all', 'nft', 'achievement', 'civic'] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setBadgeFilterTab(tab)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition capitalize cursor-pointer ${
                              badgeFilterTab === tab
                                ? 'bg-[var(--color-brand-primary)] text-white shadow-2xs'
                                : 'text-[#837560] hover:text-[#2C221E]'
                            }`}
                          >
                            {tab === 'all' ? 'All' : tab === 'nft' ? 'NFTs' : tab === 'civic' ? 'Civic' : 'Quests'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Badges Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {filteredBadges.map((badge) => (
                        <div
                          key={badge.id}
                          onClick={() => setSelectedBadgeModal(badge)}
                          className="p-4 rounded-2xl border border-[#E3DFD5] hover:border-[#2D6A4F] bg-white hover:bg-[#FAF9F5]/70 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group"
                        >
                          {badge.isNft && (
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[badge-glint_2s_ease-in-out_infinite] pointer-events-none" />
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border ${badge.themeColor.bg} ${badge.themeColor.border} shadow-2xs`}>
                              <span>{badge.icon}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                badge.rarity === 'legendary'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : badge.rarity === 'epic'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : badge.rarity === 'rare'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                  : 'bg-stone-100 text-stone-700 border border-stone-200'
                              }`}>
                                {badge.rarity}
                              </span>
                              {badge.isNft && (
                                <span className="text-[9px] font-mono font-bold text-amber-700">
                                  {badge.tokenId}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3">
                            <h4 className="text-xs sm:text-sm font-black text-[#2C221E] group-hover:text-[#2D6A4F] transition truncate">
                              {badge.name}
                            </h4>
                            <p className="text-[11px] text-[#837560] line-clamp-2 mt-1 leading-relaxed">
                              {badge.description}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#F2EFE9] flex items-center justify-between text-[10px] font-bold text-[#2D6A4F]">
                            <span>{badge.network || 'Off-chain'}</span>
                            <span className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                              Inspect <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Public Verified Badges (From Social API) */}
                  <section className="bg-white rounded-3xl border border-[var(--color-border-default)] p-5 sm:p-7 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-default)]">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[var(--color-brand-primary)]" />
                        <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                          Verified Quest Accomplishments
                        </h2>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                        Civic Trail History
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
                          <div key={b.id} className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
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
                </div>

                {/* Follow List Modal */}
                {modalType && (
                  <FollowListModal
                    isOpen={Boolean(modalType)}
                    onClose={() => setModalType(null)}
                    userId={profile.id}
                    userName={displayName}
                    type={modalType}
                    ownerView={false}
                  />
                )}
              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* CASE 5: Own Profile — Exclusive Passport & Showcase (Widescreen) */}
          {/* ======================================================== */}
          {!authLoading && isMine && user && (() => {
            const displayName = myProfile?.display_name?.trim() || user.displayName?.trim() || 'Explorer';
            const handleText = myProfile?.handle?.trim() || user.seedId?.trim() || 'traveler';
            const initials = displayName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() || '')
              .join('') || 'ME';
            const joinedYear = myProfile?.created_at ? new Date(myProfile.created_at).getFullYear() : 2026;
            const currentPoints = user.points ?? 0;
            const currentLevel = Math.floor(currentPoints / 50) + 1;
            const pointsInLevel = currentPoints % 50;
            const nextLevelProgress = Math.min(100, Math.round((pointsInLevel / 50) * 100));

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Sticky Identity Passport Sidebar (4 cols) */}
                <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
                  {/* Passport Cover Banner & Header Card */}
                  <section className="overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-xs">
                    <div className="relative h-32 sm:h-36 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C] overflow-hidden">
                      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FAF9F5_1px,transparent_1px)] [background-size:16px_16px]" />
                      <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 text-white/90 text-[10px] font-bold uppercase tracking-wider bg-black/35 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        <Compass className="h-3 w-3 text-[#FFB703]" />
                        <span>Your Passport · Member {joinedYear}</span>
                      </div>
                    </div>

                    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                      <div className="-mt-12 sm:-mt-14 flex items-end justify-between gap-3">
                        {/* Avatar */}
                        <div className="relative flex h-24 w-24 sm:h-26 sm:w-26 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-2xl font-black text-[#582F0E] shadow-md ring-2 ring-[#2D6A4F]/20 overflow-hidden">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{initials || 'ME'}</span>
                          )}
                        </div>

                        {/* Edit in Settings Button */}
                        <div className="pb-1">
                          <Link
                            href="/settings"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)] text-xs font-extrabold text-[var(--color-brand-brown)] shadow-xs transition cursor-pointer hover:bg-[var(--color-bg-subtle)]"
                          >
                            <Settings className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                            <span>Edit in Settings</span>
                          </Link>
                        </div>
                      </div>

                      {/* Display Name + Nametag Badges Row */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h1 className="truncate text-lg sm:text-xl font-black text-[#2C221E]">
                            {displayName}
                          </h1>
                          <UserBadgesRow isCurrentUser size="sm" />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-bold text-[var(--color-brand-primary)]">
                            @{handleText}
                          </span>
                          <span className="shrink-0 rounded-full bg-[var(--color-brand-primary)]/10 border border-[var(--color-brand-primary)]/20 px-2 py-0.2 text-[9px] font-black uppercase text-[var(--color-brand-primary)]">
                            {user.role === 'admin' ? 'ADMINISTRATOR' : 'YOU (OWNER)'}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.2 text-[9px] font-black uppercase border ${
                              myProfile?.is_public
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                          >
                            {myProfile?.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>

                      {/* Bio & Status Bubble */}
                      <div className="mt-4 space-y-2 border-t border-[#F2EFE9] pt-3.5">
                        {myProfile?.status_text && (
                          <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]/60 text-xs font-semibold text-[#582F0E] italic flex items-start gap-1.5">
                            <span className="text-[#FFB703] font-serif text-sm leading-none">&ldquo;</span>
                            <span>{myProfile.status_text}</span>
                            <span className="text-[#FFB703] font-serif text-sm leading-none">&rdquo;</span>
                          </div>
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

                      {/* Visual Level XP Bar */}
                      <div className="mt-4 p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-[#582F0E]">
                            <Award className="w-3.5 h-3.5 text-[#FFB703]" />
                            <span>Level {currentLevel} Explorer</span>
                          </span>
                          <span className="text-[11px] text-[#2D6A4F] font-black">
                            {currentPoints} PTS ({nextLevelProgress}% to Lv. {currentLevel + 1})
                          </span>
                        </div>
                        <div className="w-full bg-[#E3DFD5]/70 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#2D6A4F] to-[#40916C] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(6, nextLevelProgress)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-[#837560]">
                          Earn XP by verifying visits via Haversine GPS (&le;100m) and completing trails.
                        </p>
                      </div>

                      {/* Social Followers & Following */}
                      {myProfile && (
                        <div className="mt-4 pt-3.5 border-t border-[#F2EFE9] grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setModalType('followers')}
                            className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 transition cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                            <span className="text-[var(--color-brand-primary)]">{myProfile.follower_count}</span>
                            <span className="text-[11px]">Followers</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setModalType('following')}
                            className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-bold text-stone-700 transition cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                            <span className="text-[var(--color-brand-primary)]">{myProfile.following_count}</span>
                            <span className="text-[11px]">Following</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Sovereign Credentials Card */}
                  <div className="theme-card p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                        <span>Sovereign Credentials</span>
                      </div>
                      <Link href="/settings" className="text-[10px] text-[#2D6A4F] font-bold hover:underline">
                        Manage
                      </Link>
                    </div>
                    <div className="divide-y divide-[#F2EFE9] text-xs">
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#837560]">Active Nametag Badges</span>
                        <span className="font-bold text-[#2D6A4F]">
                          {activeBadgeIds.length} / 3 Selected
                        </span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#837560]">GPS Validation Engine</span>
                        <span className="font-bold text-[#2C221E]">Haversine &le; 100m</span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-[#837560]">Network Ledger</span>
                        <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-full text-[10px]">
                          Base Sepolia Ready
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Passport Showcase, Badges & Activity (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Top 4 Metrics Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    {/* Wallet Balances */}
                    <div className="theme-card p-4 text-center">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black text-[#2D6A4F]">
                        {wallet ? `${wallet.balanceMjdq.toLocaleString()}` : '500'}
                      </div>
                      <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                        mJDQ Balance
                      </div>
                    </div>

                    {/* XP Points */}
                    <div className="theme-card p-4 text-center">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black text-[#582F0E]">
                        {currentPoints} PTS
                      </div>
                      <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Expedition XP
                      </div>
                    </div>

                    {/* Streak */}
                    <div className="theme-card p-4 text-center">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                        <Flame className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="text-xl font-black text-orange-950">
                        {engagement?.streak.current ?? 1} Days
                      </div>
                      <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Current Streak
                      </div>
                    </div>

                    {/* Unique Destinations */}
                    <div className="theme-card p-4 text-center">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                        <Compass className="w-4 h-4 text-purple-700" />
                      </div>
                      <div className="text-xl font-black text-purple-950">
                        {engagement?.impact.unique_destinations ?? approvedCategories.size ?? 3}
                      </div>
                      <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                        Destinations
                      </div>
                    </div>
                  </div>

                  {/* Interactive Soulbound Badges & NFT Trophy Showcase */}
                  <section className="bg-white rounded-3xl border border-[var(--color-border-default)] p-5 sm:p-7 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border-default)]">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-[var(--color-brand-primary)]" />
                          <h2 className="text-base sm:text-lg font-black text-[var(--color-brand-brown)]">
                            Soulbound Badges &amp; NFT Showcase
                          </h2>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          Tap any badge to inspect metadata, contract details, and pin to your username nametag.
                        </p>
                      </div>

                      {/* Filter tabs */}
                      <div className="flex items-center gap-1 p-1 bg-[#FAF9F5] border border-[#E3DFD5] rounded-xl self-start sm:self-center">
                        {(['all', 'nft', 'achievement', 'civic'] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setBadgeFilterTab(tab)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition capitalize cursor-pointer ${
                              badgeFilterTab === tab
                                ? 'bg-[var(--color-brand-primary)] text-white shadow-2xs'
                                : 'text-[#837560] hover:text-[#2C221E]'
                            }`}
                          >
                            {tab === 'all' ? 'All' : tab === 'nft' ? 'NFTs' : tab === 'civic' ? 'Civic' : 'Quests'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Badges Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {filteredBadges.map((badge) => {
                        const isPinned = activeBadgeIds.includes(badge.id);
                        return (
                          <div
                            key={badge.id}
                            onClick={() => setSelectedBadgeModal(badge)}
                            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group ${
                              isPinned
                                ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-400/30'
                                : 'bg-white border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-[#FAF9F5]/70'
                            }`}
                          >
                            {badge.isNft && (
                              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[badge-glint_2s_ease-in-out_infinite] pointer-events-none" />
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border ${badge.themeColor.bg} ${badge.themeColor.border} shadow-2xs`}>
                                <span>{badge.icon}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  badge.rarity === 'legendary'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : badge.rarity === 'epic'
                                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                    : badge.rarity === 'rare'
                                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                                }`}>
                                  {badge.rarity}
                                </span>
                                {badge.isNft && (
                                  <span className="text-[9px] font-mono font-bold text-amber-700">
                                    {badge.tokenId}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3">
                              <h4 className="text-xs sm:text-sm font-black text-[#2C221E] group-hover:text-[#2D6A4F] transition truncate">
                                {badge.name}
                              </h4>
                              <p className="text-[11px] text-[#837560] line-clamp-2 mt-1 leading-relaxed">
                                {badge.description}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-[#F2EFE9] flex items-center justify-between text-[10px] font-bold">
                              {isPinned ? (
                                <span className="text-amber-800 flex items-center gap-1 font-extrabold">
                                  <Check className="w-3 h-3 text-emerald-600" /> Active on Nametag
                                </span>
                              ) : (
                                <span className="text-[#837560]">Tap to inspect &amp; pin</span>
                              )}
                              <span className="text-[#2D6A4F] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                Details <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Community Journey & Active Challenges */}
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
                        <div className="rounded-2xl bg-[var(--color-bg-subtle)] p-3">
                          <strong className="block text-xl text-[var(--color-brand-primary)]">{engagement.streak.current}</strong>
                          <span className="text-[11px] text-[var(--color-text-muted)]">Current streak</span>
                        </div>
                        <div className="rounded-2xl bg-[var(--color-bg-subtle)] p-3">
                          <strong className="block text-xl text-[var(--color-brand-brown)]">{engagement.streak.longest}</strong>
                          <span className="text-[11px] text-[var(--color-text-muted)]">Longest streak</span>
                        </div>
                        <div className="rounded-2xl bg-[var(--color-bg-subtle)] p-3">
                          <strong className="block text-xl text-[#B45309]">{engagement.impact.unique_destinations}</strong>
                          <span className="text-[11px] text-[var(--color-text-muted)]">Destinations</span>
                        </div>
                        <div className="rounded-2xl bg-[var(--color-bg-subtle)] p-3">
                          <strong className="block text-xl text-purple-700">{engagement.impact.finalized_participations}</strong>
                          <span className="text-[11px] text-[var(--color-text-muted)]">Votes completed</span>
                        </div>
                      </div>

                      {engagement.challenges && engagement.challenges.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
                          <span className="text-xs font-bold text-[var(--color-brand-brown)] block">Active Expedition Challenges</span>
                          {engagement.challenges.slice(0, 3).map((ch) => (
                            <div key={ch.id} className="text-xs flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)]">
                              <span className="flex items-center gap-1.5 font-medium">
                                {ch.complete ? (
                                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                                ) : (
                                  <span className="w-4 h-4 rounded-full border border-stone-300 inline-block" />
                                )}
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

                  {/* Submission & Proof History */}
                  <section className="bg-white rounded-3xl border border-[var(--color-border-default)] p-5 sm:p-7 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-default)]">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-[var(--color-brand-primary)]" />
                        <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                          Submission &amp; GPS Proof History
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
                          className="inline-flex items-center gap-1 mt-3 px-3.5 py-1.5 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-bold hover:bg-[var(--color-brand-primary-hover)] transition"
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
                              className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
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

                  {/* Base Sepolia Readiness Widget */}
                  <BaseSepoliaReadiness signedInSeedId={user.seedId} />
                </div>

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

          {/* ======================================================== */}
          {/* Badge Inspection & Nametag Customization Modal */}
          {/* ======================================================== */}
          {selectedBadgeModal && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
              onClick={() => setSelectedBadgeModal(null)}
            >
              <div
                className="bg-white rounded-3xl border border-[#E3DFD5] max-w-md w-full p-6 shadow-2xl space-y-5 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelectedBadgeModal(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="text-center space-y-3 pt-2">
                  <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-4xl shadow-md border ${selectedBadgeModal.themeColor.bg} ${selectedBadgeModal.themeColor.border} relative overflow-hidden`}>
                    {selectedBadgeModal.isNft && (
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[badge-glint_2.5s_ease-in-out_infinite] pointer-events-none" />
                    )}
                    <span>{selectedBadgeModal.icon}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-lg font-black text-[#2C221E]">{selectedBadgeModal.name}</h3>
                      {selectedBadgeModal.isNft && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-900 border border-amber-500/30">
                          Soulbound NFT
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mt-0.5">
                      {selectedBadgeModal.rarity} Rarity {selectedBadgeModal.network ? `• ${selectedBadgeModal.network}` : ''}
                    </p>
                  </div>
                </div>

                <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E3DFD5] space-y-2 text-xs text-[#582F0E]">
                  <p className="leading-relaxed">{selectedBadgeModal.description}</p>
                  {selectedBadgeModal.tokenId && (
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#E3DFD5]/70 text-[#837560]">
                      <span>Token Identifier</span>
                      <span className="font-mono font-bold text-[#2D6A4F]">{selectedBadgeModal.tokenId}</span>
                    </div>
                  )}
                  {selectedBadgeModal.network && (
                    <div className="flex items-center justify-between text-[11px] text-[#837560]">
                      <span>Blockchain Ledger</span>
                      <span className="font-semibold text-purple-900">{selectedBadgeModal.network}</span>
                    </div>
                  )}
                </div>

                {isMine && (
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const currentIds = getActiveNametagBadgeIds();
                        let updated: string[];
                        if (currentIds.includes(selectedBadgeModal.id)) {
                          updated = currentIds.filter((id) => id !== selectedBadgeModal.id);
                        } else {
                          updated = [...currentIds.slice(-2), selectedBadgeModal.id];
                        }
                        setActiveNametagBadgeIds(updated);
                      }}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        activeBadgeIds.includes(selectedBadgeModal.id)
                          ? 'bg-amber-100 text-amber-950 border border-amber-300'
                          : 'bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-primary-hover)]'
                      }`}
                    >
                      {activeBadgeIds.includes(selectedBadgeModal.id) ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Showing on Nametag (Tap to Remove)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-[#FFB703]" />
                          <span>Display on Nametag (Max 3)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
