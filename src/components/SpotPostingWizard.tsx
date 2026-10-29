'use client';

// Plan 66 stage 2: one pre-filled "Smart Draft" page instead of the 6-step wizard.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Film,
  ImagePlus,
  Loader2,
  MapPin,
  PartyPopper,
  Pencil,
  Sparkles,
  X,
} from 'lucide-react';
import { api, normalizeSpot, uploadSpotMedia } from '@/lib/api';
import type { SpotModel } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';
import { appRoutes } from '@/lib/routes';
import { recognizeSpot } from '@/lib/reverse-geocode';
import {
  SPOT_BEST_TIME,
  SPOT_GOOD_FOR,
  SPOT_POSTING_AMENITIES,
  SPOT_POSTING_CATEGORIES,
  appendStoryStarter,
  applyRecognitionToDraft,
  buildSpotPayload,
  createSpotPostingDraft,
  postingReadiness,
  subcategoriesForCategory,
  validatePostingMediaFile,
  validatePostingStep,
} from '@/lib/spot-posting';
import type { SpotPostingDraft, SpotPostingPin, SpotPostingTouched, SpotRecognition } from '@/lib/spot-posting';

export interface SpotPostingWizardProps {
  pin: SpotPostingPin | null;
  minimized: boolean;
  onClose: () => void;
  onRequestMovePin: () => void;
  onPublished: (spot: SpotModel) => void;
  /** Recognition already fetched for this pin by the map's aim card (skips a second lookup). */
  initialRecognition?: SpotRecognition | null;
}

const chip = (selected: boolean) =>
  `rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
    selected ? 'border-[#2D6A4F] bg-emerald-50 text-[#2D6A4F]' : 'border-[#E3DFD5] bg-[#FAF9F5] text-stone-600 hover:bg-stone-50'
  }`;
const pinKey = (pin: SpotPostingPin | null) => (pin ? `${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}` : '');
const labelFor = (list: ReadonlyArray<{ id: string; label: string }>, id: string) =>
  list.find(item => item.id === id)?.label.replace(/^\S+\s/, '') ?? id;

