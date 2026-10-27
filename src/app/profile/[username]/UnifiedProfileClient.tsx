'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, adminHandoffUrl } from '@/lib/auth';
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
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import { DisplayName } from '@/components/cosmetics/DisplayName';
import { ProfileBanner } from '@/components/cosmetics/ProfileBanner';
import { fetchMyEngagement, type EngagementSummary } from '@/lib/engagement';
import { COPY, formatPoints, formatXp } from '@/lib/copy';
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
  ArrowLeft,
  Flame,
  Crown,
  ChevronRight,
  Tag,
  Info,
  MapPin,
  TrendingUp,
  LogOut,
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
import { ProfileXpBar } from '@/components/profile/ProfileXpBar';
import { ProfileTabGlider } from '@/components/profile/ProfileTabGlider';

interface UnifiedProfileClientProps {
  username: string;
}

export function UnifiedProfileClient({ username }: UnifiedProfileClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, wallet, token, logout, isLoading: authLoading } = useAuth();
  const adminDashboardUrl = user?.role === 'admin' ? adminHandoffUrl() : null;

  // Active panel tab ('overview' | 'badges' | 'history' | 'journey')
  const rawTabParam = (
    searchParams.get('tab') ||
    searchParams.get('panel') ||
    searchParams.get('view') ||
    (searchParams.has('badges') ? 'badges' : '') ||
    (searchParams.has('history') ? 'history' : '') ||
    (searchParams.has('journey') ? 'journey' : '') ||
    'overview'
  ).toLowerCase();

  const activePanel = ['badges', 'history', 'journey'].includes(rawTabParam)
    ? (rawTabParam as 'badges' | 'history' | 'journey')
    : 'overview';

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
          {/* CASE 4: Other Traveler — Public Passport Display */}
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
              <div className="space-y-6">
                {/* Facebook-style Top Cover & Header Card */}
                <section className="overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-xs">
                  {/* Cover Photo */}
                  <ProfileBanner asset={profile.cosmetics?.banner?.asset as any} seed={profile.cosmetics?.banner?.seed} className="relative h-44 sm:h-56 md:h-64 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C]">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FAF9F5_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-white/95 text-xs font-bold uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                      <Compass className="h-3.5 w-3.5 text-[#FFB703]" />
                      <span>Member since {joinedYear}</span>
                    </div>
                  </ProfileBanner>

                  {/* Header Details: Avatar overlapping cover, name, follow CTA */}
                  <div className="px-5 pb-6 sm:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
                      {/* Avatar + Main Identity Info */}
                      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
                        <div className="relative flex h-28 w-28 sm:h-36 sm:w-36 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-3xl sm:text-4xl font-black text-[#582F0E] shadow-lg ring-2 ring-[#2D6A4F]/20 overflow-hidden bg-white">
                          <CosmeticAvatar src={profile.avatar_url} name={displayName || initials} frame={profile.cosmetics?.frame} size="xl" />
                        </div>

                        <div className="space-y-1.5 pt-1 sm:pt-0 sm:pb-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#2C221E] tracking-tight">
                              <DisplayName name={displayName} title={profile.cosmetics?.title} nameColor={profile.cosmetics?.nameColor} />
                            </h1>
                            <UserBadgesRow userIdOrName={profile.id || displayName} size="md" />
                          </div>

                          <div className="flex items-center gap-2.5 flex-wrap text-xs sm:text-sm">
                            {profile.handle && (
                              <span className="font-bold text-[#2D6A4F]">@{profile.handle}</span>
                            )}
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#2D6A4F]">
                              Public Traveler
                            </span>
                            <span className="text-[#837560]">•</span>
                            <button
                              type="button"
                              onClick={() => setModalType('followers')}
                              className="font-bold text-stone-700 hover:text-[#2D6A4F] cursor-pointer"
                            >
                              <strong className="text-[#2D6A4F]">{profile.follower_count || 0}</strong> followers
                            </button>
                            <span className="text-[#837560]">•</span>
                            <button
                              type="button"
                              onClick={() => setModalType('following')}
                              className="font-bold text-stone-700 hover:text-[#2D6A4F] cursor-pointer"
                            >
                              <strong className="text-[#2D6A4F]">{profile.following_count || 0}</strong> following
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2.5 self-start sm:self-end pb-1 sm:pb-2">
                        <FollowButton
                          targetUserId={profile.id}
                          targetDisplayName={displayName}
                        />
                      </div>
                    </div>

                    {/* Bio & Status Bar */}
                    <div className="mt-5 pt-4 border-t border-[#F2EFE9] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="max-w-2xl space-y-1.5">
                        {profile.status_text && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs font-semibold text-[#582F0E] italic">
                            <span className="text-[#FFB703] font-serif text-sm leading-none">&ldquo;</span>
                            <span>{profile.status_text}</span>
                            <span className="text-[#FFB703] font-serif text-sm leading-none">&rdquo;</span>
                          </div>
                        )}
                        {profile.bio ? (
                          <p className="text-[var(--color-text-secondary)] leading-relaxed">
                            {profile.bio}
                          </p>
                        ) : (
                          <p className="text-[var(--color-text-muted)] italic text-xs">
                            This traveler has not added a public bio yet.
                          </p>
                        )}
                      </div>

                      {/* Compact Level Gauge */}
                      <ProfileXpBar
                        level={scoutLevel}
                        label="Scout"
                        xp={scoutRep}
                        xpUnit="Rep"
                        progressPercent={scoutLevelProgress}
                      />
                    </div>

                    {/* Navigation tabs row (Facebook style with GSAP Flip tab glider) */}
                    <ProfileTabGlider
                      cleanParam={cleanParam}
                      activePanel={activePanel}
                      isOwner={false}
                      sampleBadgesCount={SAMPLE_USER_BADGES.length}
                    />
                  </div>
                </section>

                {/* Sub-body Content: Left Intro & Right Feed (Facebook style 4:8) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Intro & Credentials (4 cols) */}
                  <div className="lg:col-span-4 space-y-5">
                    {/* Intro / Credentials Card */}
                    <div className="theme-card p-5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                        <span>Intro &amp; Credentials</span>
                      </div>
                      <div className="divide-y divide-[#F2EFE9] text-xs">
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#837560]">Base Region</span>
                          <span className="font-bold text-[#2C221E]">Pangasinan, Region 1</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#837560]">Verification Engine</span>
                          <span className="font-bold text-[#2D6A4F] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Haversine GPS (&le;100m)
                          </span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#837560]">Explorer Status</span>
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            Active &amp; Verified
                          </span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#837560]">Joined JuanDerQuest</span>
                          <span className="font-bold text-[#2C221E]">{joinedYear}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Dynamic Feed / Subpage Panels (8 cols) */}
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

                  {/* SUBPAGE PANEL: Badges View */}
                  {activePanel === 'badges' && (
                    <section className="bg-white rounded-3xl border border-[var(--color-border-default)] p-5 sm:p-7 shadow-xs space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border-default)]">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${cleanParam}`}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                              title="Back to profile overview"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <Award className="w-5 h-5 text-[var(--color-brand-primary)]" />
                            <h2 className="text-base sm:text-lg font-black text-[var(--color-brand-brown)]">
                              All Badges &amp; Achievements
                            </h2>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1 ml-8">
                            Verified destination achievements and Eco-Quest milestones. Click any badge to inspect requirements.
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
                              {tab === 'all' ? 'All' : tab === 'nft' ? 'Featured' : tab === 'civic' ? 'Civic' : 'Eco-Quests'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Full Badges Grid */}
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
                              <span>{badge.network || 'Verified'}</span>
                              <span className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                Inspect <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* OVERVIEW MODE: Compact Badges Card + Activity + Journey */}
                  {activePanel === 'overview' && (
                    <>
                      {/* Compact Badges Teaser Card */}
                      <section className="bg-white rounded-3xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-default)]">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-[var(--color-brand-primary)]" />
                            <div>
                              <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                                {COPY.badge.titlePlural}
                              </h2>
                              <p className="text-[11px] text-[var(--color-text-muted)]">
                                {sharedBadges?.length || 3} verified badges collected
                              </p>
                            </div>
                          </div>
                          <Link
                            href={`/profile/${cleanParam}?tab=badges`}
                            className="text-xs font-bold text-[var(--color-brand-primary)] hover:underline flex items-center gap-1 group"
                          >
                            <span>View All Badges ({SAMPLE_USER_BADGES.length})</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>

                        {/* Top 3-4 Badges Compact Preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {SAMPLE_USER_BADGES.slice(0, 3).map((badge) => (
                            <div
                              key={badge.id}
                              onClick={() => setSelectedBadgeModal(badge)}
                              className="p-3 rounded-2xl border border-[#E3DFD5] hover:border-[#2D6A4F] bg-white hover:bg-[#FAF9F5]/80 transition cursor-pointer flex items-center gap-2.5 group"
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${badge.themeColor.bg} ${badge.themeColor.border} shadow-2xs`}>
                                <span>{badge.icon}</span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-[#2C221E] group-hover:text-[#2D6A4F] transition truncate">
                                  {badge.name}
                                </h4>
                                <span className="text-[10px] text-[#837560] capitalize font-medium">
                                  {badge.rarity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Public Verified Badges (From Social API) */}
                      <section className="bg-white rounded-3xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-default)]">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[var(--color-brand-primary)]" />
                            <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                              Verified Eco-Quest Accomplishments
                            </h2>
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                            Check-in History
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
                                  <div className="text-[10px] text-emerald-700 capitalize">{b.category} Eco-Quest</div>
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
                    </>
                  )}
                </div>
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
            const rawHandle = myProfile?.handle?.trim() || user.handle?.trim() || user.seedId?.trim() || 'traveler';
            const isAutoGuestHandle = /^(guest|traveler)-[0-9a-f-]{8,}/i.test(rawHandle);
            const cleanHandleText = isAutoGuestHandle ? 'guest' : rawHandle.replace(/^@/, '');
            const initials = displayName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() || '')
              .join('') || 'ME';
            const joinedYear = myProfile?.created_at ? new Date(myProfile.created_at).getFullYear() : 2026;
            const currentXp = user.points ?? 0;
            const currentLevel = Math.floor(currentXp / 50) + 1;
            const xpInLevel = currentXp % 50;
            const nextLevelProgress = Math.min(100, Math.round((xpInLevel / 50) * 100));
            const earnedBadgeSet = new Set<string>(
              submissions.filter((s) => s.status === 'approved').length > 0 || currentXp > 0
                ? activeBadgeIds
                : []
            );

            return (
              <div className="space-y-6">
                {/* Facebook-style Top Cover & Identity Card */}
                <section className="overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-xs">
                  {/* Cover Photo */}
                  <ProfileBanner asset={(myProfile?.cosmetics ?? user.cosmetics)?.banner?.asset as any} seed={(myProfile?.cosmetics ?? user.cosmetics)?.banner?.seed} className="relative h-44 sm:h-56 md:h-64 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C]">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FAF9F5_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-white/95 text-xs font-bold uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                      <Compass className="h-3.5 w-3.5 text-[#FFB703]" />
                      <span>Your Passport · Member {joinedYear}</span>
                    </div>
                  </ProfileBanner>

                  {/* Header Details: Avatar overlapping cover, name, actions */}
                  <div className="px-5 pb-6 sm:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
                      {/* Avatar + Main Identity Info */}
                      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
                        <div className="relative flex h-28 w-28 sm:h-36 sm:w-36 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-3xl sm:text-4xl font-black text-[#582F0E] shadow-lg ring-2 ring-[#2D6A4F]/20 overflow-hidden bg-white">
                          <CosmeticAvatar src={user.avatarUrl} name={displayName || initials || 'ME'} frame={(myProfile?.cosmetics ?? user.cosmetics)?.frame} size="xl" />
                        </div>

                        <div className="space-y-1.5 pt-1 sm:pt-0 sm:pb-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#2C221E] tracking-tight">
                              <DisplayName name={displayName} title={(myProfile?.cosmetics ?? user.cosmetics)?.title} nameColor={(myProfile?.cosmetics ?? user.cosmetics)?.nameColor} />
                            </h1>
                            <UserBadgesRow isCurrentUser size="md" />
                          </div>

                          <div className="flex items-center gap-2.5 flex-wrap text-xs sm:text-sm">
                            <span className="font-bold text-[var(--color-brand-primary)]">
                              @{cleanHandleText}
                            </span>
                            {isAutoGuestHandle && (
                              <Link
                                href="/settings"
                                className="text-[11px] font-bold text-[#B45309] hover:underline"
                              >
                                Set your username →
                              </Link>
                            )}
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${
                                myProfile?.is_public
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-stone-100 text-stone-600 border-stone-200'
                              }`}
                            >
                              {myProfile?.is_public ? 'Public' : 'Private'}
                            </span>
                            {myProfile && (
                              <>
                                <span className="text-[#837560]">•</span>
                                <button
                                  type="button"
                                  onClick={() => setModalType('followers')}
                                  className="font-bold text-stone-700 hover:text-[var(--color-brand-primary)] cursor-pointer"
                                >
                                  <strong className="text-[var(--color-brand-primary)]">{myProfile.follower_count}</strong> followers
                                </button>
                                <span className="text-[#837560]">•</span>
                                <button
                                  type="button"
                                  onClick={() => setModalType('following')}
                                  className="font-bold text-stone-700 hover:text-[var(--color-brand-primary)] cursor-pointer"
                                >
                                  <strong className="text-[var(--color-brand-primary)]">{myProfile.following_count}</strong> following
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2.5 self-start sm:self-end pb-1 sm:pb-2">
                        <Link
                          href="/settings"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)] text-xs font-extrabold text-[var(--color-brand-brown)] shadow-xs transition cursor-pointer hover:bg-[var(--color-bg-subtle)]"
                        >
                          <Settings className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                          <span>Edit Profile</span>
                        </Link>

                        {adminDashboardUrl && (
                          <a
                            href={adminDashboardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-900 transition"
                          >
                            <span>Admin</span>
                            <span className="text-[10px]">↗</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => void logout()}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-transparent text-xs font-bold text-stone-700 transition cursor-pointer"
                          title="Sign Out"
                        >
                          <LogOut className="w-3.5 h-3.5 text-red-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>

                    {/* Bio & Status Bar */}
                    <div className="mt-5 pt-4 border-t border-[#F2EFE9] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="max-w-2xl space-y-1.5">
                        {myProfile?.status_text && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs font-semibold text-[#582F0E] italic">
                            <span className="text-[#FFB703] font-serif text-sm leading-none">&ldquo;</span>
                            <span>{myProfile.status_text}</span>
                            <span className="text-[#FFB703] font-serif text-sm leading-none">&rdquo;</span>
                          </div>
                        )}
                        {myProfile?.bio ? (
                          <p className="text-[var(--color-text-secondary)] leading-relaxed">
                            {myProfile.bio}
                          </p>
                        ) : (
                          <p className="text-[var(--color-text-muted)] italic text-xs">
                            No public bio set. Go to{' '}
                            <Link href="/settings" className="font-bold text-[var(--color-brand-primary)] underline">
                              Settings
                            </Link>{' '}
                            to write your traveler bio.
                          </p>
                        )}
                      </div>

                      {/* Compact Level Gauge */}
                      <ProfileXpBar
                        level={currentLevel}
                        label="Explorer"
                        xp={currentXp}
                        progressPercent={nextLevelProgress}
                      />
                    </div>

                    {/* Navigation tabs row (Facebook style with GSAP Flip tab glider) */}
                    <ProfileTabGlider
                      cleanParam={cleanParam}
                      activePanel={activePanel}
                      isOwner={true}
                      sampleBadgesCount={SAMPLE_USER_BADGES.length}
                    />
                  </div>
                </section>

                {/* Sub-body Content: Left Intro & Right Feed (Facebook style 4:8) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Intro & Quick Info (4 cols) */}
                  <div className="lg:col-span-4 space-y-5">
                    {/* Intro / Credentials Card */}
                    <div className="theme-card p-5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                        <span>Intro &amp; Passport</span>
                      </div>
                      <div className="divide-y divide-[#F2EFE9] text-xs">
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#837560]">Base Region</span>
                          <span className="font-bold text-[#2C221E]">Pangasinan, Region 1</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#837560]">Verification Engine</span>
                          <span className="font-bold text-[#2D6A4F] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Haversine GPS (&le;100m)
                          </span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#837560]">Profile Visibility</span>
                          <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${myProfile?.is_public ? 'text-emerald-800 bg-emerald-50' : 'text-stone-700 bg-stone-100'}`}>
                            {myProfile?.is_public ? 'Public to Travelers' : 'Private'}
                          </span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#837560]">Joined JuanDerQuest</span>
                          <span className="font-bold text-[#2C221E]">{joinedYear}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Passport Showcase, Badges & Activity (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Top 4 Metrics Ribbon: Points · XP · Streak · Destinations */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {/* Points Balance */}
                      <div className="theme-card p-4 text-center">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div className="text-xl font-black text-[#2D6A4F]">
                          {wallet ? formatPoints(wallet.balanceMjdq) : formatPoints(0)}
                        </div>
                        <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                          {COPY.points.balanceLabel}
                        </div>
                      </div>

                      {/* XP */}
                      <div className="theme-card p-4 text-center">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                          <Award className="w-4 h-4" />
                        </div>
                        <div className="text-xl font-black text-[#582F0E]">
                          {formatXp(currentXp)}
                        </div>
                        <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                          {COPY.xp.unit} · Lv. {currentLevel}
                        </div>
                      </div>

                      {/* Streak */}
                      <div className="theme-card p-4 text-center">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                          <Flame className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="text-xl font-black text-orange-950">
                          {engagement?.streak.current ?? 0} Days
                        </div>
                        <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                          Streak
                        </div>
                      </div>

                      {/* Unique Destinations */}
                      <div className="theme-card p-4 text-center">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                          <Compass className="w-4 h-4 text-purple-700" />
                        </div>
                        <div className="text-xl font-black text-purple-950">
                          {engagement?.impact.unique_destinations ?? approvedCategories.size}
                        </div>
                        <div className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                          Destinations
                        </div>
                      </div>
                    </div>

                  {/* SUBPAGE PANEL: Badges View */}
                  {activePanel === 'badges' && (
                    <section className="bg-white rounded-3xl border border-[var(--color-border-default)] p-5 sm:p-7 shadow-xs space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border-default)]">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${cleanParam}`}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                              title="Back to profile overview"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <Award className="w-5 h-5 text-[var(--color-brand-primary)]" />
                            <h2 className="text-base sm:text-lg font-black text-[var(--color-brand-brown)]">
                              All Badges &amp; Achievements
                            </h2>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#2D6A4F] border border-emerald-200">
                              Earned ({earnedBadgeSet.size}) · Locked ({SAMPLE_USER_BADGES.length - earnedBadgeSet.size})
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1 ml-8">
                            {earnedBadgeSet.size === 0
                              ? 'Complete your first Eco-Quest or destination check-in to unlock your first badge.'
                              : 'Tap any badge to inspect achievement requirements and pin up to 3 badges to your nametag.'}
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
                              {tab === 'all' ? 'All' : tab === 'nft' ? 'Featured' : tab === 'civic' ? 'Civic' : 'Eco-Quests'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Full Badges Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                        {filteredBadges.map((badge) => {
                          const isPinned = activeBadgeIds.includes(badge.id);
                          const isUnlocked = earnedBadgeSet.has(badge.id);
                          return (
                            <div
                              key={badge.id}
                              onClick={() => setSelectedBadgeModal(badge)}
                              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group ${
                                isPinned
                                  ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-400/30'
                                  : isUnlocked
                                  ? 'bg-white border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-[#FAF9F5]/70'
                                  : 'bg-stone-50/75 border-[#E3DFD5] opacity-80 hover:opacity-100'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border ${badge.themeColor.bg} ${badge.themeColor.border} shadow-2xs ${!isUnlocked ? 'grayscale' : ''}`}>
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
                                  {!isUnlocked && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-stone-500">
                                      <Lock className="w-2.5 h-2.5" /> Locked
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3">
                                <h4 className="text-xs sm:text-sm font-black text-[#2C221E] group-hover:text-[#2D6A4F] transition truncate">
                                  {badge.name}
                                </h4>
                                <p className="text-[11px] text-[#837560] line-clamp-2 mt-1 leading-relaxed">
                                  {isUnlocked ? badge.description : badge.howToEarn || badge.description}
                                </p>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-[#F2EFE9] flex items-center justify-between text-[10px] font-bold">
                                {isPinned ? (
                                  <span className="text-amber-800 flex items-center gap-1 font-extrabold">
                                    <Check className="w-3 h-3 text-emerald-600" /> Active on Nametag
                                  </span>
                                ) : (
                                  <span className="text-[#837560]">
                                    {isUnlocked ? 'Tap to pin' : 'How to unlock'}
                                  </span>
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
                  )}

                  {/* OVERVIEW MODE: Compact Badges Card + Journey + Submissions */}
                  {activePanel === 'overview' && (
                    <>
                      {/* Compact Badges Teaser Card */}
                      <section className="bg-white rounded-3xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-default)]">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-[var(--color-brand-primary)]" />
                            <div>
                              <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                                {COPY.badge.titlePlural}
                              </h2>
                              <p className="text-[11px] text-[var(--color-text-muted)]">
                                Earned ({earnedBadgeSet.size}) · Locked ({SAMPLE_USER_BADGES.length - earnedBadgeSet.size})
                              </p>
                            </div>
                          </div>
                          <Link
                            href={`/profile/${cleanParam}?tab=badges`}
                            className="text-xs font-bold text-[var(--color-brand-primary)] hover:underline flex items-center gap-1 group"
                          >
                            <span>View All Badges ({SAMPLE_USER_BADGES.length})</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>

                        {/* Top 3-4 Badges Compact Preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {SAMPLE_USER_BADGES.slice(0, 3).map((badge) => {
                            const isPinned = activeBadgeIds.includes(badge.id);
                            const isUnlocked = earnedBadgeSet.has(badge.id);
                            return (
                              <div
                                key={badge.id}
                                onClick={() => setSelectedBadgeModal(badge)}
                                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center gap-2.5 group ${
                                  isPinned
                                    ? 'bg-amber-50/50 border-amber-300'
                                    : isUnlocked
                                    ? 'bg-white border-[#E3DFD5] hover:border-[#2D6A4F] hover:bg-[#FAF9F5]/80'
                                    : 'bg-stone-50/80 border-[#E3DFD5] opacity-80 hover:opacity-100'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${badge.themeColor.bg} ${badge.themeColor.border} shadow-2xs ${!isUnlocked ? 'grayscale' : ''}`}>
                                  <span>{badge.icon}</span>
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-[#2C221E] group-hover:text-[#2D6A4F] transition truncate">
                                    {badge.name}
                                  </h4>
                                  <div className="flex items-center gap-1 text-[10px]">
                                    <span className="text-[#837560] capitalize font-medium">
                                      {badge.rarity}
                                    </span>
                                    {isPinned && (
                                      <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                        Pinned
                                      </span>
                                    )}
                                  </div>
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
                    </>
                  )}
                </div>
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
                          Verified Badge
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mt-0.5">
                      {selectedBadgeModal.rarity} Rarity
                    </p>
                  </div>
                </div>

                <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E3DFD5] space-y-2 text-xs text-[#582F0E]">
                  <p className="leading-relaxed">{selectedBadgeModal.description}</p>
                  {selectedBadgeModal.howToEarn && (
                    <p className="text-[11px] text-[#837560] pt-2 border-t border-[#E3DFD5]/70">
                      <strong className="text-[#582F0E]">How to earn:</strong> {selectedBadgeModal.howToEarn}
                    </p>
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
