'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { SettingsSubpage } from '@/components/settings/SettingsSubpage';
import {
  SAMPLE_USER_BADGES,
  getActiveNametagBadgeIds,
  setActiveNametagBadgeIds,
} from '@/lib/badges';
import { UserNametag } from '@/components/Badges';
import {
  Award,
  Sparkles,
  Gem,
  Check,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function BadgesSettingsPage() {
  const { user } = useAuth();
  const [activeBadgeIds, setActiveBadgeIds] = useState<string[]>([]);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'nft' | 'achievement' | 'civic'>('all');
  const [badgeFeedback, setBadgeFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setActiveBadgeIds(getActiveNametagBadgeIds());
  }, []);

  const handleToggleBadge = (badgeId: string) => {
    let nextIds: string[];
    if (activeBadgeIds.includes(badgeId)) {
      nextIds = activeBadgeIds.filter((id) => id !== badgeId);
    } else {
      if (activeBadgeIds.length >= 3) {
        setBadgeFeedback({
          message: 'You can display up to 3 badges on your nametag. Deselect one first.',
          type: 'error',
        });
        setTimeout(() => setBadgeFeedback(null), 3500);
        return;
      }
      nextIds = [...activeBadgeIds, badgeId];
    }
    setActiveBadgeIds(nextIds);
    setActiveNametagBadgeIds(nextIds);
    setBadgeFeedback({
      message: 'Nametag badges updated! Changes are reflected immediately across posts and comments.',
      type: 'success',
    });
    setTimeout(() => setBadgeFeedback(null), 3000);
  };

  return (
    <SettingsSubpage
      title="Nametag Badges"
      description="Select up to 3 badges to display alongside your username across posts, comments, and rankings."
    >
      <section className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border-default)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[var(--color-brand-brown)] flex items-center gap-1.5 flex-wrap">
                <span>Nametag Badges</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {activeBadgeIds.length}/3 Active
                </span>
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Select up to 3 badges to display alongside your username across posts, comments, and rankings.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Toast */}
        {badgeFeedback && (
          <div
            className={`mt-4 flex items-center gap-2 p-3 rounded-xl text-xs font-semibold ${
              badgeFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
            }`}
          >
            {badgeFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{badgeFeedback.message}</span>
          </div>
        )}

        {/* Live Nametag Preview Card */}
        <div className="mt-4 p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
          <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Live Nametag Preview (How other explorers see you)</span>
          </div>
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[var(--color-border-default)]/60 shadow-xs">
            <div className="w-9 h-9 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center text-sm font-black overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.displayName || 'J').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <UserNametag
                displayName={user?.displayName || 'Juan Dela Cruz'}
                handle={user?.handle || 'juandelacruz'}
                badgeIds={activeBadgeIds}
                size="md"
                showHandle
              />
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 truncate">
                Exploring Pangasinan Coastal Destinations 🌊
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-5 flex items-center gap-1.5 flex-wrap border-b border-[var(--color-border-default)]/60 pb-3">
          <button
            type="button"
            onClick={() => setBadgeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              badgeFilter === 'all'
                ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            All Badges ({SAMPLE_USER_BADGES.length})
          </button>
          <button
            type="button"
            onClick={() => setBadgeFilter('nft')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              badgeFilter === 'nft'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
            }`}
          >
            <Gem className="w-3 h-3" />
            <span>Featured Badges ({SAMPLE_USER_BADGES.filter((b) => b.isNft).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setBadgeFilter('achievement')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              badgeFilter === 'achievement'
                ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            Scout Achievements ({SAMPLE_USER_BADGES.filter((b) => b.type === 'achievement' || b.type === 'scout').length})
          </button>
          <button
            type="button"
            onClick={() => setBadgeFilter('civic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              badgeFilter === 'civic'
                ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            Civic &amp; LGU ({SAMPLE_USER_BADGES.filter((b) => b.type === 'civic').length})
          </button>
        </div>

        {/* Badges Selection Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {SAMPLE_USER_BADGES.filter((badge) => {
            if (badgeFilter === 'nft') return badge.isNft;
            if (badgeFilter === 'achievement') return badge.type === 'achievement' || badge.type === 'scout';
            if (badgeFilter === 'civic') return badge.type === 'civic';
            return true;
          }).map((badge) => {
            const isSelected = activeBadgeIds.includes(badge.id);
            return (
              <div
                key={badge.id}
                onClick={() => handleToggleBadge(badge.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isSelected
                    ? 'bg-amber-50/60 border-amber-400 shadow-xs ring-1 ring-amber-400/40'
                    : 'bg-white hover:bg-stone-50 border-[var(--color-border-default)]'
                }`}
              >
                <div className="text-2xl shrink-0 p-1 rounded-lg bg-stone-100/80">
                  {badge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-[var(--color-brand-brown)] truncate">
                      {badge.name}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full shrink-0">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 mt-0.5">
                    {badge.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                      {badge.rarity}
                    </span>
                    {badge.isNft && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-900 border border-amber-400/40">
                        Verified {badge.tokenId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </SettingsSubpage>
  );
}
