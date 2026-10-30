'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Compass, MapPin, Sparkles } from 'lucide-react';
import { api, type SpotModel } from '@/lib/api';
import { appRoutes } from '@/lib/routes';
import { categoryLabel } from '@/lib/category-label';
import { calculateHaversineMeters } from '@/lib/reverse-geocode';
import { formatDistance } from '@/lib/lobby-radar';
import { DestinationMedia } from './DestinationMedia';

type Highlight = { id: string; name: string; municipality: string; image_url?: string; reason: string; crowd_status: string };

const CROWD_PILL: Record<string, { label: string; tone: string }> = {
  quiet: { label: 'Estimated quiet', tone: 'bg-emerald-50/95 text-emerald-900 border-emerald-200' },
  moderate: { label: 'Estimated moderate', tone: 'bg-amber-50/95 text-amber-900 border-amber-200' },
};

/**
 * Plan 71 Row 1 (right): today's Hidden Gem spotlight — up to three discovery picks from
 * `/spots/highlights` with photo, estimated crowd, distance (when the traveler shared GPS) and actions.
 * Picks are never sponsored and the crowd level is an estimate, not a live count.
 */
export function HiddenGemHighlights({
  actorId,
  className,
  spots,
  userCoords,
  onFeaturedChange,
}: {
  actorId?: string;
  className?: string;
  /** Loaded destinations, used for each pick's coordinates and category. */
  spots?: SpotModel[];
  /** The traveler's own GPS position; distance is shown only when this is set. */
  userCoords?: { lat: number; lng: number } | null;
  onFeaturedChange?: (spotId: string | null) => void;
}) {
  const [result, setResult] = useState<{ actorId?: string; retry: number; items: Highlight[]; failed: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/spots/highlights', { signal: controller.signal }).then(response => {
      if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error('Invalid highlights');
      if (!controller.signal.aborted) setResult({ actorId, retry, items: response.data.data.slice(0, 3), failed: false });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ actorId, retry, items: [], failed: true });
    });
    return () => controller.abort();
  }, [actorId, retry]);
  const current = result?.actorId === actorId && result?.retry === retry ? result : null;
  const items = current?.items ?? [];
  const safeIndex = items.length > 0 ? index % items.length : 0;
  const spot = items[safeIndex] ?? null;
  const featuredId = spot?.id ?? null;

  useEffect(() => { onFeaturedChange?.(featuredId); }, [featuredId, onFeaturedChange]);

  const details = spot ? spots?.find((s) => s.id === spot.id) : undefined;
  const distance = spot && details && userCoords && Number.isFinite(details.gpsLat) && details.gpsLat !== 0
    ? formatDistance(calculateHaversineMeters(userCoords.lat, userCoords.lng, details.gpsLat, details.gpsLng))
    : null;
  const crowd = spot ? CROWD_PILL[spot.crowd_status] : undefined;

  return (
    <section
      aria-labelledby="hidden-gem-title"
      className={className ?? 'h-full rounded-3xl border border-[#E8DFD1] bg-gradient-to-br from-white via-[#FFFBF3] to-emerald-50/50 shadow-xs overflow-hidden min-w-0'}
    >
      {!current ? (
        <div className="p-5 space-y-3" role="status">
          <SpotlightHeading />
          <p className="text-xs text-[#837560]">Finding discovery picks…</p>
          <div className="h-40 rounded-2xl bg-stone-100 animate-pulse" />
        </div>
      ) : current.failed ? (
        <div className="p-5 space-y-2" role="status">
          <SpotlightHeading />
          <p className="text-xs text-[#837560]">
            Discovery picks are unavailable.{' '}
            <button type="button" className="underline font-bold text-[#2D6A4F]" onClick={() => setRetry(n => n + 1)}>Try again</button>
          </p>
        </div>
      ) : !spot ? (
        <div className="p-5 space-y-2">
          <SpotlightHeading />
          <p className="text-sm text-[#514532]">No eligible hidden gems right now. Explore the destinations below.</p>
          <Link href="/explore" className="inline-flex items-center gap-1 text-xs font-black text-[#2D6A4F] hover:underline">
            Open Explore <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 h-full">
          <div className="relative min-h-[11rem] sm:min-h-full bg-stone-100">
            <DestinationMedia
              src={spot.image_url}
              alt={spot.name}
              destinationName={spot.name}
              municipality={spot.municipality}
              category={details?.category}
              aspectRatio="card"
              href={appRoutes.spot(spot.id)}
              className="h-full w-full [&_img]:h-full [&_img]:object-cover"
            />
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#1B4332]/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200 shadow">
              <Sparkles className="w-3 h-3" /> Hidden gem
            </span>
            {crowd && (
              <span className={`pointer-events-none absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] font-black shadow-sm ${crowd.tone}`}>
                {crowd.label}
              </span>
            )}
            <span className="pointer-events-none absolute left-3 bottom-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1 truncate rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{spot.municipality}{details?.category ? ` · ${categoryLabel(details.category)}` : ''}</span>
            </span>
          </div>

          <div className="p-4 sm:p-5 flex flex-col gap-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <SpotlightHeading />
              {items.length > 1 && (
                <div className="flex items-center gap-1 shrink-0" aria-label="Choose a hidden gem">
                  <button type="button" aria-label="Previous hidden gem" onClick={() => setIndex((safeIndex + items.length - 1) % items.length)}
                    className="w-7 h-7 rounded-lg border border-[#E3DFD5] bg-white hover:bg-stone-50 flex items-center justify-center cursor-pointer">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Next hidden gem" onClick={() => setIndex((safeIndex + 1) % items.length)}
                    className="w-7 h-7 rounded-lg border border-[#E3DFD5] bg-white hover:bg-stone-50 flex items-center justify-center cursor-pointer">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-black text-[#1E1610] leading-tight break-words">{spot.name}</h3>
              <p className="mt-1 text-[11px] text-[#837560]">
                {distance ? <span className="font-extrabold text-[#2D6A4F]">{distance} away · </span> : null}
                {spot.crowd_status === 'unknown' ? 'Crowd level unknown' : crowd ? crowd.label : `Estimated ${spot.crowd_status}`}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Why it&apos;s today&apos;s pick</p>
              <p className="text-xs font-semibold text-[#514532]">{spot.reason}</p>
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              <Link
                href={appRoutes.spot(spot.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] px-3.5 py-2 text-xs font-black text-white transition"
              >
                Explore this place <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/map?spot=${encodeURIComponent(spot.id)}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3DFD5] bg-white hover:bg-stone-50 px-3.5 py-2 text-xs font-black text-[#2C221E] transition"
              >
                <Compass className="w-3.5 h-3.5" /> View on map
              </Link>
            </div>

            {items.length > 1 && (
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {items.map((item, i) => (
                  <span key={item.id} className={`h-1.5 rounded-full transition-all ${i === safeIndex ? 'w-5 bg-[#2D6A4F]' : 'w-1.5 bg-[#D9D1C2]'}`} />
                ))}
              </div>
            )}
            <p className="text-[9px] text-[#837560]">Discovery pick, not a live crowd or popularity measurement.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function SpotlightHeading() {
  return (
    <div className="min-w-0">
      <h2 id="hidden-gem-title" className="text-[11px] font-black uppercase tracking-wider text-[#2D6A4F]">Hidden Gem</h2>
      <p className="text-[10px] text-[#837560]">Today&apos;s spotlight · Not sponsored</p>
    </div>
  );
}
