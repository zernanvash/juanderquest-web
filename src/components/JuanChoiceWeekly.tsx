'use client';

// Plan 65: weekly JuanChoice pieces — the reigning Champion/Minister, manifesto perk pills and
// the quadratic boost bar. Points are in-app only; no money is involved.
import Link from 'next/link';
import { Crown, Gem, Lock, Map as MapIcon, ShoppingBag, Sparkles, Stamp, Swords, Zap } from 'lucide-react';
import type { JuanChoicePerk, JuanChoiceReigning } from '@/lib/juanchoice';

const DOMAIN_ICON = { quests: Zap, trails: MapIcon, stamps_quiz: Stamp, shop_msme: ShoppingBag } as const;

export function PerkPills({ perks, live = false }: { perks?: JuanChoicePerk[]; live?: boolean }) {
  if (!perks?.length) return null;
  return (
    <ul className="mt-3 space-y-1.5" aria-label="Manifesto perks">
      {perks.map((perk, index) => {
        if (perk.is_mystery && !perk.revealed) {
          return (
            <li key={`mystery-${index}`} className="flex flex-wrap items-center gap-x-1.5 rounded-lg bg-gradient-to-r from-violet-100 via-fuchsia-50 to-violet-100 px-2.5 py-1.5 text-xs font-bold text-violet-900 motion-safe:animate-pulse">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> ??? Mystery perk <span className="font-normal">(revealed if this place wins)</span>
            </li>
          );
        }
        const Icon = perk.domain ? DOMAIN_ICON[perk.domain] : Zap;
        return (
          <li key={perk.key ?? index} className="flex items-start gap-1.5 rounded-lg bg-[#FAF9F5] px-2.5 py-1.5 text-xs text-[#514532]">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D6A4F]" aria-hidden="true" />
            <span><span className="font-bold text-[#2C221E]">{perk.label}</span>{perk.is_anchor ? ' · anchor' : ''}
              {live && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">Live this week</span>}
              {perk.description && <span className="block text-[11px] text-[#6F6352]">{perk.description}</span>}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function ReigningHero({ reigning, nowMs }: { reigning: JuanChoiceReigning; nowMs: number | null }) {
  const champion = reigning.champions[0];
  if (!champion) return null;
  const endsMs = Date.parse(reigning.reign_ends_at);
  const left = nowMs === null ? null : Math.max(0, endsMs - nowMs);
  const countdown = left === null ? null : left >= 86_400_000
    ? `${Math.floor(left / 86_400_000)}d ${Math.floor((left % 86_400_000) / 3_600_000)}h left`
    : `${Math.floor(left / 3_600_000)}h ${Math.floor((left % 3_600_000) / 60_000)}m left`;
  const championPerks = reigning.perks.filter(perk => perk.role === 'champion');
  const ministerPerk = reigning.perks.find(perk => perk.role === 'minister');
  return (
    <section aria-labelledby="reigning-heading" className="overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-emerald-50">
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="relative min-h-[180px] bg-gradient-to-br from-[#2D6A4F] to-[#1B4332]">
          {champion.image_url && <img src={champion.image_url} alt="" className="h-full w-full object-cover" />}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F6C344] to-[#E09F1F] px-2.5 py-1 text-[11px] font-black uppercase text-[#4A2E00] shadow">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" /> In office this week
          </span>
        </div>
        <div className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Reigning Champion{reigning.champions.length > 1 ? 's' : ''}</p>
            {countdown && <p className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#514532] shadow-sm" aria-label="Reign time left">{countdown}</p>}
          </div>
          <h2 id="reigning-heading" className="text-2xl font-black text-[#582F0E]">{reigning.champions.map(c => c.spot_name).join(' & ')}</h2>
          <p className="text-sm text-[#514532]">{champion.municipality} · elected by {reigning.valid_ballots} {reigning.valid_ballots === 1 ? 'traveler' : 'travelers'}
            {reigning.festival_name ? ` · ${reigning.festival_name}` : ''}</p>
          <PerkPills perks={championPerks} live />
          {reigning.minister && (
            <div className="rounded-xl border border-emerald-200 bg-white/80 p-3">
              <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#2D6A4F]"><Swords className="h-3.5 w-3.5" aria-hidden="true" /> Minister of the week</p>
              <p className="mt-0.5 text-sm font-bold text-[#2C221E]">{reigning.minister.spot_name} <span className="font-normal text-[#6F6352]">· {reigning.minister.municipality}</span></p>
              {ministerPerk && <PerkPills perks={[ministerPerk]} live />}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/map?spot=${encodeURIComponent(champion.spot_id)}&trip=1`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#2D6A4F] px-3.5 text-xs font-bold text-white">
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" /> Trails &amp; route here
            </Link>
            <Link href={`/spots/${encodeURIComponent(champion.spot_slug || champion.spot_id)}`} className="inline-flex min-h-[40px] items-center rounded-xl border border-[#E3DFD5] bg-white px-3.5 text-xs font-semibold text-[#3F6653]">View place</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 1x free; each step up costs points on a quadratic curve and earns +10 Civic XP. */
export function BoostBar({ currentWeight, costByWeight, xpPerTier, balance, onBoost, disabled }: {
  currentWeight: number; costByWeight: Record<string, number>; xpPerTier: number; balance: number;
  onBoost: (weight: number, cost: number) => void; disabled?: boolean;
}) {
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3" aria-label="Boost your vote">
      <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#7D5800]"><Gem className="h-3.5 w-3.5" aria-hidden="true" /> Boost your vote</p>
      <p className="mt-1 text-xs text-[#514532]">Your vote counts {currentWeight}x. Spend points to count up to 5x; switching places later keeps your boost. Balance: {balance} points.</p>
      <ol className="mt-2 flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map(weight => {
          const owned = weight <= currentWeight;
          const cost = (costByWeight[String(weight)] ?? 0) - (costByWeight[String(currentWeight)] ?? 0);
          const next = weight === currentWeight + 1;
          return (
            <li key={weight}>
              {next ? (
                <button type="button" disabled={disabled} onClick={() => onBoost(weight, cost)}
                  className="flex min-h-[40px] items-center gap-1 rounded-lg bg-[#B7791F] px-3 text-xs font-bold text-white disabled:opacity-60 cursor-pointer">
                  {weight}x · {cost} pts <span className="font-normal">(+{xpPerTier} Civic XP)</span>
                </button>
              ) : (
                <span className={`flex min-h-[40px] items-center gap-1 rounded-lg px-3 text-xs font-bold ${owned ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-[#6F6352]'}`}>
                  {!owned && <Lock className="h-3 w-3" aria-hidden="true" />}{weight}x{owned ? ' ✓' : ''}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
