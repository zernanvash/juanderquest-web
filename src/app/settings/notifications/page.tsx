'use client';

import React, { useState, useEffect } from 'react';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import {
  readPreferences,
  savePreference,
} from '@/lib/settings-preferences';
import { Bell } from 'lucide-react';

export default function NotificationsSettingsPage() {
  const [notifyQuests, setNotifyQuests] = useState(true);
  const [notifyDao, setNotifyDao] = useState(true);
  const [notifyRewards, setNotifyRewards] = useState(true);

  useEffect(() => {
    const prefs = readPreferences();
    setNotifyQuests(prefs.notifyQuests);
    setNotifyDao(prefs.notifyDao);
    setNotifyRewards(prefs.notifyRewards);
  }, []);

  const handleToggleQuests = (val: boolean) => {
    setNotifyQuests(val);
    savePreference('notifyQuests', val);
  };

  const handleToggleDao = (val: boolean) => {
    setNotifyDao(val);
    savePreference('notifyDao', val);
  };

  const handleToggleRewards = (val: boolean) => {
    setNotifyRewards(val);
    savePreference('notifyRewards', val);
  };

  return (
    <SettingsSubpage
      title="Notification Preferences"
      description="Control which events trigger in-app updates and alert badges."
    >
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
                Eco-Quests &amp; Reward Bounties
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Alerts for newly published Pangasinan Eco-Quests and bonus point bounties.
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
                JuanChoice Community Proposals
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
                Merchant Voucher &amp; Reward Perks
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
    </SettingsSubpage>
  );
}
