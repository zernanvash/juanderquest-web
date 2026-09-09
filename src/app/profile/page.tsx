'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { api, normalizeSubmission, SubmissionModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  fetchMyProfile,
  updateMyProfile,
  type AuthenticatedUserProfile,
} from '@/lib/social';
import { FollowListModal } from '@/components/FollowListModal';
import {
  Wallet,
  Award,
  History,
  Shield,
  Leaf,
  Utensils,
  Landmark,
  Globe,
  Users,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, wallet } = useAuth();
  const { isReady } = useRequireAuth();
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Social Profile & Settings State
  const [profileData, setProfileData] = useState<AuthenticatedUserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [statusText, setStatusText] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null);

  const fetchSubmissions = useCallback(async (forceRefresh = false) => {
    try {
      const { data: rawSubmissions } = await fetchWithCache(
        'user_submissions',
        async () => {
          const res = await api.get('/submissions');
          if (!res.data?.success) throw new Error('Submissions unavailable');
          return (res.data.data as Parameters<typeof normalizeSubmission>[0][]).map(normalizeSubmission);
        },
        { ttlMs: 60_000, forceRefresh }
      );
      setSubmissions(rawSubmissions);
    } catch (e) {
      console.error('Failed to load submission history', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadProfileSettings = useCallback(async () => {
    const profile = await fetchMyProfile();
    if (profile) {
      setProfileData(profile);
      setDisplayName(profile.display_name || '');
      setIsPublic(profile.is_public ?? false);
      setHandle(profile.handle || '');
      setBio(profile.bio || '');
      setStatusText(profile.status_text || '');
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    loadProfileSettings();
  }, [fetchSubmissions, loadProfileSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);

    // Validate handle format if provided
    const cleanHandle = handle.trim().replace(/^@/, '');
    if (cleanHandle.length > 0) {
      if (cleanHandle.length < 2 || cleanHandle.length > 30) {
        setSettingsError('Handle must be between 2 and 30 characters.');
        setSavingSettings(false);
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(cleanHandle)) {
        setSettingsError('Handle can only contain letters, numbers, and underscores.');
        setSavingSettings(false);
        return;
      }
    }

    try {
      const result = await updateMyProfile({
        display_name: displayName.trim() || undefined,
        is_public: isPublic,
        handle: cleanHandle ? cleanHandle.toLowerCase() : null,
        bio: bio.trim() || null,
        status_text: statusText.trim() || null,
      });

      if (result.success && result.profile) {
        setProfileData(result.profile);
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 4000);
      } else {
        if (result.error?.code === 'HANDLE_TAKEN') {
          setSettingsError('This handle is already taken by another traveler. Please choose a different handle.');
        } else {
          setSettingsError(result.error?.message || 'Unable to update profile settings.');
        }
      }
    } catch {
      setSettingsError('Failed to save settings due to a network connection error.');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!isReady) return null;

  const approvedCategories = new Set(
    submissions.filter((s) => s.status === 'approved').map((s) => s.category)
  );

  const badges = [
    { name: 'Eco Pioneer', icon: Leaf, desc: 'Complete an approved eco-tourism quest' },
    { name: 'Heritage Keeper', icon: Landmark, desc: 'Complete an approved cultural heritage quest' },
    { name: 'Food Explorer', icon: Utensils, desc: 'Complete an approved food & culinary quest' },
  ];

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Traveler Profile">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-3xl p-8 border border-[#D5C4AC]/40 shadow-xs text-center flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-[#FFB703] overflow-hidden bg-amber-100 flex items-center justify-center font-bold text-2xl text-[#582F0E] shadow-md mb-4">
              {user ? user.displayName.charAt(0).toUpperCase() : 'J'}
            </div>

            <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">
              {profileData?.display_name || user?.displayName || 'Traveler'}
            </h1>
            <p className="text-xs text-[#514532] mt-1">{user?.email}</p>

            {profileData?.handle && (
              <p className="text-xs font-bold text-[#2D6A4F] mt-0.5">@{profileData.handle}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3F6653]/15 text-[#3F6653] text-xs font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>{user?.role === 'admin' ? 'ADMINISTRATOR' : 'PANGASINAN EXPLORER'}</span>
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  profileData?.is_public
                    ? 'bg-emerald-50 text-[#2D6A4F] border-emerald-200'
                    : 'bg-gray-100 text-[#837560] border-gray-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{profileData?.is_public ? 'Public Profile' : 'Private Profile'}</span>
              </span>
            </div>

            {/* Social Followers / Following Bar */}
            {profileData && (
              <div className="mt-4 flex items-center gap-3 text-xs pt-3 border-t border-[#F2EFE9]">
                <button
                  type="button"
                  onClick={() => setFollowModalType('followers')}
                  className="inline-flex items-center gap-1 text-[#2C221E] hover:text-[#2D6A4F] font-bold hover:underline transition touch-manipulation min-h-[32px]"
                >
                  <Users className="h-3.5 w-3.5 text-[#2D6A4F]" />
                  <span className="text-[#2D6A4F]">{profileData.follower_count}</span>
                  <span className="text-[#837560]">Followers</span>
                </button>
                <span className="text-[#D5C4AC]">·</span>
                <button
                  type="button"
                  onClick={() => setFollowModalType('following')}
                  className="inline-flex items-center gap-1 text-[#2C221E] hover:text-[#2D6A4F] font-bold hover:underline transition touch-manipulation min-h-[32px]"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#2D6A4F]" />
                  <span className="text-[#2D6A4F]">{profileData.following_count}</span>
                  <span className="text-[#837560]">Following</span>
                </button>
              </div>
            )}
          </div>

          {/* Public Profile & Social Settings Form */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D5C4AC]/40 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F2EFE9] gap-2">
              <div>
                <h2 className="text-lg font-serif font-black text-[#582F0E]">
                  Public Profile & Discovery Settings
                </h2>
                <p className="text-xs text-[#837560] mt-0.5">
                  Control your handle, bio, and discoverability in traveler search and feeds.
                </p>
              </div>
              {profileData?.is_public && profileData?.id && (
                <Link
                  href={`/users/${encodeURIComponent(profileData.id)}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#2D6A4F] hover:underline"
                >
                  <span>View Public Passport</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {settingsError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{settingsError}</span>
              </div>
            )}

            {settingsSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-[#2D6A4F] flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#2D6A4F]" />
                <span>Profile settings saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* Visibility Toggle */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5]">
                <div className="space-y-1">
                  <label htmlFor="is_public_toggle" className="text-xs font-bold text-[#2C221E] cursor-pointer">
                    Make Profile Public
                  </label>
                  <p className="text-[11px] text-[#837560] leading-relaxed">
                    When public, other travelers can discover your passport, view your scout reputation, and follow you. Private profiles cannot follow other travelers.
                  </p>
                </div>
                <input
                  id="is_public_toggle"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-[#2D6A4F] focus:ring-[#2D6A4F] shrink-0 mt-0.5 cursor-pointer"
                />
              </div>

              {/* Display Name */}
              <div>
                <label htmlFor="display_name_input" className="block text-xs font-bold text-[#582F0E] mb-1">
                  Display Name
                </label>
                <input
                  id="display_name_input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-xl border border-[#D5C4AC] bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#2C221E] placeholder:text-gray-400 focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-hidden min-h-[44px]"
                  placeholder="Your display name"
                />
              </div>

              {/* Handle */}
              <div>
                <label htmlFor="handle_input" className="block text-xs font-bold text-[#582F0E] mb-1">
                  Unique Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#837560]">
                    @
                  </span>
                  <input
                    id="handle_input"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                    minLength={2}
                    maxLength={30}
                    className="w-full rounded-xl border border-[#D5C4AC] bg-white pl-8 pr-3.5 py-2.5 text-xs sm:text-sm text-[#2C221E] placeholder:text-gray-400 focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-hidden min-h-[44px]"
                    placeholder="handle (e.g. juan_scout)"
                  />
                </div>
                <p className="text-[10px] text-[#837560] mt-1">
                  Enables search lookup by @handle and direct URL access.
                </p>
              </div>

              {/* Status Text */}
              <div>
                <label htmlFor="status_text_input" className="block text-xs font-bold text-[#582F0E] mb-1">
                  Current Explorer Status
                </label>
                <input
                  id="status_text_input"
                  type="text"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-xl border border-[#D5C4AC] bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#2C221E] placeholder:text-gray-400 focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-hidden min-h-[44px]"
                  placeholder="e.g. Scouting Hundred Islands trails 🌊"
                />
                <div className="flex justify-end text-[10px] text-[#837560] mt-0.5">
                  {statusText.length}/120
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio_input" className="block text-xs font-bold text-[#582F0E] mb-1">
                  Public Bio
                </label>
                <textarea
                  id="bio_input"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  className="w-full rounded-xl border border-[#D5C4AC] bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#2C221E] placeholder:text-gray-400 focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-hidden"
                  placeholder="Share your favorite Pangasinan trails, local heritage tips, or culinary recommendations..."
                />
                <div className="flex justify-end text-[10px] text-[#837560] mt-0.5">
                  {bio.length}/300
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#1B4332] transition shadow-xs disabled:opacity-60 min-h-[44px]"
                >
                  {savingSettings ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Profile Settings</span>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Stats & Wallet Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#D5C4AC]/40 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2D6A4F]/15 text-[#2D6A4F] flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#837560] uppercase">mJDQ Governance Wallet</div>
                  <div className="text-sm font-extrabold text-[#2D6A4F]">
                    {wallet ? `${wallet.balanceMjdq} mJDQ (${wallet.balanceJdq} JDQ)` : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#D5C4AC]/40 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#7D5800] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#837560] uppercase">Demo Reward Points</div>
                  <div className="text-sm font-extrabold text-[#7D5800]">
                    {user ? `${user.points} PTS` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submissions Action Tile */}
          <Link
            href="/history"
            className="bg-white p-5 rounded-2xl border border-[#D5C4AC]/40 flex items-center justify-between shadow-xs hover:border-[#3F6653] transition group block"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFEEEA] text-[#7D5800] flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#582F0E]">Submissions & Proof History</div>
                <div className="text-xs text-[#837560]">
                  {loadingHistory
                    ? 'Loading proof status...'
                    : `${submissions.length} submission${submissions.length === 1 ? '' : 's'} · ${approvedCategories.size} badge${approvedCategories.size === 1 ? '' : 's'} unlocked`}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-[#3F6653] group-hover:translate-x-1 transition">View History &rarr;</span>
          </Link>

          {/* Explorer Badges — unlocked only by real approved submissions */}
          <div className="bg-white rounded-3xl p-6 border border-[#D5C4AC]/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-serif text-[#582F0E]">Explorer Achievement Badges</h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#EFEEEA] text-[#837560]">
                UNLOCKED VIA APPROVED QUESTS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {badges.map((b) => {
                const Icon = b.icon;
                const unlocked = approvedCategories.has(b.name === 'Eco Pioneer' ? 'eco' : b.name === 'Heritage Keeper' ? 'cultural' : 'food_trade');
                return (
                  <div
                    key={b.name}
                    className={`p-4 rounded-2xl border text-center flex flex-col items-center space-y-2 ${
                      unlocked
                        ? 'bg-amber-50/50 border-[#FFB703]'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                        unlocked
                          ? 'bg-[#FFB703]/20 border-[#FFB703] text-[#7D5800]'
                          : 'bg-gray-200 border-gray-300 text-gray-400'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-[#582F0E]">{b.name}</div>
                    <div className="text-[10px] text-[#837560]">{unlocked ? 'Unlocked' : b.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal for viewing followers / following */}
        {profileData && followModalType && (
          <FollowListModal
            isOpen={followModalType !== null}
            onClose={() => setFollowModalType(null)}
            userId={profileData.id}
            userName={profileData.display_name}
            type={followModalType}
            ownerView
          />
        )}
      </ErrorBoundary>
    </Navigation>
  );
}
