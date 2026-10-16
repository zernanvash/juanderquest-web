'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Film,
  Loader2,
  MapPin,
  PartyPopper,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { api, normalizeSpot, uploadSpotMedia, isVideoMedia } from '@/lib/api';
import type { SpotModel } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';
import { appRoutes } from '@/lib/routes';
import {
  SPOT_POSTING_AMENITIES,
  SPOT_POSTING_CATEGORIES,
  SPOT_POSTING_PRICE_LEVELS,
  SPOT_POSTING_STEPS,
  buildSpotPayload,
  createSpotPostingDraft,
  firstInvalidPostingStep,
  formatPinLabel,
  subcategoriesForCategory,
  validatePostingMediaFile,
  validatePostingStep,
} from '@/lib/spot-posting';
import type { SpotPostingDraft, SpotPostingPin, SpotPostingStepId } from '@/lib/spot-posting';

export interface SpotPostingWizardProps {
  pin: SpotPostingPin | null;
  minimized: boolean;
  onClose: () => void;
  onRequestMovePin: () => void;
  onPublished: (spot: SpotModel) => void;
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

  useEffect(() => {
    if (pin) {
      setDraft((current) => ({ ...current, pin }));
    }
  }, [pin]);

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
    if (stepId === 'details') return ['priceLevel', 'dailyHours', 'amenities'];
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
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 font-bold text-[#2D6A4F]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-mono text-[11px]">{formatPinLabel(draft.pin)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={onRequestMovePin}
                        className="shrink-0 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[10px] font-black text-[#2D6A4F] transition hover:bg-emerald-50"
                      >
                        Move pin
                      </button>
                    </div>
                    {fieldErrors.pin && (
                      <p className="mt-1.5 text-[11px] font-bold text-red-600">{fieldErrors.pin}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="posting-municipality" className="block text-xs font-bold text-[#582F0E]">
                      Municipality / city <span className="text-red-500">*</span>
                    </label>
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
                    <label htmlFor="posting-address" className="block text-xs font-bold text-[#582F0E]">
                      Address / landmark <span className="text-red-500">*</span>
                    </label>
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
                    <span className="block text-xs font-bold text-[#582F0E]">Price level</span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {SPOT_POSTING_PRICE_LEVELS.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => setField('priceLevel', level.value)}
                          className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
                            draft.priceLevel === level.value
                              ? 'border-[#2D6A4F] bg-emerald-50 text-[#2D6A4F]'
                              : 'border-[#E3DFD5] bg-[#FAF9F5] text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
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
                  <div className="rounded-2xl border border-[#E3DFD5] bg-[#FAF9F5] p-3.5 text-xs">
                    <p className="font-black text-[#582F0E]">{draft.name || 'Untitled destination'}</p>
                    <p className="mt-1 line-clamp-3 text-[#514532]">{draft.description}</p>
                    <div className="mt-2 space-y-0.5 text-[11px] text-[#837560]">
                      <p>
                        {SPOT_POSTING_CATEGORIES.find((c) => c.id === draft.category)?.label ?? draft.category} ·{' '}
                        {draft.subcategory.replace(/_/g, ' ')}
                      </p>
                      <p>
                        {draft.municipality} — {draft.address}
                      </p>
                      <p className="font-mono">{formatPinLabel(draft.pin)}</p>
                      <p>
                        {draft.dailyHours ? `Hours: ${draft.dailyHours}` : 'Hours not provided'} ·{' '}
                        {SPOT_POSTING_PRICE_LEVELS.find((l) => l.value === draft.priceLevel)?.label}
                      </p>
                      <p>
                        {mediaAssetId
                          ? 'Photo attached'
                          : mediaFile
                            ? 'Photo pending upload'
                            : 'No photo (optional)'}
                      </p>
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
