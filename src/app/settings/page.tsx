'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { fetchMerchantMe } from '@/lib/api';
import { SettingsRow } from '@/components/settings/SettingsRow';
import {
  Settings as SettingsIcon,
  User,
  Award,
  Sparkles,
  Wallet,
  FileText,
  Store,
  Bell,
  Compass,
  Info,
  Shield,
  LogOut,
  ExternalLink,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [hasMerchantOwnership, setHasMerchantOwnership] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (user) {
      fetchMerchantMe()
        .then((me) => {
          if (active && me.has_merchant) {
            setHasMerchantOwnership(true);
          }
        })
        .catch(() => {});
    } else {
      setHasMerchantOwnership(false);
    }
    return () => {
      active = false;
    };
  }, [user]);

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
                href={
                  user.handle
                    ? `/profile/${user.handle.replace(/^@/, '')}`
                    : `/profile/${user.seedId || user.id}`
                }
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-xs font-bold text-[var(--color-brand-brown)] hover:border-[var(--color-brand-primary)]/50 transition self-start sm:self-auto min-h-[38px]"
              >
                <User className="w-4 h-4 text-[var(--color-brand-primary)]" />
                <span>View Full Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
              </Link>
            )}
          </div>

          {/* Signed-out notice card */}
          {!user && (
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand-primary)] text-white text-xs font-extrabold hover:bg-[var(--color-brand-primary-hover)] transition min-h-[40px]"
              >
                <span>Sign In</span>
              </Link>
            </section>
          )}

          <div className="space-y-6">
            {/* Account Group (signed-in only) */}
            {user && (
              <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 sm:p-5 shadow-xs">
                <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] px-1 mb-2">
                  Account
                </h2>
                <div className="divide-y divide-[var(--color-border-default)]/60">
                  <SettingsRow
                    icon={User}
                    title="Profile"
                    description="Manage display name, handle, bio, and social visibility."
                    href="/settings/profile"
                  />
                  <SettingsRow
                    icon={Award}
                    title="Nametag badges"
                    description="Select up to 3 badges to feature next to your handle."
                    href="/settings/badges"
                  />
                  <SettingsRow
                    icon={Sparkles}
                    title="Appearance"
                    description="Preview and equip banners, frames, and cosmetics."
                    href="/settings/appearance"
                  />
                  <SettingsRow
                    icon={Wallet}
                    title="Wallet & on-chain badges"
                    description="Connect Web3 wallet and review Soulbound Badges."
                    href="/settings/wallet"
                  />
                </div>
              </section>
            )}

            {/* Activity Group (signed-in only) */}
            {user && (
              <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 sm:p-5 shadow-xs">
                <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] px-1 mb-2">
                  Activity
                </h2>
                <div className="divide-y divide-[var(--color-border-default)]/60">
                  <SettingsRow
                    icon={FileText}
                    title="My submissions"
                    description="View and manage your contributed tourist spots."
                    href="/history"
                  />
                  {hasMerchantOwnership ? (
                    <SettingsRow
                      icon={Store}
                      title="Merchant dashboard"
                      description="Manage merchant spots, vouchers, and redemptions."
                      href="/merchant"
                    />
                  ) : (
                    <SettingsRow
                      icon={Store}
                      title="Merchant hub"
                      description="Partner with JuanDerQuest and claim merchant spots."
                      href="/affiliate"
                    />
                  )}
                </div>
              </section>
            )}

            {/* Preferences Group */}
            <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 sm:p-5 shadow-xs">
              <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] px-1 mb-2">
                Preferences
              </h2>
              <div className="divide-y divide-[var(--color-border-default)]/60">
                <SettingsRow
                  icon={Bell}
                  title="Notifications"
                  description="Control alerts for quests, proposals, and vouchers."
                  href="/settings/notifications"
                />
                <SettingsRow
                  icon={Compass}
                  title="Map & audio"
                  description="Configure audio chimes and raster map contrast."
                  href="/settings/map-audio"
                />
              </div>
            </section>

            {/* About Group */}
            <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 sm:p-5 shadow-xs">
              <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] px-1 mb-2">
                About
              </h2>
              <div className="divide-y divide-[var(--color-border-default)]/60">
                <SettingsRow
                  icon={Info}
                  title="About JuanDerQuest"
                  description="Learn about the mission, authors, and capstone project."
                  href="/about"
                />
              </div>
            </section>

            {/* Storage & session Group */}
            <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-4 sm:p-5 shadow-xs">
              <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] px-1 mb-2">
                Storage & session
              </h2>
              <div className="divide-y divide-[var(--color-border-default)]/60">
                <SettingsRow
                  icon={Shield}
                  title="Storage & session"
                  description="Clear offline caches or manage session storage."
                  href="/settings/storage"
                />
              </div>
            </section>

            {/* Log out button when signed in */}
            {user && (
              <div className="pt-2 flex justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition cursor-pointer min-h-[44px] w-full sm:w-auto"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </Navigation>
    </ErrorBoundary>
  );
}
