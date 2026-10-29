'use client';

// Plan 70: the Spot Discovery Studio at /map/add-spot. A full page (not a modal) with the map
// on top, a composer, and a live postcard. It always has a pin (see spot-location-handoff).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, AlertTriangle, ArrowLeft, Camera, Check, ChevronDown, Compass, Film, ImagePlus, Loader2,
  LocateFixed, Map as MapIcon, MapPin, Navigation as NavIcon, Pencil, Plus, Sparkles, X, Zap,
} from 'lucide-react';
import { MiniMapPreview } from '@/components/MiniMapPreview';
import { triggerCelebration } from '@/components/CelebrationEffects';
import { useAuth } from '@/lib/auth';
import { appRoutes } from '@/lib/routes';
import { extractPhotoGps, insidePhilippines, metersBetween, type PhotoGps } from '@/lib/exif-gps';
import {
  addSpotHref, clearSpotDraft, isSoftPin, saveLastMapCenter, saveSpotDraft,
  type InitialSpotLocation, type SpotLocationSource, type StudioPin,
} from '@/lib/spot-location-handoff';
import {
  SPOT_BEST_TIME, SPOT_GOOD_FOR, SPOT_POSTING_AMENITIES, SPOT_POSTING_CATEGORIES, appendStoryStarter, subcategoriesForCategory,
} from '@/lib/spot-posting';
import type { SpotModel } from '@/lib/api';
import { useSpotComposer } from './useSpotComposer';

const chip = (selected: boolean) =>
  `rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
    selected ? 'border-[#2D6A4F] bg-emerald-50 text-[#2D6A4F]' : 'border-[#E3DFD5] bg-[#FAF9F5] text-stone-600 hover:bg-stone-50'
  }`;
const labelFor = (list: ReadonlyArray<{ id: string; label: string }>, id: string) =>
  list.find(item => item.id === id)?.label ?? id;
const categoryName = (id: string) => SPOT_POSTING_CATEGORIES.find(c => c.id === id)?.label ?? id;
const PHOTO_SNAP_METERS = 50;
const DRAFT_SAVE_MS = 300;

