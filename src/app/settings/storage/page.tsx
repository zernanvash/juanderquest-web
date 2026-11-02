'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import {
  Shield,
  Trash2,
  LogOut,
} from 'lucide-react';

export default function StorageSettingsPage() {
  const { user, logout } = useAuth();
  const [cacheCleared, setCacheCleared] = useState(false);

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
    <SettingsSubpage
      title="Storage & Session Management"
      description="Manage client-side cache and authentication session."
    >
      <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border-default)]">
          <Shield className="w-5 h-5 text-[var(--color-brand-primary)]" />
          <div>
            <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)]">
              Storage &amp; Session Management
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
                  Securely disconnect your session on this device.
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
    </SettingsSubpage>
  );
}
