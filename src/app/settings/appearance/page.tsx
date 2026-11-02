'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { User } from 'lucide-react';

export default function AppearanceSettingsPage() {
  const { user } = useAuth();

  return (
    <SettingsSubpage
      title="Appearance"
      description="Preview and equip cosmetics you own."
    >
      {user ? (
        <AppearanceSection
          name={user.displayName || 'Explorer'}
          avatar={user.avatarUrl || ''}
        />
      ) : (
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
      )}
    </SettingsSubpage>
  );
}
