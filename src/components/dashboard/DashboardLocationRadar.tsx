'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Compass, LocateFixed, Map as MapIcon, MapPin, PlusCircle, RotateCw, Users } from 'lucide-react';
import type { QuestModel, SpotModel } from '@/lib/api';
import { MiniMapPreview } from '@/components/MiniMapPreview';
import { recognizeSpot } from '@/lib/reverse-geocode';
import { CHECK_IN_RADIUS_M, CrowdPulse, formatDistance, readRadar } from '@/lib/lobby-radar';

export interface LobbyPosition {
  lat: number;
  lng: number;
  /** gps = the traveler's own location; map = where they last looked; default = Lingayen. */
  source: 'gps' | 'map' | 'default';
}

const CROWD_COPY: Record<CrowdPulse, { label: string; tone: string }> = {
  quiet: { label: 'Estimated quiet nearby', tone: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  moderate: { label: 'Estimated moderate nearby', tone: 'text-amber-900 bg-amber-50 border-amber-200' },
  busy: { label: 'Estimated busy nearby', tone: 'text-red-800 bg-red-50 border-red-200' },
  unknown: { label: 'Crowd level unknown', tone: 'text-stone-600 bg-stone-50 border-stone-200' },
  none: { label: 'No places within 5 km', tone: 'text-stone-600 bg-stone-50 border-stone-200' },
};

/**
 * Plan 71 Row 1 (left): where the traveler is and what is around them — town and barangay,
 * nearest destination, quests within 5 km, estimated crowd, and quick Map / Add-spot actions.
 */
export function DashboardLocationRadar({
  position,
  onPositionChange,
  spots,
  quests,
}: {
  position: LobbyPosition;
  onPositionChange: (next: LobbyPosition) => void;
  spots: SpotModel[];
  quests: QuestModel[];
}) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [area, setArea] = useState<{ key: string; label: string } | null>(null);
  const positionKey = `${position.lat.toFixed(4)},${position.lng.toFixed(4)}`;

  const reading = useMemo(() => readRadar(position, spots, quests), [position, spots, quests]);

  // Recognize the town/barangay under the traveler (falls back offline; never blocks the card).
  useEffect(() => {
    const controller = new AbortController();
    recognizeSpot(position.lat, position.lng, controller.signal)
      .then((result) => {
        const label = [result.barangay, result.municipality].filter(Boolean).join(', ');
        if (label) setArea({ key: positionKey, label });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [position.lat, position.lng, positionKey]);

  const locate = (quiet = false) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (!quiet) setLocateError('This browser cannot share your location.');
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onPositionChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' });
      },
      (err) => {
        setLocating(false);
        if (!quiet) {
          setLocateError(err.code === err.PERMISSION_DENIED
            ? 'Location is blocked for this site. Allow it in your browser to see what is near you.'
            : 'We could not get your location. Try again outside or with Wi-Fi on.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  // Locate automatically only when the browser already allows it; never prompt on page load.
  useEffect(() => {
    let cancelled = false;
    navigator.permissions?.query({ name: 'geolocation' as PermissionName })
      .then((status) => { if (!cancelled && status.state === 'granted') locate(true); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const areaLabel = area?.key === positionKey
    ? area.label
    : reading.nearest?.spot.municipality ?? 'Pangasinan';
  const nearest = reading.nearest;
  const withinCheckIn = position.source === 'gps' && nearest !== null && nearest.meters <= CHECK_IN_RADIUS_M;
  const crowd = CROWD_COPY[reading.crowd];
  const mapPoints = useMemo(
    () => reading.spotsNearby.slice(0, 40).map((spot) => ({ lat: spot.gpsLat, lng: spot.gpsLng, title: spot.name })),
    [reading.spotsNearby],
  );
  const coords = `lat=${position.lat.toFixed(6)}&lng=${position.lng.toFixed(6)}`;
  const addSpotHref = position.source === 'gps' ? `/map/add-spot?${coords}&zoom=17` : '/map/add-spot';
  const where = position.source === 'gps' ? 'You are in' : position.source === 'map' ? 'Last viewed' : 'Showing';

  return (
    <section
      aria-labelledby="lobby-radar-title"
      className="h-full bg-white rounded-3xl border border-[#E3DFD5] shadow-xs overflow-hidden flex flex-col min-w-0"
    >
      <div className="relative">
        <MiniMapPreview
          lat={position.lat}
          lng={position.lng}
          zoom={position.source === 'gps' ? 14 : 12}
          height="h-44"
          pinType="destination"
          points={mapPoints}
          hideBadge
          className="rounded-none border-0 border-b"
        />
        <button
          type="button"
          onClick={() => locate(false)}
          disabled={locating}
          className="absolute left-2.5 top-2.5 z-20 inline-flex items-center gap-1.5 rounded-xl bg-white/95 border border-[#E3DFD5] px-2.5 py-1.5 text-[11px] font-extrabold text-[#2D6A4F] shadow-sm hover:bg-white disabled:opacity-70 cursor-pointer"
        >
          {locating ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
          {position.source === 'gps' ? 'Update location' : 'Locate me'}
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#837560]">{where}</p>
          <h2 id="lobby-radar-title" className="text-base sm:text-lg font-black text-[#2C221E] leading-tight truncate">
            {areaLabel}
          </h2>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] p-2.5 min-w-0">
            <dt className="flex items-center gap-1 text-[10px] font-bold text-[#837560]"><MapPin className="w-3 h-3" /> Nearest place</dt>
            <dd className="font-extrabold text-[#2C221E] truncate" title={nearest?.spot.name}>
              {nearest ? `${formatDistance(nearest.meters)} · ${nearest.spot.name}` : 'Loading places…'}
            </dd>
            {withinCheckIn && <dd className="text-[10px] font-black text-emerald-700">Within check-in range</dd>}
          </div>
          <div className="rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] p-2.5 min-w-0">
            <dt className="flex items-center gap-1 text-[10px] font-bold text-[#837560]"><Compass className="w-3 h-3" /> Quests within 5 km</dt>
            <dd className="font-extrabold text-[#2C221E]">
              {reading.questsNearby}
              {reading.rewardNearby > 0 && <span className="text-emerald-700"> · +{reading.rewardNearby.toLocaleString()} pts</span>}
            </dd>
          </div>
          <div className={`col-span-2 rounded-xl border px-2.5 py-2 flex items-center gap-2 ${crowd.tone}`}>
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="font-extrabold">{crowd.label}</span>
            {reading.spotsNearby.length > 0 && (
              <span className="ml-auto text-[10px] opacity-80 shrink-0">{reading.spotsNearby.length} places</span>
            )}
          </div>
        </dl>

        {locateError && <p role="alert" className="text-[10px] text-red-700">{locateError}</p>}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <Link
            href={`/map?${coords}&zoom=${position.source === 'gps' ? 15 : 13}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] px-3 py-2.5 text-xs font-black text-white transition"
          >
            <MapIcon className="w-3.5 h-3.5" /> Open map
          </Link>
          <Link
            href={addSpotHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#2D6A4F]/30 bg-emerald-50 hover:bg-emerald-100 px-3 py-2.5 text-xs font-black text-[#1B4332] transition"
          >
            <PlusCircle className="w-3.5 h-3.5" /> {position.source === 'gps' ? 'Add spot here' : 'Add a spot'}
          </Link>
        </div>
      </div>
    </section>
  );
}
