'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import { OnChainBadges } from '@/components/OnChainBadges';
import { ChainReadiness } from '@/components/ChainReadiness';
import { getActiveNametagBadgeIds } from '@/lib/badges';

export default function WalletSettingsPage() {
  const { user, refreshProfile } = useAuth();
  const [activeBadgeIds, setActiveBadgeIds] = useState<string[]>([]);

  useEffect(() => {
    setActiveBadgeIds(getActiveNametagBadgeIds());
  }, []);

  return (
    <SettingsSubpage
      title="Wallet & On-Chain Badges"
      description="Manage your connected wallet, Soulbound Badges, and cryptographic telemetry."
    >
      <div className="space-y-6">
        <OnChainBadges onWalletChanged={() => void refreshProfile()} />

        <details className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-sm font-black text-[var(--color-brand-brown)]">
            <span>Advanced &amp; Verification Telemetry</span>
            <span className="text-xs font-bold text-[var(--color-brand-primary)]">Show / Hide</span>
          </summary>
          <div className="mt-4 pt-4 border-t border-[var(--color-border-default)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">GPS Validation Engine</span>
                <span className="font-bold text-[var(--color-text-primary)]">Haversine &le; 100m</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Active Nametag Badges</span>
                <span className="font-bold text-[var(--color-brand-primary)]">
                  {activeBadgeIds.length} / 3 Selected
                </span>
              </div>
            </div>
            <ChainReadiness signedInSeedId={user?.seedId} />
          </div>
        </details>
      </div>
    </SettingsSubpage>
  );
}
