'use client';

// Plan 64: what a trail offers, then choose it. Locked Hiyas Trails show the stops' names,
// photos and one line each; the order, map and navigation unlock after the points are spent.
import React, { useEffect, useState } from 'react';
import { Clock, Gem, Loader2, Lock, MapPin, Route, Trophy, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useAuth } from '@/lib/auth';
import { formatMinutes } from '@/lib/trip-api';
import { fetchTrail, isHiyasTrail, unlockTrail, type NearbyTrail, type TrailDetail } from '@/lib/trails-api';

function errorCode(err: unknown): string | undefined {
  return isAxiosError(err) ? (err.response?.data as { error?: { code?: string } })?.error?.code : undefined;
}

export function HiyasBadge({ legendary = false }: { legendary?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F6C344] to-[#E09F1F] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#4A2E00] shadow-sm">
      <Gem className="h-3 w-3" aria-hidden="true" /> Hiyas Trail{legendary ? ' · limited' : ''}
    </span>
  );
}

export function TrailOfferModal({ card, signInHref, onClose, onChoose }: {
  card: NearbyTrail;
  signInHref: string;
  onClose: () => void;
  onChoose: (trail: TrailDetail) => void;
}) {
  const { user, refreshProfile } = useAuth();
  const [detail, setDetail] = useState<TrailDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hiyas = isHiyasTrail(card.tier);
  const price = card.unlock_rule.price_points ?? 0;
  const locked = !card.is_unlocked;

  useEffect(() => {
    let active = true;
    fetchTrail(card.id).then((d) => { if (active) setDetail(d); }).catch(() => { if (active) setLoadError('Could not load this trail. Please try again.'); });
    return () => { active = false; };
  }, [card.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const choose = async () => {
    if (!user) { window.location.assign(signInHref); return; }
    if (locked && hiyas && price > 0 && !confirming) { setConfirming(true); return; }
    setBusy(true); setError('');
    try {
      if (locked) { await unlockTrail(card.id); await refreshProfile(); }
      onChoose(await fetchTrail(card.id));
    } catch (err) {
      const code = errorCode(err);
      setError(code === 'INSUFFICIENT_POINTS' ? 'Not enough points yet. Earn points through quests, then try again.'
        : code === 'RULE_NOT_MET' ? 'Reach Explorer level 5 to choose this trail.'
          : code === 'NOT_AVAILABLE' ? 'This trail is outside its availability window.'
            : 'Something went wrong. Nothing was charged; please try again.');
      setConfirming(false);
    } finally { setBusy(false); }
  };

  const stops = detail?.stops ?? [];
  const preview = detail?.preview ?? [];
  const intro = detail?.intro || detail?.story?.intro || '';
  const cta = !user ? 'Sign in to choose'
    : locked && hiyas && price > 0 ? (confirming ? `Spend ${price} points` : `Unlock & choose · ${price} points`)
      : 'Choose this trail';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="trail-offer-title" onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#FAF9F5] shadow-2xl sm:rounded-3xl">
        <div className="relative h-40 bg-gradient-to-br from-[#2D6A4F] to-[#1B4332]">
          {card.cover_image_url && <img src={card.cover_image_url} alt="" className="h-full w-full object-cover" />}
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#1F2A24] cursor-pointer"><X className="h-4 w-4" /></button>
          {hiyas && <div className="absolute left-3 top-3"><HiyasBadge legendary={card.tier === 'legendary'} /></div>}
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h2 id="trail-offer-title" className="text-lg font-black leading-tight text-[#1F2A24]">{card.title}</h2>
            {card.tagline && <p className="text-[12px] text-[#514532]">{card.tagline}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white p-2"><MapPin className="mx-auto h-4 w-4 text-[#2D6A4F]" /><p className="text-[12px] font-bold">{card.stop_count} stops</p></div>
            <div className="rounded-xl bg-white p-2"><Clock className="mx-auto h-4 w-4 text-[#2D6A4F]" /><p className="text-[12px] font-bold">{formatMinutes(card.total_minutes)}</p></div>
            <div className="rounded-xl bg-white p-2"><Trophy className="mx-auto h-4 w-4 text-[#B45309]" /><p className="text-[12px] font-bold">+{card.reward_points} pts</p></div>
          </div>
          {intro && <p className="text-[12px] leading-relaxed text-[#514532]">{intro}</p>}

          {!detail && !loadError && <p className="flex items-center gap-1.5 text-[12px] text-[#514532]"><Loader2 className="h-4 w-4 animate-spin" /> Loading the stops…</p>}
          {loadError && <p role="alert" className="text-[12px] font-semibold text-[#9B2226]">{loadError}</p>}

          {stops.length > 0 && (
            <ol className="space-y-2" aria-label="Stops in order">
              {stops.map((stop) => (
                <li key={stop.position} className="flex gap-2 rounded-xl bg-white p-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2D6A4F] text-[11px] font-black text-white">{stop.position}</span>
                  <div className="min-w-0"><p className="text-[12px] font-bold text-[#1F2A24]">{stop.name}</p>
                    <p className="text-[10px] text-[#6F6352]">{stop.municipality} · stay {formatMinutes(stop.dwell_min)}</p></div>
                </li>
              ))}
            </ol>
          )}
          {stops.length === 0 && preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[#514532]">What you&apos;ll discover</p>
              <ul className="grid grid-cols-2 gap-2" aria-label="Places on this trail">
                {preview.map((stop) => (
                  <li key={stop.name} className="overflow-hidden rounded-xl bg-white">
                    <div className="h-20 bg-emerald-100">{stop.image_url && <img src={stop.image_url} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="p-2"><p className="text-[11px] font-bold leading-tight text-[#1F2A24]">{stop.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#6F6352]">{stop.blurb || stop.municipality}</p></div>
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-1 text-[10px] text-[#6F6352]"><Lock className="h-3 w-3" /> The route order, map and turn-by-turn navigation unlock when you choose this trail.</p>
            </div>
          )}

          {confirming && <p className="rounded-xl border border-[#E09F1F] bg-amber-50 p-2.5 text-[12px] text-[#4A2E00]">Spend {price} points to unlock this Hiyas Trail? Your balance: {user?.points ?? 0} points. Points are in-app only; no money is involved.</p>}
          {error && <p role="alert" className="text-[12px] font-semibold text-[#9B2226]">{error}</p>}
          <div className="flex gap-2">
            {confirming && <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="min-h-[48px] flex-1 rounded-2xl border border-[#E3DFD5] bg-white text-[13px] font-semibold text-[#514532] cursor-pointer">Cancel</button>}
            <button type="button" onClick={() => void choose()} disabled={busy || (!detail && !loadError)}
              className={`flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-2xl text-[13px] font-bold text-white disabled:opacity-60 cursor-pointer ${hiyas && locked ? 'bg-gradient-to-r from-[#B7791F] to-[#8A5A00]' : 'bg-[#2D6A4F]'}`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />} {cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
