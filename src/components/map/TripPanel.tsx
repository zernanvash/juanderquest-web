'use client';

// Plan 64: the destination side panel's trip flow. Free: a route from an origin with
// detour areas along it. Premium (points): a tailored, ordered trail around the destination.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Compass, Loader2, Lock, MapPin, Plus, Route, Sparkles, X, Check } from 'lucide-react';
import { isAxiosError } from 'axios';
import type { SpotModel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { planTrip, TRIP_ORIGINS, formatMinutes, type DetourArea, type LatLng, type TripPlan } from '@/lib/trip-api';
import {
  checkInTrailStop, createPersonalTrail, fetchTrail, fetchTrails, unlockTrail,
  type TrailCatalogItem, type TrailDetail,
} from '@/lib/trails-api';
import type { MapOverlay } from '@/components/map/VectorMapCanvas';

const THEMES = ['beach', 'heritage', 'food', 'nature', 'family-friendly'];
const PREMIUM_TIERS = new Set(['signature', 'legendary']);

type Mode = 'route' | 'tailor' | 'trail';

function apiErrorCode(err: unknown): string | undefined {
  return isAxiosError(err) ? (err.response?.data as { error?: { code?: string } })?.error?.code : undefined;
}

export function TripPanel({ spot, userLocation, onOverlay }: {
  spot: SpotModel;
  userLocation?: { lat: number; lng: number } | null;
  onOverlay: (overlay: MapOverlay | null) => void;
}) {
  const { user, refreshProfile } = useAuth();
  const destination = useMemo<LatLng>(() => ({ lat: spot.gpsLat, lng: spot.gpsLng }), [spot.gpsLat, spot.gpsLng]);

  const [mode, setMode] = useState<Mode>('route');
  const [originKey, setOriginKey] = useState('');
  const [via, setVia] = useState<DetourArea[]>([]);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState('');

  const [catalog, setCatalog] = useState<TrailCatalogItem[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [themes, setThemes] = useState<string[]>([]);
  const [hours, setHours] = useState(4);
  const [pace, setPace] = useState<'relaxed' | 'balanced' | 'packed'>('balanced');
  const [confirming, setConfirming] = useState<null | { kind: 'tailor' } | { kind: 'unlock'; trail: TrailCatalogItem }>(null);
  const [busy, setBusy] = useState(false);

  const [trail, setTrail] = useState<TrailDetail | null>(null);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [reward, setReward] = useState<number | null>(null);

  const origin = useMemo<LatLng | null>(() => {
    if (originKey === 'me') return userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null;
    const city = TRIP_ORIGINS.find((item) => item.name === originKey);
    return city ? { lat: city.lat, lng: city.lng } : null;
  }, [originKey, userLocation]);

  // Ready-made trails that touch this destination's town, plus the tailored price.
  useEffect(() => {
    let active = true;
    fetchTrails().then(({ items, personalGeneration }) => {
      if (!active) return;
      const town = spot.municipality.toLowerCase();
      setCatalog(items.filter((item) => item.tier !== 'personal' && item.municipalities.some((m) => m.toLowerCase() === town)));
      setPrice(personalGeneration ? personalGeneration.price_points : null);
    }).catch(() => { if (active) { setCatalog([]); setPrice(null); } });
    return () => { active = false; };
  }, [spot.municipality, user?.id]);

  // Leaving the destination clears whatever this panel drew.
  useEffect(() => () => onOverlay(null), [onOverlay]);

  const drawRoute = useCallback((next: TripPlan, start: LatLng, stops: DetourArea[]) => {
    onOverlay({
      line: next.baseline_route.coordinates.map(([lat, lng]) => [lng, lat]),
      points: [
        { lng: start.lng, lat: start.lat, label: 'A', kind: 'start' },
        ...stops.map((area) => ({ lng: area.center.lng, lat: area.center.lat, label: '+', kind: 'detour' as const })),
        { lng: destination.lng, lat: destination.lat, label: 'B', kind: 'end' },
      ],
    });
  }, [destination, onOverlay]);

  const runPlan = useCallback(async (start: LatLng, stops: DetourArea[]) => {
    setPlanning(true); setError('');
    try {
      const next = await planTrip(start, destination, stops.map((area) => area.center));
      setPlan(next);
      drawRoute(next, start, stops);
    } catch {
      setError('Could not plan this trip right now. Try again in a moment.');
    } finally {
      setPlanning(false);
    }
  }, [destination, drawRoute]);

  useEffect(() => {
    if (mode !== 'route' || !origin) return;
    void runPlan(origin, via);
  }, [origin, via, mode, runPlan]);

  const toggleDetour = (area: DetourArea) =>
    setVia((current) => current.some((a) => a.municipality === area.municipality)
      ? current.filter((a) => a.municipality !== area.municipality)
      : [...current, area].slice(0, 3));

  const enterTrail = useCallback(async (id: string) => {
    const detail = await fetchTrail(id);
    setTrail(detail); setMode('trail'); setReward(null);
    const stops = detail.stops ?? [];
    onOverlay(stops.length ? {
      line: stops.map((stop) => [stop.lng, stop.lat]),
      points: stops.map((stop) => ({ lng: stop.lng, lat: stop.lat, label: String(stop.position), kind: stop.checked_in ? 'done' as const : 'stop' as const })),
    } : null);
  }, [onOverlay]);

  const confirm = async () => {
    if (!confirming) return;
    setBusy(true); setError('');
    try {
      if (confirming.kind === 'tailor') {
        const result = await createPersonalTrail({ themes, budget_min: hours * 60, pace, start: destination });
        await refreshProfile();
        await enterTrail(result.trail.id);
      } else {
        await unlockTrail(confirming.trail.id);
        await refreshProfile();
        await enterTrail(confirming.trail.id);
      }
      setConfirming(null);
    } catch (err) {
      const code = apiErrorCode(err);
      setError(code === 'INSUFFICIENT_POINTS' ? 'Not enough points yet. Earn points through quests, then try again.'
        : code === 'RULE_NOT_MET' ? 'Your account has not met this trail’s requirement yet.'
          : code === 'NOT_AVAILABLE' ? 'This trail is outside its availability window.'
            : code === 'AREA_REQUIRED' || code === 'NO_FEASIBLE_TRAIL' ? 'Not enough places near here for a trail yet. Try fewer themes or more hours.'
              : 'Something went wrong. Nothing was charged; please try again.');
    } finally {
      setBusy(false);
    }
  };

  const checkIn = (position: number) => {
    if (!trail || !navigator.geolocation) { setError('Location is unavailable on this device.'); return; }
    setCheckingIn(position); setError('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const result = await checkInTrailStop(trail.id, position, { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: Math.round(pos.coords.accuracy) });
        const done = new Set(result.progress.filter((stop) => stop.checked_in).map((stop) => stop.position));
        const stops = (trail.stops ?? []).map((stop) => ({ ...stop, checked_in: done.has(stop.position) }));
        setTrail({ ...trail, stops });
        onOverlay({
          line: stops.map((stop) => [stop.lng, stop.lat]),
          points: stops.map((stop) => ({ lng: stop.lng, lat: stop.lat, label: String(stop.position), kind: stop.checked_in ? 'done' as const : 'stop' as const })),
        });
        if (result.completion) { setReward(result.completion.reward_points); void refreshProfile(); }
      } catch (err) {
        const code = apiErrorCode(err);
        setError(code === 'TOO_FAR_FROM_STOP' ? 'You are not close enough to this stop yet.' : code === 'LOCATION_ACCURACY_TOO_LOW' ? 'Your location is not precise enough yet. Step outside and try again.' : 'Check-in failed. Please try again.');
      } finally {
        setCheckingIn(null);
      }
    }, () => { setCheckingIn(null); setError('Allow location access to check in.'); }, { enableHighAccuracy: true, timeout: 15000 });
  };

  const leaveTrail = () => { setMode('route'); setTrail(null); setReward(null); onOverlay(null); if (origin && plan) drawRoute(plan, origin, via); };

  const card = 'space-y-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5';
  const chip = (active: boolean) => `min-h-[36px] rounded-full border px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${active ? 'border-[#2D6A4F] bg-emerald-100 text-[#2D6A4F]' : 'border-emerald-200 bg-white text-[#514532] hover:bg-emerald-50'}`;
  const signInHref = `/login?redirect=${encodeURIComponent(`/map?spot=${spot.id}&trip=1`)}`;

  if (mode === 'trail' && trail) {
    const stops = trail.stops ?? [];
    const doneCount = stops.filter((stop) => stop.checked_in).length;
    return (
      <section className={card} aria-label="Your trail">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#2D6A4F]">Your trail</p>
            <h3 className="text-sm font-bold text-[#1F2A24]">{trail.title}</h3>
            <p className="text-[11px] text-[#514532]">{stops.length} stops · {formatMinutes(trail.total_minutes)} · {Number(trail.total_km).toFixed(1)} km</p>
          </div>
          <button type="button" onClick={leaveTrail} className="flex min-h-[40px] items-center gap-1 rounded-xl border border-[#E3DFD5] bg-white px-2.5 text-[11px] font-semibold text-[#514532] cursor-pointer">
            <X className="h-3.5 w-3.5" /> Leave
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-emerald-100" role="progressbar" aria-label="Stops checked in" aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={doneCount}>
          <div className="h-1.5 rounded-full bg-[#2D6A4F]" style={{ width: `${stops.length ? (doneCount / stops.length) * 100 : 0}%` }} />
        </div>
        {reward !== null && <p role="status" className="rounded-xl bg-[#2D6A4F] px-3 py-2 text-[12px] font-bold text-white">Trail complete! +{reward} points</p>}
        <ol className="space-y-2">
          {stops.map((stop) => (
            <li key={stop.position} className="rounded-xl border border-emerald-100 bg-white p-2.5">
              <div className="flex items-start gap-2">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black text-white ${stop.checked_in ? 'bg-[#2D6A4F]' : 'bg-[#F4A261]'}`}>{stop.checked_in ? <Check className="h-3.5 w-3.5" /> : stop.position}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-[#1F2A24]">{stop.name}</p>
                  <p className="text-[10px] text-[#837560]">{stop.municipality} · stay {formatMinutes(stop.dwell_min)}{stop.position > 1 ? ` · ${formatMinutes(stop.leg_minutes)} drive` : ''}</p>
                  {stop.narration && <p className="mt-1 text-[11px] leading-relaxed text-[#514532]">{stop.narration}</p>}
                </div>
              </div>
              {!stop.checked_in && (
                <button type="button" onClick={() => checkIn(stop.position)} disabled={checkingIn !== null}
                  className="mt-2 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#2D6A4F] text-[12px] font-bold text-white disabled:opacity-60 cursor-pointer">
                  {checkingIn === stop.position ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />} I&apos;m here
                </button>
              )}
            </li>
          ))}
        </ol>
        {error && <p role="alert" className="text-[11px] font-semibold text-[#9B2226]">{error}</p>}
      </section>
    );
  }

  return (
    <section className={card} aria-label="Trip to this destination">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#2D6A4F]"><Route className="h-3.5 w-3.5" /> Get there</p>

      <label className="block text-[11px] font-semibold text-[#514532]">
        From where?
        <select value={originKey} onChange={(event) => { setOriginKey(event.target.value); setVia([]); }}
          className="mt-1 block min-h-[40px] w-full rounded-xl border border-emerald-200 bg-white px-2.5 text-[12px] text-[#1F2A24]">
          <option value="">Choose a starting point</option>
          <option value="me" disabled={!userLocation}>{userLocation ? 'My location' : 'My location (turn on location)'}</option>
          {TRIP_ORIGINS.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
        </select>
      </label>

      {planning && <p className="flex items-center gap-1.5 text-[11px] text-[#514532]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Planning your route…</p>}

      {plan && origin && !planning && (
        <div className="space-y-2">
          <p className="text-[12px] font-bold text-[#1F2A24]">
            {plan.baseline_route.summary.distanceKm.toFixed(0)} km · {plan.baseline_route.degraded ? 'estimate' : plan.baseline_route.summary.durationFormatted}
          </p>
          {plan.baseline_route.degraded && <p className="text-[10px] text-[#837560]">{plan.baseline_route.warning?.message ?? 'Road routing is unavailable; this is a straight-line estimate.'}</p>}
          {(plan.detour_areas.length > 0 || via.length > 0) && <p className="text-[11px] font-semibold text-[#514532]">Worth a detour</p>}
          {[...via.filter((v) => !plan.detour_areas.some((a) => a.municipality === v.municipality)), ...plan.detour_areas].map((area) => {
            const added = via.some((a) => a.municipality === area.municipality);
            return (
              <div key={area.municipality} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-[#1F2A24]">{area.municipality}</p>
                  <p className="text-[10px] text-[#837560]">+{area.detour_km.toFixed(0)} km · about +{formatMinutes(area.extra_minutes)}</p>
                  <p className="truncate text-[11px] text-[#514532]">{area.highlights.map((h) => h.name).join(' · ')}</p>
                </div>
                <button type="button" onClick={() => toggleDetour(area)} aria-pressed={added}
                  className={`flex min-h-[40px] items-center gap-1 rounded-xl border px-2.5 text-[11px] font-bold cursor-pointer ${added ? 'border-[#2D6A4F] bg-emerald-100 text-[#2D6A4F]' : 'border-emerald-200 bg-white text-[#2D6A4F]'}`}>
                  {added ? <><Check className="h-3.5 w-3.5" /> Added</> : <><Plus className="h-3.5 w-3.5" /> Add</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {catalog.length > 0 && (
        <div className="space-y-2 border-t border-emerald-100 pt-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#514532]"><Compass className="h-3.5 w-3.5" /> Trails here</p>
          {catalog.map((item) => {
            const premium = PREMIUM_TIERS.has(item.tier);
            const cost = item.unlock_rule.price_points ?? 0;
            return (
              <button key={item.id} type="button"
                onClick={() => { if (!user) { window.location.assign(signInHref); return; } if (item.is_unlocked) void enterTrail(item.id); else setConfirming({ kind: 'unlock', trail: item }); }}
                className="flex w-full items-center gap-2 rounded-xl border border-emerald-100 bg-white p-2.5 text-left cursor-pointer hover:bg-emerald-50">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-[#1F2A24]">{item.title}</p>
                  <p className="text-[10px] text-[#837560]">{item.stop_count} stops · {formatMinutes(item.total_minutes)}{premium && !item.is_unlocked ? ' · stops revealed after unlock' : ''}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${item.is_unlocked ? 'bg-emerald-100 text-[#2D6A4F]' : premium ? 'bg-[#7B2CBF]/10 text-[#5A189A]' : 'bg-amber-100 text-[#7D5800]'}`}>
                  {item.is_unlocked ? 'Open' : premium ? <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />{cost} pts</span> : 'Free'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {price !== null && (
        <div className="space-y-2 border-t border-emerald-100 pt-2.5">
          {mode !== 'tailor' ? (
            <button type="button" onClick={() => { if (!user) { window.location.assign(signInHref); return; } setMode('tailor'); setError(''); }}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#2D6A4F] px-3 text-[12px] font-bold text-white cursor-pointer">
              <Sparkles className="h-4 w-4" /> Make it a trail · {price} points
            </button>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold text-[#514532]">A tailored trail picks specific stops around {spot.name} for you, in order, with times.</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="What do you like?">
                {THEMES.map((theme) => (
                  <button key={theme} type="button" aria-pressed={themes.includes(theme)} className={chip(themes.includes(theme))}
                    onClick={() => setThemes((current) => current.includes(theme) ? current.filter((t) => t !== theme) : [...current, theme])}>{theme}</button>
                ))}
              </div>
              <label className="block text-[11px] font-semibold text-[#514532]">
                Time you have: {hours} h
                <input type="range" min={2} max={10} step={1} value={hours} onChange={(event) => setHours(Number(event.target.value))} className="mt-1 block w-full accent-[#2D6A4F]" />
              </label>
              <div className="flex gap-1.5" role="group" aria-label="Pace">
                {(['relaxed', 'balanced', 'packed'] as const).map((value) => (
                  <button key={value} type="button" aria-pressed={pace === value} className={chip(pace === value)} onClick={() => setPace(value)}>{value}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('route')} className="min-h-[44px] flex-1 rounded-xl border border-[#E3DFD5] bg-white text-[12px] font-semibold text-[#514532] cursor-pointer">Back</button>
                <button type="button" onClick={() => setConfirming({ kind: 'tailor' })} className="min-h-[44px] flex-[2] rounded-xl bg-[#2D6A4F] text-[12px] font-bold text-white cursor-pointer">Continue · {price} points</button>
              </div>
            </div>
          )}
        </div>
      )}

      {!user && <p className="text-[10px] text-[#837560]"><Link href={signInHref} className="font-semibold text-[#2D6A4F] underline">Sign in</Link> to unlock trails.</p>}
      {error && <p role="alert" className="text-[11px] font-semibold text-[#9B2226]">{error}</p>}

      {confirming && (
        <div role="dialog" aria-modal="true" aria-label="Confirm points" className="space-y-2 rounded-xl border border-[#2D6A4F] bg-white p-3">
          <p className="text-[12px] font-bold text-[#1F2A24]">
            {confirming.kind === 'tailor' ? `Create your tailored trail for ${price} points?` : `Unlock “${confirming.trail.title}”${confirming.trail.unlock_rule.price_points ? ` for ${confirming.trail.unlock_rule.price_points} points` : ''}?`}
          </p>
          <p className="text-[11px] text-[#514532]">Your balance: {user?.points ?? 0} points. Points are in-app only; no money is involved.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(null)} disabled={busy} className="min-h-[44px] flex-1 rounded-xl border border-[#E3DFD5] text-[12px] font-semibold text-[#514532] cursor-pointer">Cancel</button>
            <button type="button" onClick={() => void confirm()} disabled={busy} className="flex min-h-[44px] flex-[2] items-center justify-center gap-1.5 rounded-xl bg-[#2D6A4F] text-[12px] font-bold text-white disabled:opacity-60 cursor-pointer">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? (confirming.kind === 'tailor' ? 'Building your trail…' : 'Unlocking…') : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