function Section({ step, title, children, aside }: { step: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2.5 rounded-3xl border border-[#E3DFD5] bg-white p-4 shadow-xs sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-[#582F0E]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2D6A4F] text-[11px] text-white">{step}</span>{title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function SpotDiscoveryStudio({ initial }: { initial: InitialSpotLocation }) {
  const router = useRouter();
  const { user } = useAuth();
  const [pin, setPin] = useState<StudioPin>(initial.pin);
  const [source, setSource] = useState<SpotLocationSource>(initial.source);
  const [locating, setLocating] = useState(false);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const [photoGps, setPhotoGps] = useState<PhotoGps | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const sourceRef = useRef(source);
  useEffect(() => { sourceRef.current = source; }, [source]);

  const movePin = useCallback((next: { lat: number; lng: number; zoom?: number }, why: SpotLocationSource) => {
    setPin(current => ({ lat: next.lat, lng: next.lng, zoom: next.zoom ?? current.zoom }));
    setSource(why);
  }, []);

  // A photo's own GPS: snap a pin we only guessed; offer it when the traveler aimed elsewhere.
  const onMediaSelected = useCallback((file: File) => {
    setPhotoGps(null);
    setPhotoNote(null);
    void extractPhotoGps(file).then(gps => {
      if (!gps) return;
      if (isSoftPin(sourceRef.current)) {
        movePin({ ...gps, zoom: 17 }, 'photo-exif');
        setPhotoNote('✨ Location set from your photo’s GPS');
      } else {
        setPhotoGps(gps);
      }
    });
  }, [movePin]);

  const composer = useSpotComposer({ pin, initialRecognition: initial.recognition, initialDraft: initial.draft, onMediaSelected });
  const { draft, setField, recognition, recognizing, fieldErrors, media } = composer;

  // Tier 3: with no deliberate pin, ask for the device position once (inside the Philippines only).
  const requestGps = useCallback((auto: boolean) => {
    if (!('geolocation' in navigator)) { if (!auto) setGpsNote('This browser cannot share its location. Move the map instead.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = position.coords;
        if (!insidePhilippines(lat, lng)) { if (!auto) setGpsNote('Your location is outside the Philippines. Move the map to the spot.'); return; }
        if (auto && !isSoftPin(sourceRef.current)) return; // the traveler already chose a place
        movePin({ lat, lng, zoom: 17 }, 'user-gps');
        setGpsNote(null);
      },
      () => { setLocating(false); if (!auto) setGpsNote('Location permission is off. Move the map to the spot instead.'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [movePin]);
  useEffect(() => { if (isSoftPin(initial.source)) requestGps(true); }, [initial.source, requestGps]);

  // Keep the URL and the saved draft current so a refresh or sign-in redirect never loses anything.
  useEffect(() => {
    if (composer.publishedSpot) return;
    const timer = window.setTimeout(() => {
      router.replace(addSpotHref(pin), { scroll: false });
      saveLastMapCenter(pin);
      saveSpotDraft({ pin, source, draft, recognition });
      setDraftSavedAt(Date.now());
    }, DRAFT_SAVE_MS);
    return () => window.clearTimeout(timer);
  }, [pin, source, draft, recognition, router, composer.publishedSpot]);

  const handlePublish = async () => {
    const spot = await composer.publish();
    if (!spot) { if (fieldErrors.municipality || fieldErrors.address) setEditAddress(true); return; }
    clearSpotDraft();
    triggerCelebration({ type: 'poppers', particleCount: 140 });
  };

  if (composer.publishedSpot) {
    return <PublishedCelebration spot={composer.publishedSpot} pin={pin} handle={user?.handle ?? null} coverUrl={media.previewUrl ?? media.url}
      onAddAnother={() => { window.location.assign('/map/add-spot'); }} />;
  }

  const place = [recognition?.barangay, draft.municipality || recognition?.municipality].filter(Boolean).join(', ');
  const duplicate = recognition?.nearby_duplicates[0];
  const nameSuggestions = (recognition?.name_suggestions ?? []).filter(name => name !== draft.name).slice(0, 3);
  const photoFar = photoGps && metersBetween(photoGps, pin) > PHOTO_SNAP_METERS ? photoGps : null;
  const checks = [
    { done: Boolean(place) && !recognizing, label: place ? `Pin set in ${draft.municipality || place}` : 'Pin on the map' },
    { done: Boolean(media.assetId), label: media.uploading ? 'Uploading photo…' : media.assetId ? 'Cover photo uploaded' : 'Add a cover photo (optional)' },
    { done: draft.name.trim().length >= 3, label: draft.name.trim() ? `Name: ${draft.name.trim()}` : 'Name the place' },
    { done: draft.description.trim().length >= 20, label: draft.description.trim().length >= 20 ? `Story (${draft.description.trim().length} characters)` : 'Tell travelers why to visit' },
  ];
  const readinessText = media.uploading ? 'Finishing your upload…' : composer.readiness ?? `Ready to publish${draft.municipality ? ` to ${draft.municipality}` : ''}!`;
  const ready = !composer.readiness && !media.uploading;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6 lg:pb-10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/map?lat=${pin.lat.toFixed(6)}&lng=${pin.lng.toFixed(6)}&zoom=${pin.zoom}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3DFD5] bg-white px-3 py-2 text-xs font-bold text-[#582F0E] hover:bg-[#FAF9F5]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to map
        </Link>
        <p className="order-3 w-full text-center text-[11px] font-black uppercase tracking-[0.2em] text-[#2D6A4F] sm:order-none sm:w-auto">
          <Compass className="mr-1 inline h-3.5 w-3.5 text-[#FFB703]" />Spot Discovery Studio · Pangasinan Atlas
        </p>
        <span role="status" className="text-[11px] font-bold text-[#837560]">{draftSavedAt ? <><Check className="mr-0.5 inline h-3 w-3 text-[#2D6A4F]" />Draft saved</> : ' '}</span>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-7">
          {/* 1. Location stage */}
          <Section step={1} title="Where is it?">
            <div className="relative">
              <MiniMapPreview lat={pin.lat} lng={pin.lng} zoom={pin.zoom} interactive reticleMode height="h-56 sm:h-72"
                hideBadge onLocationChange={(lat, lng, zoom) => movePin({ lat, lng, zoom }, 'map-crosshair')} />
              <div className="absolute right-2.5 top-2.5 z-[400] flex gap-1.5">
                <button type="button" onClick={() => requestGps(false)} disabled={locating}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3DFD5] bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-[#2D6A4F] shadow-sm disabled:opacity-60">
                  {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />} Use my GPS
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3" aria-live="polite">
              <p className="flex items-center gap-1.5 text-sm font-black text-[#2D6A4F]">
                <MapPin className="h-4 w-4 shrink-0" />
                {recognizing ? 'Recognizing this place…' : place ? `${place}, Pangasinan` : 'Pinned on the map'}
              </p>
              <p className="mt-0.5 text-[11px] text-[#514532]">{draft.address || 'Move the map so the pin sits on the spot.'}</p>
              {photoNote && <p className="mt-1.5 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-[#2D6A4F]">{photoNote}</p>}
              {source === 'fallback-anchor' && !locating && <p className="mt-1.5 text-[11px] font-bold text-[#B45309]">Starting at Lingayen. Move the map, use your GPS, or add a photo taken at the spot.</p>}
              {gpsNote && <p className="mt-1.5 text-[11px] font-bold text-amber-800">{gpsNote}</p>}
              {recognition?.outside_pangasinan && <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-800"><AlertCircle className="h-3.5 w-3.5" />This pin is outside Pangasinan. Double-check the location.</p>}
              <button type="button" onClick={() => setEditAddress(open => !open)} aria-expanded={editAddress} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#2D6A4F] hover:underline">
                <Pencil className="h-3 w-3" /> {editAddress ? 'Hide address fields' : 'Edit address manually'}
              </button>
              {editAddress && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block text-[11px] font-bold text-[#582F0E]">Municipality / city
                    <input type="text" value={draft.municipality} maxLength={100} onChange={e => setField('municipality', e.target.value, 'location')} placeholder="e.g. Dasol"
                      className="mt-1 w-full rounded-xl border border-[#E3DFD5] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#2D6A4F]" />
                  </label>
                  <label className="block text-[11px] font-bold text-[#582F0E]">Address / landmark
                    <input type="text" value={draft.address} maxLength={300} onChange={e => setField('address', e.target.value, 'location')} placeholder="e.g. Brgy. Tambobong, Dasol"
                      className="mt-1 w-full rounded-xl border border-[#E3DFD5] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#2D6A4F]" />
                  </label>
                </div>
              )}
              {(fieldErrors.municipality || fieldErrors.address || fieldErrors.pin) && (
                <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.pin ?? fieldErrors.municipality ?? fieldErrors.address}</p>
              )}
            </div>
          </Section>

          {/* 2. Photo */}
          <Section step={2} title="Show it">
            <MediaPicker composer={composer} />
            {photoFar && (
              <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-[11px] text-sky-900">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">This photo was taken {Math.round(metersBetween(photoFar, pin))} m from the pin.</span>
                <button type="button" onClick={() => { movePin({ ...photoFar, zoom: 17 }, 'photo-exif'); setPhotoGps(null); setPhotoNote('📍 Pin moved to where the photo was taken'); }}
                  className="rounded-lg bg-white px-2.5 py-1 font-black text-sky-900 ring-1 ring-sky-200">Move pin to photo location</button>
              </div>
            )}
          </Section>

          {/* 3. Name & category */}
          <Section step={3} title="Name it">
            <div className="relative">
              <label htmlFor="studio-name" className="sr-only">Destination name</label>
              <input id="studio-name" type="text" value={draft.name} maxLength={200} onChange={e => setField('name', e.target.value, 'name')} placeholder="e.g. Tambobong White Beach"
                className="w-full rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3.5 py-2.5 pr-9 text-sm outline-none focus:border-[#2D6A4F]" />
              {draft.name && <button type="button" aria-label="Clear name" onClick={() => setField('name', '', 'name')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:text-stone-700"><X className="h-3.5 w-3.5" /></button>}
            </div>
            {recognition?.place_name && draft.name === recognition.place_name && !composer.nameTouched && <p className="text-[10px] font-semibold text-[#2D6A4F]">✨ Recognized from the map</p>}
            {nameSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Name suggestions">
                {nameSuggestions.map(name => <button key={name} type="button" onClick={() => setField('name', name, 'name')} className={chip(false)}>{name}</button>)}
              </div>
            )}
            {duplicate && (
              <p role="status" className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Looks close to <strong>{duplicate.name}</strong> ({duplicate.distance_meters} m away). <Link href={appRoutes.spot(duplicate.id)} className="font-bold underline">View existing spot</Link> or continue if this is a different place.</span>
              </p>
            )}
            {fieldErrors.name && <p className="text-[11px] font-bold text-red-600">{fieldErrors.name}</p>}
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category">
              {SPOT_POSTING_CATEGORIES.map(category => (
                <button key={category.id} type="button" role="radio" aria-checked={draft.category === category.id} className={chip(draft.category === category.id)}
                  onClick={() => { setField('category', category.id, 'category'); setField('subcategory', subcategoriesForCategory(category.id)[0] ?? '', 'category'); }}>
                  {category.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Subcategory">
              {subcategoriesForCategory(draft.category).map(sub => (
                <button key={sub} type="button" role="radio" aria-checked={draft.subcategory === sub} onClick={() => setField('subcategory', sub, 'category')}
                  className={`${chip(draft.subcategory === sub)} capitalize`}>{sub.replace(/_/g, ' ')}</button>
              ))}
            </div>
          </Section>

          {/* 4. Story */}
          <Section step={4} title="Tell its story">
            {(recognition?.story_starters.length ?? 0) > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[#2D6A4F]">✨ Tap to add a sentence:</p>
                <div className="flex flex-col gap-1.5">
                  {recognition!.story_starters.map(starter => {
                    const used = composer.usedStarters.includes(starter);
                    return (
                      <button key={starter} type="button" disabled={used} onClick={() => composer.useStarter(starter, appendStoryStarter)}
                        className={`rounded-xl border px-2.5 py-1.5 text-left text-[11px] transition ${used ? 'border-emerald-200 bg-emerald-50 text-[#2D6A4F]' : 'border-[#E3DFD5] bg-white text-[#514532] hover:border-[#2D6A4F]'}`}>
                        {used ? '✓ ' : '+ '}{starter}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <label htmlFor="studio-description" className="sr-only">What makes it worth visiting?</label>
            <textarea id="studio-description" value={draft.description} onChange={e => setField('description', e.target.value)} rows={4} maxLength={2000}
              placeholder="What makes it worth visiting? What can travelers do, and any honest tips?"
              className="w-full resize-none rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-[#2D6A4F]" />
            <div className="flex items-center justify-between">
              {fieldErrors.description ? <p className="text-[11px] font-bold text-red-600">{fieldErrors.description}</p>
                : <span className={`text-[10px] font-semibold ${draft.description.trim().length >= 20 ? 'text-[#2D6A4F]' : 'text-[#837560]'}`}>{draft.description.trim().length >= 20 ? '✓ Looks good' : 'At least 20 characters.'}</span>}
              <span className="font-mono text-[10px] text-[#837560]">{draft.description.length}/2000</span>
            </div>
          </Section>

          {/* 5. Visitor fit */}
          <VisitorDetails composer={composer} />
        </div>

        {/* Right: live postcard + readiness (sticky on desktop) */}
        <aside className="min-w-0 space-y-4 lg:col-span-5">
          <div className="space-y-4 lg:sticky lg:top-4">
            <Postcard name={draft.name} place={place} category={draft.category} subcategory={draft.subcategory} description={draft.description}
              goodFor={draft.goodFor} bestTime={draft.bestTime} coverUrl={media.previewUrl} coverIsVideo={media.isVideo} handle={user?.handle ?? null} />
            <section aria-label="Discovery readiness" className="hidden rounded-3xl border border-[#E3DFD5] bg-white p-4 shadow-xs lg:block">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#582F0E]">🎯 Discovery readiness</h2>
              <ul className="mt-2 space-y-1.5">
                {checks.map(item => (
                  <li key={item.label} className={`flex items-center gap-2 text-xs ${item.done ? 'text-[#2D6A4F]' : 'text-[#837560]'}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${item.done ? 'bg-[#2D6A4F] text-white' : 'border border-[#E3DFD5]'}`}>{item.done && <Check className="h-3 w-3" />}</span>
                    <span className="truncate">{item.label}</span>
                  </li>
                ))}
              </ul>
              <PublishButton composer={composer} ready={ready} onPublish={handlePublish} className="mt-3 w-full" />
              <p className={`mt-2 text-center text-[11px] font-bold ${ready ? 'text-[#2D6A4F]' : 'text-[#B45309]'}`} aria-live="polite">{readinessText}</p>
            </section>
            {composer.submitError && <div role="alert" className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] font-bold text-red-700"><AlertCircle className="h-3.5 w-3.5 shrink-0" /><span>{composer.submitError}</span></div>}
            <p className="text-[10px] leading-relaxed text-[#837560]">Publishing puts this destination on the map right away. Reports and moderation can update it later.</p>
          </div>
        </aside>
      </div>

      {/* Mobile: sticky publish bar above the bottom navigation (portal: the page wrapper's transform traps fixed elements) */}
      {typeof document !== 'undefined' && createPortal(<div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] z-40 border-t border-[#E3DFD5] bg-white/97 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <p className={`min-w-0 flex-1 truncate text-[11px] font-bold ${ready ? 'text-[#2D6A4F]' : 'text-[#B45309]'}`} aria-live="polite">{readinessText}</p>
          <PublishButton composer={composer} ready={ready} onPublish={handlePublish} />
        </div>
      </div>, document.body)}
    </div>
  );
}

function PublishButton({ composer, ready, onPublish, className = '' }: { composer: ReturnType<typeof useSpotComposer>; ready: boolean; onPublish: () => void; className?: string }) {
  return (
    <button type="button" onClick={() => void onPublish()} disabled={composer.publishing || composer.media.uploading}
      className={`btn-tactile inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black shadow-sm transition disabled:opacity-60 ${ready ? 'bg-[#FFB703] text-[#582F0E] hover:bg-[#F59E0B]' : 'bg-[#2D6A4F] text-white hover:bg-[#1B4332]'} ${className}`}>
      {composer.publishing ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Publishing…</span></> : <><Sparkles className="h-4 w-4" /><span>Publish spot</span></>}
    </button>
  );
}

function MediaPicker({ composer }: { composer: ReturnType<typeof useSpotComposer> }) {
  const camera = useRef<HTMLInputElement | null>(null);
  const gallery = useRef<HTMLInputElement | null>(null);
  const { media } = composer;
  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) composer.selectMedia(file);
  };
  return (
    <div className="space-y-2">
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" data-testid="camera-input" />
      <input ref={gallery} type="file" accept="image/*,video/*" onChange={onPick} className="hidden" data-testid="gallery-input" />
      {!media.file ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => camera.current?.click()} className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#2D6A4F] px-3 text-xs font-black text-white transition hover:bg-[#1B4332]">
            <Camera className="h-4 w-4" /> Take photo
          </button>
          <button type="button" onClick={() => gallery.current?.click()} className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E3DFD5] bg-[#FAF9F5] px-3 text-xs font-bold text-[#582F0E] transition hover:border-[#2D6A4F]">
            <ImagePlus className="h-4 w-4" /> Photo or 30s video
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-[#E3DFD5] p-2">
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-black">
            {media.isVideo ? <video src={media.previewUrl ?? undefined} className="h-full w-full object-cover" muted />
              : <img src={media.previewUrl ?? ''} alt="Selected destination media preview" className="h-full w-full object-cover" />}
            <span className="absolute left-1 top-1 rounded-full bg-black/60 p-0.5 text-white">{media.isVideo ? <Film className="h-3 w-3" /> : <Camera className="h-3 w-3" />}</span>
          </div>
          <div className="min-w-0 flex-1 text-[11px] font-bold">
            {media.uploading ? <span className="flex items-center gap-1.5 text-[#837560]"><Loader2 className="h-3.5 w-3.5 animate-spin text-[#2D6A4F]" />Uploading…</span>
              : media.assetId ? <span className="flex items-center gap-1.5 text-[#2D6A4F]"><Check className="h-3.5 w-3.5" />Uploaded · cover photo</span>
                : <span className="text-red-600">Upload failed</span>}
          </div>
          {!media.uploading && !media.assetId && <button type="button" onClick={composer.retryUpload} className="rounded-lg border border-[#E3DFD5] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#2D6A4F]">Retry upload</button>}
          <button type="button" onClick={composer.removeMedia} className="rounded-lg border border-[#E3DFD5] bg-white px-2.5 py-1.5 text-[10px] font-black text-red-600 hover:bg-red-50">Remove</button>
        </div>
      )}
      {media.error && <p className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2 text-[11px] font-bold text-red-700"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{media.error}</p>}
    </div>
  );
}

function VisitorDetails({ composer }: { composer: ReturnType<typeof useSpotComposer> }) {
  const { draft, setField } = composer;
  const summary = [
    draft.goodFor.map(id => labelFor(SPOT_GOOD_FOR, id).replace(/^\S+\s/, '')).join(' & '),
    draft.bestTime.map(id => labelFor(SPOT_BEST_TIME, id).replace(/^\S+\s/, '')).join('/'),
    draft.dailyHours,
  ].filter(Boolean).join(' · ');
  const toggle = (list: string[], id: string, max: number) => list.includes(id) ? list.filter(x => x !== id) : list.length < max ? [...list, id] : list;
  return (
    <details className="group rounded-3xl border border-[#E3DFD5] bg-white shadow-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 text-xs sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-black text-[#582F0E]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2D6A4F] text-[11px] text-white">5</span>Who it suits</span>{summary && <span className="mt-0.5 block truncate pl-8 text-[11px] text-[#514532]">{summary}</span>}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#2D6A4F]">Edit <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></span>
      </summary>
      <div className="space-y-3 border-t border-[#E8E5DE] px-4 py-3 sm:px-5">
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-bold text-[#582F0E]">Good for <span className="font-normal text-[#837560]">(max 5)</span></legend>
          <div className="flex flex-wrap gap-1.5">{SPOT_GOOD_FOR.map(item => <button key={item.id} type="button" aria-pressed={draft.goodFor.includes(item.id)} className={chip(draft.goodFor.includes(item.id))} onClick={() => setField('goodFor', toggle(draft.goodFor, item.id, 5), 'details')}>{item.label}</button>)}</div>
        </fieldset>
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-bold text-[#582F0E]">Best time to visit <span className="font-normal text-[#837560]">(max 4)</span></legend>
          <div className="flex flex-wrap gap-1.5">{SPOT_BEST_TIME.map(item => <button key={item.id} type="button" aria-pressed={draft.bestTime.includes(item.id)} className={chip(draft.bestTime.includes(item.id))} onClick={() => setField('bestTime', toggle(draft.bestTime, item.id, 4), 'details')}>{item.label}</button>)}</div>
        </fieldset>
        <label className="block text-xs font-bold text-[#582F0E]">Operating hours
          <input type="text" value={draft.dailyHours} maxLength={80} onChange={e => setField('dailyHours', e.target.value, 'details')} placeholder="e.g. 06:00 AM - 06:00 PM"
            className="mt-1 w-full rounded-xl border border-[#E3DFD5] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#2D6A4F]" />
        </label>
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-bold text-[#582F0E]">Amenities</legend>
          <div className="flex flex-wrap gap-1.5">{SPOT_POSTING_AMENITIES.map(amenity => <button key={amenity} type="button" aria-pressed={draft.amenities.includes(amenity)} className={`${chip(draft.amenities.includes(amenity))} capitalize`} onClick={() => setField('amenities', draft.amenities.includes(amenity) ? draft.amenities.filter(a => a !== amenity) : [...draft.amenities, amenity], 'details')}>{amenity.replace(/_/g, ' ')}</button>)}</div>
        </fieldset>
      </div>
    </details>
  );
}

export function Postcard({ name, place, category, subcategory, description, goodFor, bestTime, coverUrl, coverIsVideo, handle, stamp }: {
  name: string; place: string; category: string; subcategory: string; description: string; goodFor: string[]; bestTime: string[];
  coverUrl: string | null; coverIsVideo?: boolean; handle: string | null; stamp?: boolean;
}) {
  return (
    <section aria-label="Explorer postcard preview" className="overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-md">
      {!stamp && <p className="border-b border-[#E8E5DE] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#2D6A4F]">✨ Live atlas postcard</p>}
      <div className="relative h-40 bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#FFB703]/70">
        {coverUrl && (coverIsVideo ? <video src={coverUrl} className="h-full w-full object-cover" muted /> : <img src={coverUrl} alt="" className="h-full w-full object-cover" />)}
        {!coverUrl && <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-5xl opacity-40">🏝️</span>}
        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-white">{categoryName(category)}{subcategory ? ` · ${subcategory.replace(/_/g, ' ')}` : ''}</span>
        {stamp && <span className="absolute right-3 top-3 rotate-3 rounded-lg border-2 border-[#FFB703] bg-[#582F0E]/85 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#FFD166]">✨ Discovered by {handle ? `@${handle}` : 'you'}</span>}
      </div>
      <div className="space-y-1.5 p-4">
        <h3 className="text-lg font-black leading-tight text-[#2C221E]">{name.trim() || 'Your new spot'}</h3>
        <p className="flex items-center gap-1 text-xs font-bold text-[#2D6A4F]"><MapPin className="h-3.5 w-3.5" />{place || 'Pangasinan'}</p>
        <p className="line-clamp-3 text-xs leading-relaxed text-[#514532]">{description.trim() || 'Your story about this place will appear here.'}</p>
        {(goodFor.length > 0 || bestTime.length > 0) && (
          <div className="flex flex-wrap gap-1 pt-1">
            {[...goodFor.map(id => labelFor(SPOT_GOOD_FOR, id)), ...bestTime.map(id => labelFor(SPOT_BEST_TIME, id))].slice(0, 4).map(label =>
              <span key={label} className="rounded-full bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-semibold text-[#582F0E] ring-1 ring-[#E3DFD5]">{label}</span>)}
          </div>
        )}
        {!stamp && <p className="pt-1 text-[10px] text-[#837560]">Discovered by {handle ? `@${handle}` : 'you'}</p>}
      </div>
    </section>
  );
}

function PublishedCelebration({ spot, pin, handle, coverUrl, onAddAnother }: {
  spot: SpotModel; pin: StudioPin; handle: string | null; coverUrl: string | null; onAddAnother: () => void;
}) {
  const lat = Number.isFinite(spot.gpsLat) ? spot.gpsLat : pin.lat, lng = Number.isFinite(spot.gpsLng) ? spot.gpsLng : pin.lng;
  const actions = [
    { href: `/map?spot=${encodeURIComponent(spot.id)}&lat=${lat}&lng=${lng}&zoom=16`, label: 'View pin on map', icon: MapIcon, primary: true },
    { href: `/spots/${encodeURIComponent(spot.slug || spot.id)}/quests/new`, label: 'Create a quest here', icon: Zap },
    { href: `/navigate?name=${encodeURIComponent(spot.name)}&lat=${lat}&lng=${lng}`, label: 'Navigate here', icon: NavIcon },
  ];
  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-4 py-8 text-center">
      <div className="space-y-1">
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#B45309]">Pinned to the Pangasinan Atlas</p>
        <h1 className="text-2xl font-black text-[#582F0E]">{spot.name} is on the map!</h1>
        <p className="text-sm text-[#514532]">Thank you for charting a new discovery. Travelers can find it right away.</p>
      </div>
      <div className="text-left">
        <Postcard stamp name={spot.name} place={[spot.municipality].filter(Boolean).join(', ')} category={spot.category} subcategory={spot.subcategory ?? ''}
          description={spot.description} goodFor={[]} bestTime={[]} coverUrl={coverUrl || spot.imageUrl || null} handle={handle} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map(({ href, label, icon: Icon, primary }) => (
          <Link key={label} href={href} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black ${primary ? 'bg-[#2D6A4F] text-white hover:bg-[#1B4332] sm:col-span-2' : 'border border-[#E3DFD5] bg-white text-[#2D6A4F] hover:bg-emerald-50'}`}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        ))}
        <button type="button" onClick={onAddAnother} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-4 py-3 text-xs font-black text-[#582F0E] hover:bg-white sm:col-span-2">
          <Plus className="h-4 w-4" />Add another spot
        </button>
      </div>
    </div>
  );
}
