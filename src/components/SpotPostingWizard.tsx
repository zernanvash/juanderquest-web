'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Film,
  Loader2,
  MapPin,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { api, normalizeSpot, uploadSpotMedia } from '@/lib/api';
import type { SpotModel } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';
import { appRoutes } from '@/lib/routes';
import { MiniMapPreview } from '@/components/MiniMapPreview';
import {
  SPOT_BEST_TIME,
  SPOT_GOOD_FOR,
  SPOT_POSTING_AMENITIES,
  SPOT_POSTING_CATEGORIES,
  SPOT_POSTING_STEPS,
  buildSpotPayload,
  createSpotPostingDraft,
  firstInvalidPostingStep,
  subcategoriesForCategory,
  validatePostingMediaFile,
  validatePostingStep,
} from '@/lib/spot-posting';
import type { SpotPostingDraft, SpotPostingPin, SpotPostingStepId } from '@/lib/spot-posting';
import type { ReverseSuggestion } from '@/lib/reverse-geocode';

export interface SpotPostingWizardProps {
  pin: SpotPostingPin | null;
  minimized: boolean;
  onClose: () => void;
  onRequestMovePin: () => void;
  onPublished: (spot: SpotModel) => void;
}

interface AutofillState {
  municipality: boolean;
  address: boolean;
  source: 'map' | 'nearest-area' | null;
  loading: boolean;
}

