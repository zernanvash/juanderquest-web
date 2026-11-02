'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import {
  fetchMyProfile,
  updateMyProfile,
  type AuthenticatedUserProfile,
} from '@/lib/social';
import { fetchMyEngagement, updateAchievementSharing } from '@/lib/engagement';
import {
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function ProfileSettingsPage() {
  const { user } = useAuth();

  const [, setProfileData] = useState<AuthenticatedUserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [shareAchievements, setShareAchievements] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
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
      } else {
        setDisplayName(user.displayName || '');
      }

      if (engagement.status === 'fulfilled') {
        setShareAchievements(engagement.value.share_achievements);
      }
    } catch {
      setDisplayName(user.displayName || '');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
      setShareAchievements(!val);
    }
  };

  return (
    <SettingsSubpage
      title="Profile & Social Identity"
      description="Manage your explorer profile, bio, handle, and social identity."
    >
      {!user ? (
        <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-6 shadow-xs text-center">
          <User className="w-10 h-10 text-[var(--color-brand-primary)] mx-auto mb-2 opacity-80" />
          <h2 className="text-base font-black text-[var(--color-brand-brown)]">
            Traveler Sign-In Required
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto mt-1 mb-4">
            Sign in to synchronize your Pangasinan explorer profile, preferences, and reward points.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-extrabold hover:bg-[var(--color-brand-primary-hover)] transition"
          >
            <span>Sign In</span>
          </Link>
        </section>
      ) : loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-primary)]" />
          <p className="mt-3 text-xs text-[var(--color-text-muted)] font-medium">
            Loading profile settings...
          </p>
        </div>
      ) : (
        <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border-default)]">
            <User className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <div>
              <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
                Profile &amp; Social Identity
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
                <label
                  htmlFor="settings-display-name"
                  className="block text-xs font-bold text-[var(--color-brand-brown)] mb-1"
                >
                  Display Name
                </label>
                <input
                  id="settings-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  required
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3.5 py-2 text-xs sm:text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)] min-h-[42px]"
                  placeholder="Your traveler name"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-handle"
                  className="block text-xs font-bold text-[var(--color-brand-brown)] mb-1"
                >
                  Explorer Handle (@)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">
                    @
                  </span>
                  <input
                    id="settings-handle"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    maxLength={30}
                    className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] pl-7 pr-3.5 py-2 text-xs sm:text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)] min-h-[42px]"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-status"
                className="block text-xs font-bold text-[var(--color-brand-brown)] mb-1"
              >
                Current Status
              </label>
              <input
                id="settings-status"
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                maxLength={120}
                className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3.5 py-2 text-xs sm:text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)] min-h-[42px]"
                placeholder="e.g. Exploring Bolinao Cape & Alaminos trails 🌊"
              />
            </div>

            <div>
              <label
                htmlFor="settings-bio"
                className="block text-xs font-bold text-[var(--color-brand-brown)] mb-1"
              >
                Public Bio
              </label>
              <textarea
                id="settings-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
                className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3.5 py-2 text-xs sm:text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)]"
                placeholder="Tell the community about your Pangasinan adventures..."
              />
            </div>

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
                    Display your verified destination badges and Eco-Quest achievements on your public card.
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
      )}
    </SettingsSubpage>
  );
}
