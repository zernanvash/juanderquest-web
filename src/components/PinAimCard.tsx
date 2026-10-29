'use client';

// Plan 66 stage 1: aim a center crosshair on /map and preview what the system recognizes there.
import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { recognizeSpot } from '@/lib/reverse-geocode';
import { SPOT_POSTING_CATEGORIES, type SpotPostingPin, type SpotRecognition } from '@/lib/spot-posting';
import { appRoutes } from '@/lib/routes';

export const RECOGNIZE_DEBOUNCE_MS = 450;

/** Centered pin reticle over the map; purely visual, so the map stays draggable under it. */
export function PinReticle() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="relative -translate-y-1/2 flex flex-col items-center">
        <MapPin className="h-10 w-10 fill-[#FFB703] text-[#582F0E] drop-shadow-lg motion-safe:animate-bounce" strokeWidth={1.8} />
        <span className="-mt-1 h-1.5 w-4 rounded-full bg-black/30 blur-[1px]" />
      </div>
    </div>
  );
}

export function categoryLabel(category: string, subcategory?: string): string {
  const label = SPOT_POSTING_CATEGORIES.find(c => c.id === category)?.label ?? category.replace(/_/g, ' ');
  return subcategory ? `${label} · ${subcategory.replace(/_/g, ' ')}` : label;
}

export function PinAimCard({ center, onContinue, onUseMyLocation, onCancel, locating = false }: {
  center: SpotPostingPin | null;
  onContinue: (pin: SpotPostingPin, recognition: SpotRecognition | null) => void;
  onUseMyLocation: () => void;
  onCancel: () => void;
  locating?: boolean;
}) {
  const [recognition, setRecognition] = useState<{ key: string; value: SpotRecognition } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const key = center ? `${center.lat.toFixed(5)},${center.lng.toFixed(5)}` : '';

  useEffect(() => {
    if (!center) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      recognizeSpot(center.lat, center.lng, controller.signal)
        .then(value => setRecognition({ key, value }))
        .catch(() => { if (!controller.signal.aborted) setFailedKey(key); });
    }, RECOGNIZE_DEBOUNCE_MS);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [center, key]);

  const current = recognition?.key === key ? recognition.value : null;
  const loading = Boolean(center) && !current && failedKey !== key;
  const title = current?.place_name ?? (current?.barangay || current?.municipality
    ? `New spot in ${[current.barangay, current.municipality].filter(Boolean).join(', ')}`
    : 'New spot here');
  const duplicate = current?.nearby_duplicates[0];

  return (
    <section aria-label="Recognized place" aria-live="polite"
      className="absolute bottom-4 left-1/2 z-30 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[#E3DFD5] bg-white/97 p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#B45309]">Move the map to aim the pin</p>
        <button type="button" onClick={onCancel} aria-label="Cancel adding a spot" className="-mr-1 -mt-1 rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>
      {loading ? (
        <p className="mt-2 flex items-center gap-2 text-sm font-bold text-[#582F0E]"><Loader2 className="h-4 w-4 animate-spin text-[#2D6A4F]" /> Recognizing this place…</p>
      ) : (
        <div className="mt-1.5 space-y-1">
          <h3 className="text-base font-black leading-tight text-[#2C221E]">{title}</h3>
          <p className="text-xs text-[#514532]">{current?.formatted_address ?? 'We could not read the address here. You can still continue and type it.'}</p>
          {current && <p className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-[#2D6A4F]">{categoryLabel(current.suggested_category, current.suggested_subcategory)}</p>}
          {current?.outside_pangasinan && <p className="text-[11px] font-bold text-amber-800">Outside Pangasinan — double-check the pin.</p>}
        </div>
      )}
      {duplicate && (
        <p role="status" className="mt-2 flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Looks close to <strong>{duplicate.name}</strong> ({duplicate.distance_meters} m away). <Link href={appRoutes.spot(duplicate.id)} className="font-bold underline">View existing spot</Link> or continue if this is a different place.</span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onUseMyLocation} disabled={locating}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E3DFD5] bg-white px-3 text-xs font-bold text-[#2D6A4F] transition hover:bg-emerald-50 disabled:opacity-60 cursor-pointer">
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />} Use my location
        </button>
        <button type="button" disabled={!center} onClick={() => center && onContinue(center, current)}
          className="btn-tactile ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#2D6A4F] px-4 text-xs font-black text-white transition hover:bg-[#1B4332] disabled:opacity-60 cursor-pointer">
          Continue with this place <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
