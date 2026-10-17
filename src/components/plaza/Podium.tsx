import React from 'react';
import Link from 'next/link';
import { Crown, MapPin } from 'lucide-react';
import type { StandingEntry } from '@/lib/plaza-api';

interface PodiumProps {
  podium: StandingEntry[];
}

export const Podium: React.FC<PodiumProps> = ({ podium }) => {
  const first = podium.find((p) => p.rank === 1) || podium[0];
  const second = podium.find((p) => p.rank === 2) || podium[1];
  const third = podium.find((p) => p.rank === 3) || podium[2];

  if (!first) return null;

  return (
    <section aria-label="Top 3 podium" className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-2">
      {/* 🥈 Rank 2 - Silver (Left) */}
      {second ? (
        <div className="order-2 md:order-1 bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition relative group">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
            <span>🥈 2nd Place</span>
          </div>

          <div className="text-center space-y-2.5 pt-2">
            <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 flex items-center justify-center text-xl font-black text-slate-700 shadow-inner overflow-hidden">
              {second.avatar_url ? (
                <img src={second.avatar_url} alt={second.display_name} className="w-full h-full object-cover" />
              ) : (
                second.display_name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {second.handle ? (
                  <Link
                    href={`/profile/${second.handle}`}
                    className="text-base font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                  >
                    @{second.handle}
                  </Link>
                ) : (
                  <span className="text-base font-black text-[var(--color-brand-brown)]">
                    {second.display_name}
                  </span>
                )}
              </div>
              {second.home_town && (
                <p className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>{second.home_town}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--color-text-muted)]">{second.quests} Eco-Quests</span>
            <span className="text-slate-800 font-black text-sm">{second.score.toLocaleString()} pts</span>
          </div>
        </div>
      ) : (
        <div className="hidden md:block order-2 md:order-1" />
      )}

      {/* 🥇 Rank 1 - Gold Champion (Center / Spotlight) */}
      <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50/90 via-white to-white rounded-2xl border-2 border-amber-300 p-6 sm:p-7 flex flex-col justify-between shadow-md hover:shadow-lg transition relative group md:-translate-y-2">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 fill-current" />
          <span>1st Place Champion</span>
        </div>

        <div className="text-center space-y-3 pt-3">
          <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-amber-200 to-amber-400 border-4 border-white flex items-center justify-center text-3xl font-black text-amber-950 shadow-md overflow-hidden">
            {first.avatar_url ? (
              <img src={first.avatar_url} alt={first.display_name} className="w-full h-full object-cover" />
            ) : (
              '👑'
            )}
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {first.handle ? (
                <Link
                  href={`/profile/${first.handle}`}
                  className="text-lg sm:text-xl font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                >
                  @{first.handle}
                </Link>
              ) : (
                <span className="text-lg sm:text-xl font-black text-[var(--color-brand-brown)]">
                  {first.display_name}
                </span>
              )}
            </div>
            {first.home_town && (
              <p className="text-xs text-[var(--color-brand-primary)] font-bold flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{first.home_town}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-amber-200 flex items-center justify-between text-xs font-bold">
          <span className="text-[var(--color-text-muted)]">{first.quests} Eco-Quests</span>
          <span className="text-[var(--color-brand-primary)] font-black text-base">{first.score.toLocaleString()} pts</span>
        </div>
      </div>

      {/* 🥉 Rank 3 - Bronze (Right) */}
      {third ? (
        <div className="order-3 md:order-3 bg-white rounded-2xl border-2 border-orange-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition relative group">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-orange-800 text-[11px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
            <span>🥉 3rd Place</span>
          </div>

          <div className="text-center space-y-2.5 pt-2">
            <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-orange-100 to-orange-200 border-2 border-orange-300 flex items-center justify-center text-xl font-black text-orange-800 shadow-inner overflow-hidden">
              {third.avatar_url ? (
                <img src={third.avatar_url} alt={third.display_name} className="w-full h-full object-cover" />
              ) : (
                third.display_name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {third.handle ? (
                  <Link
                    href={`/profile/${third.handle}`}
                    className="text-base font-black text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition"
                  >
                    @{third.handle}
                  </Link>
                ) : (
                  <span className="text-base font-black text-[var(--color-brand-brown)]">
                    {third.display_name}
                  </span>
                )}
              </div>
              {third.home_town && (
                <p className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-orange-600" />
                  <span>{third.home_town}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--color-text-muted)]">{third.quests} Eco-Quests</span>
            <span className="text-orange-900 font-black text-sm">{third.score.toLocaleString()} pts</span>
          </div>
        </div>
      ) : (
        <div className="hidden md:block order-3 md:order-3" />
      )}
    </section>
  );
};
