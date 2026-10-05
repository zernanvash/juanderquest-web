'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  fetchMyProfile,
  updateMyProfile,
  type AuthenticatedUserProfile,
} from '@/lib/social';
import { fetchMyEngagement, updateAchievementSharing } from '@/lib/engagement';
import {
  User,
  Settings as SettingsIcon,
  Bell,
  MapPin,
  Shield,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
  Volume2,
  VolumeX,
  Compass,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, wallet, logout } = useAuth();

  // Profile data state
  const [profileData, setProfileData] = useState<AuthenticatedUserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [shareAchievements, setShareAchievements] = useState(false);

  // Notification Preferences
  const [notifyQuests, setNotifyQuests] = useState(true);
  const [notifyDao, setNotifyDao] = useState(true);
  const [notifyRewards, setNotifyRewards] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highContrastMap, setHighContrastMap] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Load preferences from localStorage & API
  const loadSettings = useCallback(async () => {
    setLoading(true);

    // Load local device preferences
    try {
      const storedPrefs = localStorage.getItem('juanderquest_preferences');
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs);
        if (typeof parsed.notifyQuests === 'boolean') setNotifyQuests(parsed.notifyQuests);
        if (typeof parsed.notifyDao === 'boolean') setNotifyDao(parsed.notifyDao);
        if (typeof parsed.notifyRewards === 'boolean') setNotifyRewards(parsed.notifyRewards);
        if (typeof parsed.soundEnabled === 'boolean') setSoundEnabled(parsed.soundEnabled);
        if (typeof parsed.highContrastMap === 'boolean') setHighContrastMap(parsed.highContrastMap);
      }
    } catch {
      // ignore JSON parse errors
    }

    if (user) {
      try {
        const [profile, engagement] = await Promise.allSettled([
          fetchMyProfile(),
          fetchMyEngagement(),
        ]);

        if (profile.status === 'fulfilled' && profile.value) {
          const p = profile.value;
          setProfileData(p);
          setDisplayName(p.display_name || user.displayName || '');
          setHandle(p.handle ? p.handle.replace(/^@/, '') : '');
          setBio(p.bio || '');
          setStatusText(p.status_text || '');
          setIsPublic(p.is_public);
        } else if (user) {
          setDisplayName(user.displayName || '');
        }

        if (engagement.status === 'fulfilled') {
          setShareAchievements(engagement.value.share_achievements);
        }
      } catch {
        // Fallback to user auth info
        setDisplayName(user.displayName || '');
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Save device preferences to localStorage
  const handleSavePref = (key: string, value: boolean) => {
    try {
      const existing = localStorage.getItem('juanderquest_preferences');
      const parsed = existing ? JSON.parse(existing) : {};
      parsed[key] = value;
      localStorage.setItem('juanderquest_preferences', JSON.stringify(parsed));
    } catch {
      // ignore
    }
  };

  const handleToggleQuests = (val: boolean) => {
    setNotifyQuests(val);
    handleSavePref('notifyQuests', val);
  };

  const handleToggleDao = (val: boolean) => {
    setNotifyDao(val);
    handleSavePref('notifyDao', val);
  };

  const handleToggleRewards = (val: boolean) => {
    setNotifyRewards(val);
    handleSavePref('notifyRewards', val);
  };

  const handleToggleSound = (val: boolean) => {
    setSoundEnabled(val);
    handleSavePref('soundEnabled', val);
  };

  const handleToggleMap = (val: boolean) => {
    setHighContrastMap(val);
    handleSavePref('highContrastMap', val);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const res = await updateMyProfile({
        display_name: displayName.trim(),
        handle: handle.trim() ? handle.trim().replace(/^@/, '') : undefined,
        bio: bio.trim(),
        status_text: statusText.trim(),
        is_public: isPublic,
      });

      if (res.success && res.profile) {
        setProfileData(res.profile);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 4000);
      } else {
        setProfileError(res.error?.message || 'Failed to update profile settings.');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to update profile settings. Please try again.';
      setProfileError(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleShareAchievements = async (val: boolean) => {
    setShareAchievements(val);
    try {
      await updateAchievementSharing(val);
    } catch {
      // revert on failure
      setShareAchievements(!val);
    }
  };

  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('juanderquest_cached_explore');
      localStorage.removeItem('juanderquest_read_notif_ids');
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <ErrorBoundary>
      <Navigation>
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-default)] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--color-brand-brown)]">
                  Explorer Settings
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                Manage your traveler profile, notification preferences, and application settings.
              </p>
            </div>

            {user && (
              <Link
                href={user.handle ? `/profile/${user.handle.replace(/^@/, '')}` : `/profile/${user.seedId || user.id}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-xs font-bold text-[var(--color-brand-brown)] hover:border-[var(--color-brand-primary)]/50 transition self-start sm:self-auto"
              >
                <User className="w-4 h-4 text-[var(--color-brand-primary)]" />
                <span>View Full Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-primary)]" />
              <p className="mt-3 text-xs text-[var(--color-text-muted)] font-medium">
                Loading traveler settings...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Profile & Identity Section */}
              {user ? (
                <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border-default)]">
                    <User className="w-5 h-5 text-[var(--color-brand-primary)]" />
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                        Profile & Social Identity
                      </h2>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        Customize how you appear to other JuanDerQuest explorers.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                    {profileSuccess && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Settings saved successfully!</span>
                      </div>
                    )}

                    {profileError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{profileError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--color-brand-brown)] mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          maxLength={50}
                          required
                          className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3.5 py-2 text-xs sm:text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] outline-none min-h-[42px]"
                          placeholder="Your traveler name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[var(--color-brand-brown)] mb-1">
                          Explorer Handle (@)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">
                            @
                          </span>
                          <input
                            type="text"
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            maxLength={30}
                            className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] pl-7 pr-3.5 py-2 text-xs sm:text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] outline-none min-h-[42px]"
                            placeholder="username"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--color-brand-brown)] mb-1">
                        Current Status
                      </label>
                      <input
                        type="text"
                        value={statusText}
                        onChange={(e) => setStatusText(e.target.value)}
                        maxLength={120}
                        className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3.5 py-2 text-xs sm:text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] outline-none min-h-[42px]"
                        placeholder="e.g. Exploring Bolinao Cape & Alaminos trails 🌊"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--color-brand-brown)] mb-1">
                        Public Bio
                      </label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={300}
                        className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3.5 py-2 text-xs sm:text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] outline-none"
                        placeholder="Tell the community about your Pangasinan adventures..."
                      />
                    </div>

                    {/* Privacy Toggles */}
                    <div className="pt-2 border-t border-[var(--color-border-default)]/60 space-y-3">
                      <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--color-bg-subtle)] transition">
                        <div>
                          <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                            Public Explorer Profile
                          </span>
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            Allow other travelers to follow your updates and view your public check-ins.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isPublic}
                          onChange={(e) => setIsPublic(e.target.checked)}
                          className="w-5 h-5 accent-[var(--color-brand-primary)] rounded cursor-pointer shrink-0"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--color-bg-subtle)] transition">
                        <div>
                          <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                            Share Achievement Badges Publicly
                          </span>
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            Display your verified destination badges and Soulbound tokens on your public card.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={shareAchievements}
                          onChange={(e) => void handleToggleShareAchievements(e.target.checked)}
                          className="w-5 h-5 accent-[var(--color-brand-primary)] rounded cursor-pointer shrink-0"
                        />
                      </label>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-extrabold hover:bg-[var(--color-brand-primary-hover)] transition cursor-pointer shadow-xs disabled:opacity-50 min-h-[42px]"
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Save Changes</span>
                        )}
                      </button>
                    </div>
                  </form>
                </section>
              ) : (
                <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-6 shadow-xs text-center">
                  <User className="w-10 h-10 text-[var(--color-brand-primary)] mx-auto mb-2 opacity-80" />
                  <h2 className="text-base font-black text-[var(--color-brand-brown)]">
                    Traveler Sign-In Required
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto mt-1 mb-4">
                    Connect your wallet or login to synchronize your Pangasinan explorer profile, preferences, and mJDQ governance wallet.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-extrabold hover:bg-[var(--color-brand-primary-hover)] transition"
                  >
                    <span>Connect Wallet / Login</span>
                  </Link>
                </section>
              )}

              {/* Notification Preferences */}
              <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border-default)]">
                  <Bell className="w-5 h-5 text-[var(--color-brand-primary)]" />
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                      Notification Preferences
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Control which events trigger in-app updates and alert badges.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--color-bg-subtle)] transition">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                        Quest & Trail Bounties
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        Alerts for newly published Pangasinan quests and limited-time mJDQ bounties.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyQuests}
                      onChange={(e) => handleToggleQuests(e.target.checked)}
                      className="w-5 h-5 accent-[var(--color-brand-primary)] rounded cursor-pointer shrink-0"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--color-bg-subtle)] transition">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                        DAO Governance & Proposals
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        Notifications when new community proposals enter active voting rounds.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyDao}
                      onChange={(e) => handleToggleDao(e.target.checked)}
                      className="w-5 h-5 accent-[var(--color-brand-primary)] rounded cursor-pointer shrink-0"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--color-bg-subtle)] transition">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                        Merchant Voucher & Reward Perks
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        Updates when Pangasinan merchant vouchers or tier discounts become available.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyRewards}
                      onChange={(e) => handleToggleRewards(e.target.checked)}
                      className="w-5 h-5 accent-[var(--color-brand-primary)] rounded cursor-pointer shrink-0"
                    />
                  </label>
                </div>
              </section>

              {/* Map & Sensory Preferences */}
              <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border-default)]">
                  <MapPin className="w-5 h-5 text-[var(--color-brand-primary)]" />
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                      Map & Audio Experience
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Configure your navigation raster layer and auditory feedback.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--color-bg-subtle)] transition">
                    <div className="flex items-center gap-2.5">
                      {soundEnabled ? (
                        <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-stone-400 shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                          Audio Check-in Feedback
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          Play gentle audio chime upon successful GPS proof verification.
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => handleToggleSound(e.target.checked)}
                      className="w-5 h-5 accent-[var(--color-brand-primary)] rounded cursor-pointer shrink-0"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--color-bg-subtle)] transition">
                    <div className="flex items-center gap-2.5">
                      <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                          High-Contrast Map Routing
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          Enhance waypoint visibility on sovereign OpenStreetMap raster tiles.
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={highContrastMap}
                      onChange={(e) => handleToggleMap(e.target.checked)}
                      className="w-5 h-5 accent-[var(--color-brand-primary)] rounded cursor-pointer shrink-0"
                    />
                  </label>
                </div>
              </section>

              {/* Data, Cache & Session Section */}
              <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border-default)]">
                  <Shield className="w-5 h-5 text-[var(--color-brand-primary)]" />
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                      Storage & Session Management
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Manage client-side cache and authentication session.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]/60">
                    <div>
                      <span className="text-xs font-bold text-[var(--color-brand-brown)] block">
                        Clear Offline Cache
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        Purge locally cached spot previews, map tile buffers, and read notification tags.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[var(--color-border-default)] text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer self-start sm:self-auto min-h-[38px]"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-stone-500" />
                      <span>{cacheCleared ? 'Cache Cleared!' : 'Clear Cache'}</span>
                    </button>
                  </div>

                  {user && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100">
                      <div>
                        <span className="text-xs font-bold text-red-900 block">
                          Explorer Sign Out
                        </span>
                        <span className="text-[11px] text-red-700/80">
                          Securely disconnect your wallet session on this device.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void logout()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer self-start sm:self-auto min-h-[38px]"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </Navigation>
    </ErrorBoundary>
  );
}