export const SpotPostingWizard: React.FC<SpotPostingWizardProps> = ({
  pin,
  minimized,
  onClose,
  onRequestMovePin,
  onPublished,
  initialRecognition = null,
}) => {
  const [draft, setDraft] = useState<SpotPostingDraft>(() => {
    const base = createSpotPostingDraft(pin);
    return initialRecognition ? applyRecognitionToDraft(base, initialRecognition) : base;
  });
  const [recognition, setRecognition] = useState<SpotRecognition | null>(initialRecognition);
  const [recognizing, setRecognizing] = useState(false);
  const touched = useRef<SpotPostingTouched>({});
  const [nameTouched, setNameTouched] = useState(false);
  const recognizedPin = useRef(initialRecognition ? pinKey(pin) : '');
  const [usedStarters, setUsedStarters] = useState<string[]>([]);
  const [editAddress, setEditAddress] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [publishedSpot, setPublishedSpot] = useState<SpotModel | null>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaIsVideo, setMediaIsVideo] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Recognize the pin whenever it moves (the aim card may already have done it for this pin).
  useEffect(() => {
    if (!pin) return;
    const key = pinKey(pin);
    setDraft(current => ({ ...current, pin }));
    if (recognizedPin.current === key) return;
    const controller = new AbortController();
    setRecognizing(true);
    recognizeSpot(pin.lat, pin.lng, controller.signal)
      .then(value => {
        recognizedPin.current = key;
        setRecognition(value);
        setDraft(current => applyRecognitionToDraft({ ...current, pin }, value, touched.current));
      })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setRecognizing(false); });
    return () => controller.abort();
  }, [pin]);

  useEffect(() => () => { if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl); }, [mediaPreviewUrl]);

  useEffect(() => {
    if (!minimized) dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, [minimized]);

  const setField = useCallback(<K extends keyof SpotPostingDraft>(key: K, value: SpotPostingDraft[K], mark?: keyof SpotPostingTouched) => {
    if (mark) touched.current = { ...touched.current, [mark]: true };
    if (mark === 'name') setNameTouched(true);
    setDraft(current => ({ ...current, [key]: value }));
    setFieldErrors(current => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }, []);

  const handleClose = useCallback(() => { if (!publishing) onClose(); }, [publishing, onClose]);

  const handleDialogKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.stopPropagation(); handleClose(); return; }
    if (event.key !== 'Tab') return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([type="file"]):not([disabled]), textarea, select, summary, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, [handleClose]);

  const uploadMediaFile = useCallback(async (file: File) => {
    setMediaUploading(true);
    setMediaError(null);
    try {
      const asset = await uploadSpotMedia(file);
      setMediaAssetId(asset.asset_id);
      setMediaUrl(asset.url);
      setMediaIsVideo(asset.media_type ? asset.media_type === 'video' : file.type.startsWith('video/'));
    } catch (err) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } } };
      setMediaError(errorObj.response?.data?.error?.message || 'Media upload failed. Please try again.');
    } finally {
      setMediaUploading(false);
    }
  }, []);

  const handleMediaSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const fileError = validatePostingMediaFile(file);
    if (fileError) { setMediaError(fileError); return; }
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setMediaIsVideo(file.type.startsWith('video/'));
    setMediaAssetId(null);
    setMediaUrl(null);
    void uploadMediaFile(file); // starts right away so publishing never waits on the upload
  }, [mediaPreviewUrl, uploadMediaFile]);

  const handleMediaRemove = useCallback(() => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaAssetId(null);
    setMediaUrl(null);
    setMediaError(null);
    setMediaIsVideo(false);
  }, [mediaPreviewUrl]);

  const handlePublish = useCallback(async () => {
    if (publishing || publishedSpot || mediaUploading) return;
    const errors = validatePostingStep('review', draft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.municipality || errors.address) setEditAddress(true);
      return;
    }
    setPublishing(true);
    setSubmitError(null);
    try {
      const res = await api.post('/spots', buildSpotPayload(draft, { assetId: mediaAssetId, imageUrl: mediaUrl }));
      const data = res.data?.data;
      if (res.data?.success && data?.id) {
        invalidateCache('spots');
        const spot = normalizeSpot(data);
        setPublishedSpot(spot);
        onPublished(spot);
      } else {
        setSubmitError('The server did not confirm the new destination. Please try again.');
      }
    } catch (err) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } } };
      setSubmitError(errorObj.response?.data?.error?.message || 'Failed to publish the destination. Your answers are kept — retry when ready.');
    } finally {
      setPublishing(false);
    }
  }, [draft, mediaAssetId, mediaUploading, mediaUrl, onPublished, publishedSpot, publishing]);

  const readiness = postingReadiness(draft);
  const duplicate = recognition?.nearby_duplicates[0];
  const detailsSummary = [
    draft.goodFor.map(id => labelFor(SPOT_GOOD_FOR, id)).join(' & '),
    draft.bestTime.map(id => labelFor(SPOT_BEST_TIME, id)).join('/'),
    draft.dailyHours,
  ].filter(Boolean).join(' · ');
  const nameSuggestions = (recognition?.name_suggestions ?? []).filter(name => name !== draft.name).slice(0, 3);

  return (
    <div className={`fixed inset-0 z-[90] flex items-end justify-center bg-black/50 sm:items-center sm:p-4 ${minimized ? 'hidden' : ''}`} aria-hidden={minimized}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spot-posting-title"
        onKeyDown={handleDialogKeyDown}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#E3DFD5] bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        {publishedSpot ? (
          <div className="space-y-4 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#2D6A4F]"><PartyPopper className="h-7 w-7" /></div>
            <div className="space-y-1">
              <h2 id="spot-posting-title" className="text-lg font-black text-[#582F0E]">Destination published</h2>
              <p className="text-xs text-[#514532]">{publishedSpot.name} is now on the map. Plan a trail through it or get directions.</p>
            </div>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
              <Link href={`/map?spot=${encodeURIComponent(publishedSpot.id)}&trip=1`} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#2D6A4F] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#1B4332]">
                <span>Trails &amp; directions</span><ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href={appRoutes.spot(publishedSpot.id)} className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#E3DFD5] bg-white px-5 py-3 text-xs font-bold text-[#2D6A4F]">View destination</Link>
              <button type="button" onClick={onClose} className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-5 py-3 text-xs font-bold text-[#582F0E] transition hover:bg-white">Back to map</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-[#E8E5DE] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#2D6A4F]"><Sparkles className="h-4 w-4" /></span>
                <h2 id="spot-posting-title" className="text-sm font-black text-[#582F0E]">Add this place</h2>
              </div>
              <button type="button" onClick={handleClose} disabled={publishing} aria-label="Close posting wizard" className="rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {/* 1. Recognized location */}
              <section aria-label="Location" className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-black text-[#2D6A4F]">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {recognizing ? 'Recognizing this place…' : draft.municipality ? [recognition?.barangay, draft.municipality].filter(Boolean).join(', ') : 'Pinned on the map'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#514532]">{draft.address || 'Type the town and a landmark below.'}</p>
                  </div>
                  <button type="button" onClick={onRequestMovePin} className="shrink-0 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[10px] font-black text-[#2D6A4F] transition hover:bg-emerald-50 cursor-pointer">Adjust pin</button>
                </div>
                {recognition?.outside_pangasinan && <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-800"><AlertCircle className="h-3.5 w-3.5" />This pin is outside Pangasinan. Double-check the location.</p>}
                <button type="button" onClick={() => setEditAddress(open => !open)} aria-expanded={editAddress} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#2D6A4F] hover:underline cursor-pointer">
                  <Pencil className="h-3 w-3" /> {editAddress ? 'Hide address fields' : 'Edit address manually'}
                </button>
                {editAddress && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="block text-[11px] font-bold text-[#582F0E]">Municipality / city
                      <input type="text" value={draft.municipality} maxLength={100} onChange={e => setField('municipality', e.target.value, 'location')} placeholder="e.g. Dasol"
                        className="mt-1 w-full rounded-xl border border-[#E3DFD5] bg-white px-3 py-2 text-sm font-normal text-[#2C221E] outline-none focus:border-[#2D6A4F]" />
                    </label>
                    <label className="block text-[11px] font-bold text-[#582F0E]">Address / landmark
                      <input type="text" value={draft.address} maxLength={300} onChange={e => setField('address', e.target.value, 'location')} placeholder="e.g. Brgy. Tambobong, Dasol"
                        className="mt-1 w-full rounded-xl border border-[#E3DFD5] bg-white px-3 py-2 text-sm font-normal text-[#2C221E] outline-none focus:border-[#2D6A4F]" />
                    </label>
                  </div>
                )}
                {(fieldErrors.municipality || fieldErrors.address || fieldErrors.pin) && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.pin ?? fieldErrors.municipality ?? fieldErrors.address}</p>
                )}
              </section>

              {/* 2. Photo / video */}
              <section aria-label="Photo" className="space-y-2">
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleMediaSelect} className="hidden" data-testid="camera-input" />
                <input ref={galleryInputRef} type="file" accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" data-testid="gallery-input" />
                {!mediaFile ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#2D6A4F] px-3 text-xs font-black text-white transition hover:bg-[#1B4332] cursor-pointer">
                      <Camera className="h-4 w-4" /> Take photo
                    </button>
                    <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E3DFD5] bg-[#FAF9F5] px-3 text-xs font-bold text-[#582F0E] transition hover:border-[#2D6A4F] cursor-pointer">
                      <ImagePlus className="h-4 w-4" /> Photo or 30s video
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-[#E3DFD5] p-2">
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-black">
                      {mediaIsVideo
                        ? <video src={mediaPreviewUrl ?? undefined} className="h-full w-full object-cover" muted />
                        : <img src={mediaPreviewUrl ?? ''} alt="Selected destination media preview" className="h-full w-full object-cover" />}
                      <span className="absolute left-1 top-1 rounded-full bg-black/60 p-0.5 text-white">{mediaIsVideo ? <Film className="h-3 w-3" /> : <Camera className="h-3 w-3" />}</span>
                    </div>
                    <div className="min-w-0 flex-1 text-[11px] font-bold">
                      {mediaUploading ? <span className="flex items-center gap-1.5 text-[#837560]"><Loader2 className="h-3.5 w-3.5 animate-spin text-[#2D6A4F]" />Uploading…</span>
                        : mediaAssetId ? <span className="flex items-center gap-1.5 text-[#2D6A4F]"><Check className="h-3.5 w-3.5" />Uploaded · cover photo</span>
                          : <span className="text-red-600">Upload failed</span>}
                    </div>
                    {!mediaUploading && !mediaAssetId && mediaFile && (
                      <button type="button" onClick={() => void uploadMediaFile(mediaFile)} className="rounded-lg border border-[#E3DFD5] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#2D6A4F]">Retry upload</button>
                    )}
                    <button type="button" onClick={handleMediaRemove} className="rounded-lg border border-[#E3DFD5] bg-white px-2.5 py-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-50">Remove</button>
                  </div>
                )}
                {mediaError && <p className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2 text-[11px] font-bold text-red-700"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{mediaError}</p>}
              </section>

              {/* 3. Name */}
              <section aria-label="Name" className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="posting-name" className="block text-xs font-bold text-[#582F0E]">Destination name <span className="text-red-500">*</span></label>
                  {recognition?.place_name && draft.name === recognition.place_name && !nameTouched && <span className="text-[10px] font-semibold text-[#2D6A4F]">✨ Auto-filled from map</span>}
                </div>
                <div className="relative">
                  <input id="posting-name" data-autofocus type="text" value={draft.name} maxLength={200} onChange={e => setField('name', e.target.value, 'name')} placeholder="e.g. Tambobong White Beach"
                    className="w-full rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3.5 py-2.5 pr-9 text-sm text-[#2C221E] outline-none focus:border-[#2D6A4F]" />
                  {draft.name && <button type="button" aria-label="Clear name" onClick={() => setField('name', '', 'name')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 hover:text-stone-700"><X className="h-3.5 w-3.5" /></button>}
                </div>
                {nameSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" aria-label="Name suggestions">
                    {nameSuggestions.map(name => <button key={name} type="button" onClick={() => setField('name', name, 'name')} className={chip(false)}>{name}</button>)}
                  </div>
                )}
                {duplicate && (
                  <p role="status" className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Looks close to <strong>{duplicate.name}</strong> ({duplicate.distance_meters} m away). <Link href={appRoutes.spot(duplicate.id)} className="font-bold underline">View existing spot</Link> or continue if it is a different place.</span>
                  </p>
                )}
                {fieldErrors.name && <p className="text-[11px] font-bold text-red-600">{fieldErrors.name}</p>}
              </section>

              {/* 4. Category */}
              <section aria-label="Category" className="space-y-1.5">
                <span className="block text-xs font-bold text-[#582F0E]">Category</span>
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
              </section>

              {/* 5. Story */}
              <section aria-label="Description" className="space-y-1.5">
                <label htmlFor="posting-description" className="block text-xs font-bold text-[#582F0E]">What makes it worth visiting? <span className="text-red-500">*</span></label>
                {(recognition?.story_starters.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#2D6A4F]">✨ Tap to build your description:</p>
                    <div className="flex flex-col gap-1.5">
                      {recognition!.story_starters.map(starter => {
                        const used = usedStarters.includes(starter);
                        return (
                          <button key={starter} type="button" disabled={used}
                            onClick={() => { setField('description', appendStoryStarter(draft.description, starter)); setUsedStarters(list => [...list, starter]); }}
                            className={`rounded-xl border px-2.5 py-1.5 text-left text-[11px] transition cursor-pointer ${used ? 'border-emerald-200 bg-emerald-50 text-[#2D6A4F]' : 'border-[#E3DFD5] bg-white text-[#514532] hover:border-[#2D6A4F]'}`}>
                            {used ? '✓ ' : '+ '}{starter}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <textarea id="posting-description" value={draft.description} onChange={e => setField('description', e.target.value)} rows={4} maxLength={2000}
                  placeholder="Describe the place, what travelers can do, and any honest tips."
                  className="w-full resize-none rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3.5 py-2.5 text-sm leading-relaxed text-[#2C221E] outline-none focus:border-[#2D6A4F]" />
                <div className="flex items-center justify-between">
                  {fieldErrors.description ? <p className="text-[11px] font-bold text-red-600">{fieldErrors.description}</p>
                    : <span className={`text-[10px] font-semibold ${draft.description.trim().length >= 20 ? 'text-[#2D6A4F]' : 'text-[#837560]'}`}>{draft.description.trim().length >= 20 ? '✓ Description looks good' : 'At least 20 characters.'}</span>}
                  <span className="font-mono text-[10px] text-[#837560]">{draft.description.length}/2000</span>
                </div>
              </section>

              {/* 6. Visitor details (pre-filled, collapsed) */}
              <details className="group rounded-2xl border border-[#E3DFD5] bg-[#FAF9F5]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-xs [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0"><span className="font-bold text-[#582F0E]">✨ Visitor details</span>{detailsSummary && <span className="block truncate text-[11px] text-[#514532]">{detailsSummary}</span>}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#2D6A4F]">Edit <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></span>
                </summary>
                <div className="space-y-3 border-t border-[#E8E5DE] px-3.5 py-3">
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-bold text-[#582F0E]">Good for <span className="font-normal text-[#837560]">(max 5)</span></legend>
                    <div className="flex flex-wrap gap-1.5">
                      {SPOT_GOOD_FOR.map(item => {
                        const selected = draft.goodFor.includes(item.id);
                        return <button key={item.id} type="button" aria-pressed={selected} className={chip(selected)}
                          onClick={() => setField('goodFor', selected ? draft.goodFor.filter(id => id !== item.id) : draft.goodFor.length < 5 ? [...draft.goodFor, item.id] : draft.goodFor, 'details')}>{item.label}</button>;
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-bold text-[#582F0E]">Best time to visit <span className="font-normal text-[#837560]">(max 4)</span></legend>
                    <div className="flex flex-wrap gap-1.5">
                      {SPOT_BEST_TIME.map(item => {
                        const selected = draft.bestTime.includes(item.id);
                        return <button key={item.id} type="button" aria-pressed={selected} className={chip(selected)}
                          onClick={() => setField('bestTime', selected ? draft.bestTime.filter(id => id !== item.id) : draft.bestTime.length < 4 ? [...draft.bestTime, item.id] : draft.bestTime, 'details')}>{item.label}</button>;
                      })}
                    </div>
                  </fieldset>
                  <label className="block text-xs font-bold text-[#582F0E]">Operating hours
                    <input type="text" value={draft.dailyHours} maxLength={80} onChange={e => setField('dailyHours', e.target.value, 'details')} placeholder="e.g. 06:00 AM - 06:00 PM"
                      className="mt-1 w-full rounded-xl border border-[#E3DFD5] bg-white px-3 py-2 text-sm font-normal text-[#2C221E] outline-none focus:border-[#2D6A4F]" />
                  </label>
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-bold text-[#582F0E]">Amenities</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {SPOT_POSTING_AMENITIES.map(amenity => {
                        const selected = draft.amenities.includes(amenity);
                        return <button key={amenity} type="button" aria-pressed={selected} className={`${chip(selected)} capitalize`}
                          onClick={() => setField('amenities', selected ? draft.amenities.filter(a => a !== amenity) : [...draft.amenities, amenity], 'details')}>{amenity.replace(/_/g, ' ')}</button>;
                      })}
                    </div>
                  </fieldset>
                </div>
              </details>

              <p className="text-[10px] leading-relaxed text-[#837560]">Posting publishes this destination immediately. Future reports or moderation can update it.</p>
              {submitError && (
                <div role="alert" className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] font-bold text-red-700"><AlertCircle className="h-3.5 w-3.5 shrink-0" /><span>{submitError}</span></div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#E8E5DE] px-5 py-3.5">
              <p className={`min-w-0 text-[11px] font-bold ${readiness ? 'text-[#B45309]' : 'text-[#2D6A4F]'}`} aria-live="polite">
                {mediaUploading ? 'Finishing your upload…' : readiness ?? '✓ Ready to publish'}
              </p>
              <button type="button" onClick={() => void handlePublish()} disabled={publishing || mediaUploading}
                className="btn-tactile btn-sheen inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-[#FFB703] px-5 py-2.5 text-xs font-black text-[#582F0E] shadow-sm transition hover:bg-[#F59E0B] disabled:opacity-60">
                {publishing ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Publishing…</span></> : <><Sparkles className="h-4 w-4" /><span>Publish spot</span></>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
