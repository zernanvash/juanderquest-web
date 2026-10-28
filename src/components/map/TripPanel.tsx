'use client';

// Plan 64: a destination's trails, in one flow. Swipe premade trails (Direct route first), open
// one to see what it offers, choose it (Hiyas Trails unlock with points), then navigate it.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clock, Gem, Loader2, Lock, MapPin, Plus, Route, X } from 'lucide-react';
import type { SpotModel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { planTrip, TRIP_ORIGINS, formatMinutes, type DetourArea, type LatLng, type TripPlan } from '@/lib/trip-api';
import { fetchTrailsNear, isHiyasTrail, type NearbyTrail, type TrailDetail } from '@/lib/trails-api';
import type { MapOverlay } from '@/components/map/VectorMapCanvas';
import { TrailOfferModal } from '@/components/map/TrailOfferModal';
import { TrailNavigator } from '@/components/map/TrailNavigator';

export function TripPanel({ spot, userLocation, onOverlay }: {
  spot: SpotModel;
  userLocation?: { lat: number; lng: number } | null;
  onOverlay: (overlay: MapOverlay | null) => void;
}) {
  const { user } = useAuth();
  const destination = useMemo<LatLng>(() => ({ lat: spot.gpsLat, lng: spot.gpsLng }), [spot.gpsLat, spot.gpsLng]);
  const signInHref = `/login?redirect=${encodeURIComponent(`/map?spot=${spot.id}&trip=1`)}`;

  const [trails, setTrails] = useState<NearbyTrail[] | null>(null);
  const [offer, setOffer] = useState<NearbyTrail | null>(null);
  const [navigating, setNavigating] = useState<TrailDetail | null>(null);
  const [direct, setDirect] = useState(false);

  const [originKey, setOriginKey] = useState('');
  const [via, setVia] = useState<DetourArea[]>([]);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchTrailsNear(destination, spot.id).then((items) => { if (active) setTrails(items); }).catch(() => { if (active) setTrails([]); });
    return () => { active = false; };
  }, [destination, spot.id, user?.id]);

  // Leaving the destination clears whatever this panel drew.
  useEffect(() => () => onOverlay(null), [onOverlay]);

  const origin = useMemo<LatLng | null>(() => {
    if (originKey === 'me') return userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null;
    const city = TRIP_ORIGINS.find((item) => item.name === originKey);
    return city ? { lat: city.lat, lng: city.lng } : null;
  }, [originKey, userLocation]);

  const runPlan = useCallback(async (start: LatLng, stops: DetourArea[]) => {
    setPlanning(true); setError('');
    try {
      const next = await planTrip(start, destination, stops.map((area) => area.center));
      setPlan(next);
      onOverlay({
        line: next.baseline_route.coordinates.map(([lat, lng]) => [lng, lat]),
        points: [
          { lng: start.lng, lat: start.lat, label: 'A', kind: 'start' },
          ...stops.map((area) => ({ lng: area.center.lng, lat: area.center.lat, label: '+', kind: 'detour' as const })),
          { lng: destination.lng, lat: destination.lat, label: 'B', kind: 'end' },
        ],
      });
    } catch {
      setError('Could not plan this route right now. Try again in a moment.');
    } finally { setPlanning(false); }
  }, [destination, onOverlay]);

  useEffect(() => {
    if (!direct || !origin) return;
    void runPlan(origin, via);
  }, [direct, origin, via, runPlan]);

  const toggleDetour = (area: DetourArea) =>
    setVia((current) => current.some((a) => a.municipality === area.municipality)
      ? current.filter((a) => a.municipality !== area.municipality)
      : [...current, area].slice(0, 3));

  if (navigating) {
    return <TrailNavigator trail={navigating} userLocation={userLocation} onOverlay={onOverlay}
      onExit={() => { setNavigating(null); onOverlay(null); }} />;
  }

  const cardBase = 'flex w-[200px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm cursor-pointer transition hover:shadow-md';

  return (
    <section className="space-y-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5" aria-label="Trails from this destination">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#2D6A4F]"><Route className="h-3.5 w-3.5" /> Trails here</p>

      <ul className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1" aria-label="Choose a trail">
        <li>
          <button type="button" onClick={() => { setDirect((v) => !v); if (direct) onOverlay(null); }} aria-pressed={direct}
            className={`${cardBase} ${direct ? 'border-[#2D6A4F] ring-2 ring-[#2D6A4F]/30' : 'border-emerald-100'}`}>
            <div className="grid h-24 place-items-center bg-gradient-to-br from-[#D8F3DC] to-[#95D5B2]"><Route className="h-8 w-8 text-[#1B4332]" /></div>
            <div className="space-y-0.5 p-2.5">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-[#2D6A4F]">Free</span>
              <p className="text-[12px] font-bold leading-tight text-[#1F2A24]">Direct route</p>
              <p className="text-[10px] text-[#6F6352]">From where you are, with optional detours</p>
            </div>
          </button>
        </li>
        {trails === null && (
          <li className={`${cardBase} items-center justify-center border-emerald-100 p-6 text-[11px] text-[#514532]`}><Loader2 className="h-4 w-4 animate-spin" /></li>
        )}
        {(trails ?? []).map((trail) => {
          const hiyas = isHiyasTrail(trail.tier);
          return (
            <li key={trail.id}>
              <button type="button" onClick={() => setOffer(trail)} className={`${cardBase} ${hiyas ? 'border-[#E09F1F]/60' : 'border-emerald-100'}`}>
                <div className="relative h-24 bg-gradient-to-br from-[#2D6A4F] to-[#1B4332]">
                  {trail.cover_image_url && <img src={trail.cover_image_url} alt="" className="h-full w-full object-cover" />}
                  {hiyas && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F6C344] to-[#E09F1F] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#4A2E00]"><Gem className="h-2.5 w-2.5" /> Hiyas</span>}
                  {trail.passes_here && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-[#1B4332]">Passes here</span>}
                </div>
                <div className="space-y-0.5 p-2.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${trail.is_unlocked ? 'bg-emerald-100 text-[#2D6A4F]' : hiyas ? 'bg-amber-100 text-[#7D5800]' : 'bg-emerald-100 text-[#2D6A4F]'}`}>
                    {trail.is_unlocked ? 'Yours' : hiyas ? <><Lock className="h-2.5 w-2.5" />{trail.unlock_rule.price_points ?? 0} pts</> : 'Free'}
                  </span>
                  <p className="line-clamp-2 text-[12px] font-bold leading-tight text-[#1F2A24]">{trail.title}</p>
                  <p className="flex items-center gap-1 text-[10px] text-[#6F6352]"><MapPin className="h-3 w-3" />{trail.stop_count} stops <Clock className="ml-1 h-3 w-3" />{formatMinutes(trail.total_minutes)}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {trails !== null && trails.length === 0 && <p className="text-[11px] text-[#6F6352]">No trails near here yet. Use the direct route, or check back soon.</p>}

      {direct && (
        <div className="space-y-2 border-t border-emerald-100 pt-2.5">
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
              <p className="text-[12px] font-bold text-[#1F2A24]">{plan.baseline_route.summary.distanceKm.toFixed(0)} km · {plan.baseline_route.degraded ? 'estimate' : plan.baseline_route.summary.durationFormatted}</p>
              {plan.baseline_route.degraded && <p className="text-[10px] text-[#6F6352]">{plan.baseline_route.warning?.message ?? 'Road routing is unavailable; this is a straight-line estimate.'}</p>}
              {(plan.detour_areas.length > 0 || via.length > 0) && <p className="text-[11px] font-semibold text-[#514532]">Worth a detour</p>}
              {[...via.filter((v) => !plan.detour_areas.some((a) => a.municipality === v.municipality)), ...plan.detour_areas].map((area) => {
                const added = via.some((a) => a.municipality === area.municipality);
                return (
                  <div key={area.municipality} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-[#1F2A24]">{area.municipality}</p>
                      <p className="text-[10px] text-[#6F6352]">{area.detour_km < 2 ? `On the way · about +${formatMinutes(area.extra_minutes)} to stop` : `+${area.detour_km.toFixed(0)} km · about +${formatMinutes(area.extra_minutes)}`}</p>
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
          <button type="button" onClick={() => { setDirect(false); onOverlay(null); }} className="flex min-h-[36px] items-center gap-1 text-[11px] font-semibold text-[#514532] cursor-pointer"><X className="h-3.5 w-3.5" /> Close route</button>
        </div>
      )}
      {error && <p role="alert" className="text-[11px] font-semibold text-[#9B2226]">{error}</p>}

      {offer && (
        <TrailOfferModal card={offer} signInHref={signInHref} onClose={() => setOffer(null)}
          onChoose={(detail) => { setOffer(null); setDirect(false); setNavigating(detail); }} />
      )}
    </section>
  );
}
