'use client';

// Plan 64: navigate a chosen trail. The road route runs from the traveler through every stop
// still to visit, in order; the panel shows the next stop, its ETA and turns, and offers the
// check-in on arrival. Finishing pays the completion reward.
import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Flag, Loader2, LocateFixed, MapPin, Navigation2, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { fetchRoute, type RouteModel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatMinutes } from '@/lib/trip-api';
import { checkInTrailStop, type TrailDetail, type TrailStop } from '@/lib/trails-api';
import type { MapOverlay } from '@/components/map/VectorMapCanvas';

type Point = { lat: number; lng: number };
const metres = (a: Point, b: Point) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};
const REROUTE_AFTER_M = 250;

export function TrailNavigator({ trail: initial, userLocation, onOverlay, onExit }: {
  trail: TrailDetail;
  userLocation?: Point | null;
  onOverlay: (overlay: MapOverlay | null) => void;
  onExit: () => void;
}) {
  const { refreshProfile } = useAuth();
  const [trail, setTrail] = useState(initial);
  const [here, setHere] = useState<(Point & { accuracy?: number }) | null>(userLocation ?? null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [nextLeg, setNextLeg] = useState<RouteModel | null>(null);
  const [routing, setRouting] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [error, setError] = useState('');
  const routedFrom = useRef<Point | null>(null);

  const stops = trail.stops ?? [];
  const remaining = stops.filter((stop) => !stop.checked_in);
  const next: TrailStop | undefined = remaining[0];
  const doneCount = stops.length - remaining.length;

  // Follow the traveler while navigating.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation?.watchPosition) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => setLocationDenied(true),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const draw = (route: RouteModel | null) => {
    onOverlay({
      line: route ? route.coordinates.map(([lat, lng]) => [lng, lat]) : stops.map((stop) => [stop.lng, stop.lat]),
      points: [
        ...(here ? [{ lng: here.lng, lat: here.lat, label: '•', kind: 'start' as const }] : []),
        ...stops.map((stop) => ({ lng: stop.lng, lat: stop.lat, label: String(stop.position), kind: stop.checked_in ? 'done' as const : 'stop' as const })),
      ],
    });
  };

  // Route: from the traveler through every remaining stop; plus the next leg for ETA and turns.
  const route = async (from: Point | null) => {
    if (!remaining.length) { draw(null); return; }
    setRouting(true); setError('');
    try {
      const origin = from ?? { lat: remaining[0].lat, lng: remaining[0].lng };
      const path = from ? remaining : remaining.slice(1);
      const last = path[path.length - 1] ?? remaining[0];
      const full = await fetchRoute({ startLat: origin.lat, startLng: origin.lng, endLat: last.lat, endLng: last.lng,
        via: path.slice(0, -1).map((stop) => ({ lat: stop.lat, lng: stop.lng })) });
      draw(full);
      setNextLeg(from ? await fetchRoute({ startLat: from.lat, startLng: from.lng, endLat: remaining[0].lat, endLng: remaining[0].lng }) : null);
      routedFrom.current = from;
    } catch {
      draw(null);
      setError('Road routing is unavailable right now; showing the stops in order.');
    } finally { setRouting(false); }
  };

  useEffect(() => {
    const last = routedFrom.current;
    if (here && last && metres(here, last) < REROUTE_AFTER_M) return;
    void route(here);
    // Re-route when the traveler has moved or a stop was checked in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here?.lat, here?.lng, remaining.length]);

  const distanceToNext = here && next ? metres(here, next) : null;
  const arrived = distanceToNext !== null && next ? distanceToNext <= next.checkin_radius_m + 30 : false;

  const checkIn = async () => {
    if (!next || !here) return;
    setCheckingIn(true); setError('');
    try {
      const result = await checkInTrailStop(trail.id, next.position, { lat: here.lat, lng: here.lng, accuracy_m: Math.round(here.accuracy ?? 20) });
      const done = new Set(result.progress.filter((stop) => stop.checked_in).map((stop) => stop.position));
      setTrail({ ...trail, stops: stops.map((stop) => ({ ...stop, checked_in: done.has(stop.position) })) });
      routedFrom.current = null;
      if (result.completion) { setReward(result.completion.reward_points); void refreshProfile(); }
    } catch (err) {
      const code = isAxiosError(err) ? (err.response?.data as { error?: { code?: string } })?.error?.code : undefined;
      setError(code === 'TOO_FAR_FROM_STOP' ? 'You are not close enough to this stop yet.'
        : code === 'LOCATION_ACCURACY_TOO_LOW' ? 'Your location is not precise enough yet. Step outside and try again.'
          : 'Check-in failed. Please try again.');
    } finally { setCheckingIn(false); }
  };

  return (
    <section className="space-y-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5" aria-label="Trail navigation">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#2D6A4F]"><Navigation2 className="h-3.5 w-3.5" /> Navigating</p>
          <h3 className="truncate text-sm font-bold text-[#1F2A24]">{trail.title}</h3>
          <p className="text-[11px] text-[#514532]">{doneCount} of {stops.length} stops</p>
        </div>
        <button type="button" onClick={onExit} className="flex min-h-[40px] items-center gap-1 rounded-xl border border-[#E3DFD5] bg-white px-2.5 text-[11px] font-semibold text-[#514532] cursor-pointer">
          <X className="h-3.5 w-3.5" /> End
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-emerald-100" role="progressbar" aria-label="Stops visited" aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={doneCount}>
        <div className="h-1.5 rounded-full bg-[#2D6A4F]" style={{ width: `${stops.length ? (doneCount / stops.length) * 100 : 0}%` }} />
      </div>

      {reward !== null || !next ? (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-[#2D6A4F] px-3 py-2.5 text-[12px] font-bold text-white">
          <Flag className="h-4 w-4" /> Trail complete!{reward !== null ? ` +${reward} points` : ''}
        </p>
      ) : (
        <div className="space-y-2 rounded-xl border border-emerald-100 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#6F6352]">Next stop · {next.position} of {stops.length}</p>
          <p className="text-[14px] font-bold text-[#1F2A24]">{next.name}</p>
          <p className="text-[11px] text-[#514532]">
            {routing ? 'Finding the road…' : nextLeg ? `${nextLeg.summary.distanceKm.toFixed(1)} km · ${nextLeg.summary.durationFormatted}` : here ? '' : 'Turn on location for turn-by-turn directions.'}
            {distanceToNext !== null && !arrived ? ` · ${distanceToNext < 1000 ? `${Math.round(distanceToNext)} m` : `${(distanceToNext / 1000).toFixed(1)} km`} away` : ''}
          </p>
          {next.narration && <p className="text-[11px] leading-relaxed text-[#514532]">{next.narration}</p>}
          {arrived ? (
            <button type="button" onClick={() => void checkIn()} disabled={checkingIn}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#2D6A4F] text-[13px] font-bold text-white disabled:opacity-60 cursor-pointer">
              {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} You&apos;re here · check in
            </button>
          ) : nextLeg && nextLeg.maneuvers.length > 0 ? (
            <div>
              <p className="flex items-start gap-1.5 text-[12px] font-semibold text-[#1F2A24]"><LocateFixed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D6A4F]" />{nextLeg.maneuvers[0].instruction}</p>
              <button type="button" onClick={() => setShowSteps((v) => !v)} aria-expanded={showSteps}
                className="mt-1 flex min-h-[36px] items-center gap-1 text-[11px] font-semibold text-[#2D6A4F] cursor-pointer">
                <ChevronDown className={`h-3.5 w-3.5 transition ${showSteps ? 'rotate-180' : ''}`} /> {showSteps ? 'Hide' : 'All'} {nextLeg.maneuvers.length} steps
              </button>
              {showSteps && (
                <ol className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                  {nextLeg.maneuvers.map((step, i) => (
                    <li key={i} className="text-[11px] text-[#514532]">{i + 1}. {step.instruction}{step.distanceMeters ? ` (${step.distanceMeters < 1000 ? `${step.distanceMeters} m` : `${(step.distanceMeters / 1000).toFixed(1)} km`})` : ''}</li>
                  ))}
                </ol>
              )}
            </div>
          ) : null}
        </div>
      )}

      <ol className="space-y-1" aria-label="Trail stops">
        {stops.map((stop) => (
          <li key={stop.position} className="flex items-center gap-2 text-[11px] text-[#514532]">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-black text-white ${stop.checked_in ? 'bg-[#2D6A4F]' : stop === next ? 'bg-[#F4A261]' : 'bg-[#C9C2B2]'}`}>
              {stop.checked_in ? <Check className="h-3 w-3" /> : stop.position}
            </span>
            <span className={stop === next ? 'font-bold text-[#1F2A24]' : ''}>{stop.name}</span>
            {stop.position > 1 && <span className="ml-auto text-[10px] text-[#6F6352]">{formatMinutes(stop.leg_minutes)}</span>}
          </li>
        ))}
      </ol>
      {locationDenied && <p className="flex items-center gap-1 text-[11px] text-[#6F6352]"><MapPin className="h-3.5 w-3.5" /> Allow location access to navigate and check in.</p>}
      {error && <p role="alert" className="text-[11px] font-semibold text-[#9B2226]">{error}</p>}
    </section>
  );
}