export const SpotPostingWizard: React.FC<SpotPostingWizardProps> = ({
  pin,
  minimized,
  onClose,
  onRequestMovePin,
  onPublished,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<SpotPostingDraft>(() => createSpotPostingDraft(pin));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [publishedSpot, setPublishedSpot] = useState<SpotModel | null>(null);

  // Reverse geocoding autofill state
  const [autofill, setAutofill] = useState<AutofillState>({
    municipality: true,
    address: true,
    source: null,
    loading: false,
  });
  const [latestSuggestion, setLatestSuggestion] = useState<ReverseSuggestion | null>(null);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [showAddressUpdatePrompt, setShowAddressUpdatePrompt] = useState(false);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaIsVideo, setMediaIsVideo] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const step = SPOT_POSTING_STEPS[stepIndex];
  const stepId: SpotPostingStepId = step.id;

  const prevPinRef = useRef<SpotPostingPin | null>(null);

  // Trigger reverse geocoding when pin is placed or changes (debounced by 600ms)
  useEffect(() => {
    if (!pin) return;
    const pinChanged =
      !prevPinRef.current ||
      prevPinRef.current.lat !== pin.lat ||
      prevPinRef.current.lng !== pin.lng;

    if (!pinChanged) return;
    prevPinRef.current = pin;

    setDraft((current) => ({ ...current, pin }));

    const controller = new AbortController();
    setAutofill((cur) => ({ ...cur, loading: true }));
    setReverseError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/osm/reverse?lat=${encodeURIComponent(pin.lat)}&lng=${encodeURIComponent(pin.lng)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          throw new Error('Reverse lookup failed');
        }
        const data = await res.json();
        const suggestion: ReverseSuggestion | null = data.suggestion ?? null;

        if (suggestion) {
          setLatestSuggestion(suggestion);
          setDraft((cur) => {
            const next = { ...cur };
            let updated = false;

            // If user hasn't edited municipality
            if (autofill.municipality && suggestion.municipality) {
              next.municipality = suggestion.municipality;
              updated = true;
            }
            // If user hasn't edited address
            if (autofill.address && suggestion.address) {
              next.address = suggestion.address;
              updated = true;
            }

            return updated ? next : cur;
          });

          // If user previously manually edited either field, prompt them to update or keep
          if (!autofill.municipality || !autofill.address) {
            setShowAddressUpdatePrompt(true);
          }

          setAutofill((cur) => ({
            ...cur,
            source: suggestion.outsidePangasinan ? 'map' : 'map',
            loading: false,
          }));
        } else {
          setAutofill((cur) => ({ ...cur, loading: false }));
          setReverseError("We couldn't find the address. Please type it in.");
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setAutofill((cur) => ({ ...cur, loading: false }));
        setReverseError("We couldn't find the address. Please type it in.");
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pin, autofill.municipality, autofill.address]);

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  const focusStepContent = useCallback(() => {
    const target = dialogRef.current?.querySelector<HTMLElement>(
      '[data-step-autofocus], input:not([type="file"]), textarea, select'
    );
    target?.focus();
  }, []);

  useEffect(() => {
    if (!minimized) focusStepContent();
  }, [stepIndex, minimized, focusStepContent]);

  const setField = useCallback(<K extends keyof SpotPostingDraft>(key: K, value: SpotPostingDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));

    // If user edited municipality or address manually, mark autofill flag as false
    if (key === 'municipality') {
      setAutofill((cur) => ({ ...cur, municipality: false }));
      setShowAddressUpdatePrompt(false);
    } else if (key === 'address') {
      setAutofill((cur) => ({ ...cur, address: false }));
      setShowAddressUpdatePrompt(false);
    }

    setFieldErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    if (publishing) return;
    onClose();
  }, [publishing, onClose]);

  const handleDialogKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handleClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([type="file"]):not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [handleClose]
  );

  const handleNext = useCallback(() => {
    const errors = validatePostingStep(stepId, draft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStepIndex((index) => Math.min(index + 1, SPOT_POSTING_STEPS.length - 1));
  }, [draft, stepId]);

  const handleBack = useCallback(() => {
    setFieldErrors({});
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

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

  const handleMediaSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const fileError = validatePostingMediaFile(file);
      if (fileError) {
        setMediaError(fileError);
        return;
      }
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
      setMediaFile(file);
      setMediaPreviewUrl(URL.createObjectURL(file));
      setMediaIsVideo(file.type.startsWith('video/'));
      setMediaAssetId(null);
      setMediaUrl(null);
      void uploadMediaFile(file);
    },
    [mediaPreviewUrl, uploadMediaFile]
  );

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
    if (publishing || publishedSpot) return;
    const errors = validatePostingStep('review', draft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstInvalid = firstInvalidPostingStep(draft);
      if (firstInvalid) {
        const targetIndex = SPOT_POSTING_STEPS.findIndex((s) => s.id === firstInvalid);
        if (targetIndex >= 0) setStepIndex(targetIndex);
      }
      return;
    }
    if (mediaUploading) return;
    setPublishing(true);
    setSubmitError(null);
    try {
      const res = await api.post(
        '/spots',
        buildSpotPayload(draft, { assetId: mediaAssetId, imageUrl: mediaUrl })
      );
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
      setSubmitError(
        errorObj.response?.data?.error?.message || 'Failed to publish the destination. Your answers are kept — retry when ready.'
      );
    } finally {
      setPublishing(false);
    }
  }, [draft, mediaAssetId, mediaUploading, mediaUrl, onPublished, publishedSpot, publishing]);

  const stepFields = useMemo(() => {
    if (stepId === 'basics') return ['name', 'category', 'subcategory'];
    if (stepId === 'story') return ['description'];
    if (stepId === 'place') return ['municipality', 'address', 'pin'];
    if (stepId === 'details') return ['goodFor', 'bestTime', 'dailyHours', 'amenities'];
    return [];
  }, [stepId]);

  const stepHasErrors = stepFields.some((field) => Boolean(fieldErrors[field]));

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-end justify-center bg-black/50 sm:items-center sm:p-4 ${
        minimized ? 'hidden' : ''
      }`}
      aria-hidden={minimized}
    >
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#2D6A4F]">
              <PartyPopper className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 id="spot-posting-title" className="text-lg font-black text-[#582F0E]">
                Destination published
              </h2>
              <p className="text-xs text-[#514532]">
                {publishedSpot.name} is now visible on the map and community feed.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
              <Link
                href={appRoutes.spot(publishedSpot.id)}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#2D6A4F] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#1B4332]"
              >
                <span>View destination</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-5 py-3 text-xs font-bold text-[#582F0E] transition hover:bg-white"
              >
                Back to map
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-[#E8E5DE] px-5 pt-5 pb-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#2D6A4F]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <h2 id="spot-posting-title" className="text-sm font-black text-[#582F0E]">
                    Pin a destination
                  </h2>
                </div>
                <p className="text-[11px] font-semibold text-[#837560]">
                  Step {stepIndex + 1} of {SPOT_POSTING_STEPS.length} · {step.label}
                </p>
                <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[#F2EFE9]">
                  <div
                    className="h-full rounded-full bg-[#2D6A4F] transition-all duration-300"
                    style={{ width: `${((stepIndex + 1) / SPOT_POSTING_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={publishing}
                aria-label="Close posting wizard"
                className="rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {stepId === 'basics' && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="posting-name" className="block text-xs font-bold text-[#582F0E]">
                      Destination name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="posting-name"
                      data-step-autofocus
                      type="text"
                      value={draft.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="e.g. Tambobong White Beach"
                      maxLength={200}
                      className="w-full rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3.5 py-2.5 text-sm text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                    />
                    {latestSuggestion?.placeName && !draft.name.trim() && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setField('name', latestSuggestion.placeName!)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-[#2D6A4F] transition hover:bg-emerald-100"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Use &ldquo;{latestSuggestion.placeName}&rdquo; as name</span>
                        </button>
                      </div>
                    )}
                    {fieldErrors.name && <p className="text-[11px] font-bold text-red-600">{fieldErrors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="posting-category" className="block text-xs font-bold text-[#582F0E]">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="posting-category"
                      value={draft.category}
                      onChange={(e) => {
                        const nextCategory = e.target.value;
                        const options = subcategoriesForCategory(nextCategory);
                        setField('subcategory', options[0] ?? '');
                        setField('category', nextCategory);
                      }}
                      className="w-full rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3 py-2.5 text-sm text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                    >
                      {SPOT_POSTING_CATEGORIES.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="posting-subcategory" className="block text-xs font-bold text-[#582F0E]">
                      Subcategory <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="posting-subcategory"
                      value={draft.subcategory}
                      onChange={(e) => setField('subcategory', e.target.value)}
                      className="w-full rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3 py-2.5 text-sm capitalize text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                    >
                      {subcategoriesForCategory(draft.category).map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.subcategory && (
                      <p className="text-[11px] font-bold text-red-600">{fieldErrors.subcategory}</p>
                    )}
                  </div>
                </>
              )}

              {stepId === 'story' && (
                <div className="space-y-1.5">
                  <label htmlFor="posting-description" className="block text-xs font-bold text-[#582F0E]">
                    What makes it worth visiting? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="posting-description"
                    data-step-autofocus
                    value={draft.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={5}
                    maxLength={2000}
                    placeholder="Describe the place, what travelers can do, and any honest tips."
                    className="w-full resize-none rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3.5 py-2.5 text-sm leading-relaxed text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                  />
                  <div className="flex items-center justify-between">
                    {fieldErrors.description ? (
                      <p className="text-[11px] font-bold text-red-600">{fieldErrors.description}</p>
                    ) : (
                      <span className="text-[10px] text-[#837560]">At least 20 characters.</span>
                    )}
                    <span className="text-[10px] font-mono text-[#837560]">{draft.description.length}/2000</span>
                  </div>
                </div>
              )}

              {stepId === 'place' && (
                <>
                  <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xs">
                    {draft.pin && (
                      <div className="h-[120px] w-full overflow-hidden">
                        <MiniMapPreview
                          lat={draft.pin.lat}
                          lng={draft.pin.lng}
                          name={draft.name || draft.address || 'Selected location'}
                          height="h-[120px]"
                          hideBadge
                          interactive={false}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-emerald-100 bg-emerald-50/70 p-3 text-xs">
                      <div className="flex min-w-0 items-center gap-1.5 font-bold text-[#2D6A4F]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {autofill.loading
                            ? 'Finding the address…'
                            : draft.address || draft.municipality || 'Pinned on map'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={onRequestMovePin}
                        className="shrink-0 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[10px] font-black text-[#2D6A4F] transition hover:bg-emerald-50"
                      >
                        Move pin
                      </button>
                    </div>
                  </div>

                  {showAddressUpdatePrompt && latestSuggestion && (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <span>Pin moved — update address to new location?</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (latestSuggestion.municipality) {
                              setDraft((cur) => ({ ...cur, municipality: latestSuggestion.municipality }));
                              setAutofill((cur) => ({ ...cur, municipality: true }));
                            }
                            if (latestSuggestion.address) {
                              setDraft((cur) => ({ ...cur, address: latestSuggestion.address }));
                              setAutofill((cur) => ({ ...cur, address: true }));
                            }
                            setShowAddressUpdatePrompt(false);
                          }}
                          className="rounded-md bg-amber-600 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-amber-700"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddressUpdatePrompt(false)}
                          className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-bold text-amber-800 transition hover:bg-amber-100"
                        >
                          Keep mine
                        </button>
                      </div>
                    </div>
                  )}

                  {latestSuggestion?.outsidePangasinan && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] font-bold text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>This pin is outside Pangasinan. Double-check the location.</span>
                    </div>
                  )}

                  {reverseError && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-[11px] text-stone-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{reverseError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="posting-municipality" className="block text-xs font-bold text-[#582F0E]">
                        Municipality / city <span className="text-red-500">*</span>
                      </label>
                      {autofill.municipality && draft.municipality && (
                        <span className="text-[10px] font-semibold text-[#2D6A4F]">✨ Auto-filled from map</span>
                      )}
                    </div>
                    <input
                      id="posting-municipality"
                      data-step-autofocus
                      type="text"
                      value={draft.municipality}
                      onChange={(e) => setField('municipality', e.target.value)}
                      placeholder="e.g. Dasol"
                      maxLength={100}
                      className="w-full rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3.5 py-2.5 text-sm text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                    />
                    {fieldErrors.municipality && (
                      <p className="text-[11px] font-bold text-red-600">{fieldErrors.municipality}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="posting-address" className="block text-xs font-bold text-[#582F0E]">
                        Address / landmark <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {autofill.address && draft.address && (
                          <span className="text-[10px] font-semibold text-[#2D6A4F]">✨ Auto-filled from map</span>
                        )}
                        {!autofill.address && latestSuggestion?.address && (
                          <button
                            type="button"
                            onClick={() => {
                              setDraft((cur) => ({ ...cur, address: latestSuggestion.address }));
                              setAutofill((cur) => ({ ...cur, address: true }));
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2D6A4F] hover:underline"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      id="posting-address"
                      type="text"
                      value={draft.address}
                      onChange={(e) => setField('address', e.target.value)}
                      placeholder="e.g. Brgy. Tambobong, Dasol"
                      maxLength={300}
                      className="w-full rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3.5 py-2.5 text-sm text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                    />
                    {fieldErrors.address && (
                      <p className="text-[11px] font-bold text-red-600">{fieldErrors.address}</p>
                    )}
                  </div>
                </>
              )}

              {stepId === 'details' && (
                <>
                  <p className="text-[11px] text-[#837560]">
                    Help travelers decide if this place fits their trip.
                  </p>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-[#582F0E]">
                      Good for <span className="font-normal text-[#837560]">(optional, max 5)</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SPOT_GOOD_FOR.map((item) => {
                        const selected = draft.goodFor.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                setField(
                                  'goodFor',
                                  draft.goodFor.filter((id) => id !== item.id)
                                );
                              } else if (draft.goodFor.length < 5) {
                                setField('goodFor', [...draft.goodFor, item.id]);
                              }
                            }}
                            className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                              selected
                                ? 'border-[#2D6A4F] bg-emerald-50 text-[#2D6A4F]'
                                : 'border-[#E3DFD5] bg-[#FAF9F5] text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    {fieldErrors.goodFor && (
                      <p className="text-[11px] font-bold text-red-600">{fieldErrors.goodFor}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-[#582F0E]">
                      Best time to visit <span className="font-normal text-[#837560]">(optional, max 4)</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SPOT_BEST_TIME.map((item) => {
                        const selected = draft.bestTime.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                setField(
                                  'bestTime',
                                  draft.bestTime.filter((id) => id !== item.id)
                                );
                              } else if (draft.bestTime.length < 4) {
                                setField('bestTime', [...draft.bestTime, item.id]);
                              }
                            }}
                            className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                              selected
                                ? 'border-[#2D6A4F] bg-emerald-50 text-[#2D6A4F]'
                                : 'border-[#E3DFD5] bg-[#FAF9F5] text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    {fieldErrors.bestTime && (
                      <p className="text-[11px] font-bold text-red-600">{fieldErrors.bestTime}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="posting-hours" className="block text-xs font-bold text-[#582F0E]">
                      Operating hours <span className="font-normal text-[#837560]">(optional)</span>
                    </label>
                    <input
                      id="posting-hours"
                      data-step-autofocus
                      type="text"
                      value={draft.dailyHours}
                      onChange={(e) => setField('dailyHours', e.target.value)}
                      placeholder="e.g. 06:00 AM - 06:00 PM"
                      maxLength={80}
                      className="w-full rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-3.5 py-2.5 text-sm text-[#2C221E] outline-none focus:border-[#2D6A4F]"
                    />
                    {fieldErrors.dailyHours && (
                      <p className="text-[11px] font-bold text-red-600">{fieldErrors.dailyHours}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-[#582F0E]">
                      Amenities <span className="font-normal text-[#837560]">(optional)</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SPOT_POSTING_AMENITIES.map((amenity) => {
                        const selected = draft.amenities.includes(amenity);
                        return (
                          <button
                            key={amenity}
                            type="button"
                            onClick={() =>
                              setField(
                                'amenities',
                                selected
                                  ? draft.amenities.filter((a) => a !== amenity)
                                  : [...draft.amenities, amenity]
                              )
                            }
                            className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold capitalize transition ${
                              selected
                                ? 'border-[#2D6A4F] bg-emerald-50 text-[#2D6A4F]'
                                : 'border-[#E3DFD5] bg-[#FAF9F5] text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            {amenity.replace(/_/g, ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {stepId === 'media' && (
                <>
                  <p className="text-[11px] text-[#837560]">
                    A real photo helps travelers trust this destination. You can publish without one.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaSelect}
                    className="hidden"
                  />
                  {!mediaFile ? (
                    <button
                      type="button"
                      data-step-autofocus
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E3DFD5] bg-[#FAF9F5] px-4 py-8 text-xs font-bold text-[#837560] transition hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                    >
                      <Upload className="h-5 w-5" />
                      <span>Choose a photo or short video</span>
                      <span className="text-[10px] font-normal">Photos up to 8 MB · videos up to 30 MB</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative overflow-hidden rounded-2xl border border-[#E3DFD5]">
                        {mediaIsVideo ? (
                          <video src={mediaPreviewUrl ?? undefined} controls className="max-h-56 w-full bg-black" />
                        ) : (
                          <img
                            src={mediaPreviewUrl ?? ''}
                            alt="Selected destination media preview"
                            className="max-h-56 w-full object-cover"
                          />
                        )}
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
                          {mediaIsVideo ? <Film className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                          {mediaIsVideo ? 'Video' : 'Photo'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          {mediaUploading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2D6A4F]" />
                              <span className="text-[#837560]">Uploading…</span>
                            </>
                          ) : mediaAssetId ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#2D6A4F]" />
                              <span className="text-[#2D6A4F]">Uploaded</span>
                            </>
                          ) : (
                            <span className="text-red-600">Upload failed</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!mediaUploading && !mediaAssetId && mediaFile && (
                            <button
                              type="button"
                              onClick={() => void uploadMediaFile(mediaFile)}
                              className="rounded-lg border border-[#E3DFD5] bg-white px-2.5 py-1.5 text-[10px] font-black text-[#2D6A4F] transition hover:bg-emerald-50"
                            >
                              Retry upload
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleMediaRemove}
                            className="rounded-lg border border-[#E3DFD5] bg-white px-2.5 py-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {mediaError && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] font-bold text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{mediaError}</span>
                    </div>
                  )}
                </>
              )}

              {stepId === 'review' && (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-2xl border border-[#E3DFD5] bg-[#FAF9F5] text-xs">
                    {draft.pin && (
                      <div className="h-[120px] w-full overflow-hidden">
                        <MiniMapPreview
                          lat={draft.pin.lat}
                          lng={draft.pin.lng}
                          name={draft.name || draft.address || 'Selected location'}
                          height="h-[120px]"
                          hideBadge
                          interactive={false}
                        />
                      </div>
                    )}
                    <div className="p-3.5">
                      <p className="font-black text-[#582F0E]">{draft.name || 'Untitled destination'}</p>
                      <p className="mt-1 line-clamp-3 text-[#514532]">{draft.description}</p>
                      <div className="mt-2 space-y-1 text-[11px] text-[#837560]">
                        <p>
                          {SPOT_POSTING_CATEGORIES.find((c) => c.id === draft.category)?.label ?? draft.category} ·{' '}
                          {draft.subcategory.replace(/_/g, ' ')}
                        </p>
                        <p>
                          {draft.municipality} — {draft.address}
                        </p>
                        {draft.goodFor.length > 0 && (
                          <p>
                            <span className="font-bold text-[#582F0E]">Good for: </span>
                            {draft.goodFor
                              .map((id) => SPOT_GOOD_FOR.find((g) => g.id === id)?.label ?? id)
                              .join(', ')}
                          </p>
                        )}
                        {draft.bestTime.length > 0 && (
                          <p>
                            <span className="font-bold text-[#582F0E]">Best time: </span>
                            {draft.bestTime
                              .map((id) => SPOT_BEST_TIME.find((b) => b.id === id)?.label ?? id)
                              .join(', ')}
                          </p>
                        )}
                        {draft.dailyHours && <p>Hours: {draft.dailyHours}</p>}
                        <p>
                          {mediaAssetId
                            ? 'Photo attached'
                            : mediaFile
                              ? 'Photo pending upload'
                              : 'No photo (optional)'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onRequestMovePin}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2D6A4F] hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Adjust pin on map</span>
                  </button>
                  <p className="text-[10px] leading-relaxed text-[#837560]">
                    Posting publishes this destination immediately. Future reports or moderation can update it.
                  </p>
                  {stepHasErrors && (
                    <p className="text-[11px] font-bold text-red-600">Some answers still need attention.</p>
                  )}
                  {submitError && (
                    <div role="alert" className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] font-bold text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[#E8E5DE] px-5 py-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={stepIndex === 0 || publishing}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#E3DFD5] bg-white px-4 py-2.5 text-xs font-bold text-[#582F0E] transition hover:bg-[#FAF9F5] disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              {stepId === 'review' ? (
                <button
                  type="button"
                  onClick={() => void handlePublish()}
                  disabled={publishing || mediaUploading}
                  className="btn-tactile btn-sheen inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#FFB703] px-5 py-2.5 text-xs font-black text-[#582F0E] shadow-sm transition hover:bg-[#F59E0B] disabled:opacity-60"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Publishing…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Publish destination</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-tactile inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#2D6A4F] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#1B4332]"
                >
                  <span>Next</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
