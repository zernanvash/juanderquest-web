'use client';

// Plan 70: the posting state and publish flow (from the Plan 66 one-page composer), shared by
// the Spot Discovery Studio. Recognition re-runs whenever the pin moves; fields the traveler
// touched are never overwritten by a new recognition.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, normalizeSpot, uploadSpotMedia } from '@/lib/api';
import type { SpotModel } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';
import { recognizeSpot } from '@/lib/reverse-geocode';
import {
  applyRecognitionToDraft,
  buildSpotPayload,
  createSpotPostingDraft,
  postingReadiness,
  validatePostingMediaFile,
  validatePostingStep,
} from '@/lib/spot-posting';
import type { SpotPostingDraft, SpotPostingPin, SpotPostingTouched, SpotRecognition } from '@/lib/spot-posting';

export const RECOGNIZE_STUDIO_DEBOUNCE_MS = 400;
const pinKey = (pin: SpotPostingPin | null) => (pin ? `${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}` : '');

type ApiError = { response?: { data?: { error?: { message?: string } } } };
const apiMessage = (err: unknown, fallback: string) => (err as ApiError).response?.data?.error?.message || fallback;

export function useSpotComposer({ pin, initialRecognition, initialDraft, onMediaSelected }: {
  pin: SpotPostingPin;
  initialRecognition: SpotRecognition | null;
  initialDraft: SpotPostingDraft | null;
  /** Called with each chosen file before upload (the studio reads photo GPS from it). */
  onMediaSelected?: (file: File) => void;
}) {
  const [draft, setDraft] = useState<SpotPostingDraft>(() => {
    if (initialDraft) return { ...initialDraft, pin };
    const base = createSpotPostingDraft(pin);
    return initialRecognition ? applyRecognitionToDraft(base, initialRecognition) : base;
  });
  const [recognition, setRecognition] = useState<SpotRecognition | null>(initialRecognition);
  const [recognizing, setRecognizing] = useState(!initialRecognition);
  // A restored draft counts as touched: the traveler typed those fields.
  const touched = useRef<SpotPostingTouched>(initialDraft ? { name: Boolean(initialDraft.name), category: true, location: true, details: true } : {});
  const [nameTouched, setNameTouched] = useState(Boolean(initialDraft?.name));
  const recognizedPin = useRef(initialRecognition ? pinKey(pin) : '');
  const [usedStarters, setUsedStarters] = useState<string[]>([]);
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

  // Recognize the pin whenever it settles somewhere new.
  useEffect(() => {
    const key = pinKey(pin);
    setDraft(current => ({ ...current, pin }));
    if (recognizedPin.current === key) return;
    const controller = new AbortController();
    setRecognizing(true);
    const timer = window.setTimeout(() => {
      recognizeSpot(pin.lat, pin.lng, controller.signal)
        .then(value => {
          recognizedPin.current = key;
          setRecognition(value);
          setDraft(current => applyRecognitionToDraft({ ...current, pin }, value, touched.current));
        })
        .catch(() => undefined)
        .finally(() => { if (!controller.signal.aborted) setRecognizing(false); });
    }, RECOGNIZE_STUDIO_DEBOUNCE_MS);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [pin]);

  useEffect(() => () => { if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl); }, [mediaPreviewUrl]);

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

  const uploadMediaFile = useCallback(async (file: File) => {
    setMediaUploading(true);
    setMediaError(null);
    try {
      const asset = await uploadSpotMedia(file);
      setMediaAssetId(asset.asset_id);
      setMediaUrl(asset.url);
      setMediaIsVideo(asset.media_type ? asset.media_type === 'video' : file.type.startsWith('video/'));
    } catch (err) {
      setMediaError(apiMessage(err, 'Media upload failed. Please try again.'));
    } finally {
      setMediaUploading(false);
    }
  }, []);

  const selectMedia = useCallback((file: File) => {
    const fileError = validatePostingMediaFile(file);
    if (fileError) { setMediaError(fileError); return; }
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setMediaIsVideo(file.type.startsWith('video/'));
    setMediaAssetId(null);
    setMediaUrl(null);
    onMediaSelected?.(file);
    void uploadMediaFile(file); // starts right away so publishing never waits on the upload
  }, [mediaPreviewUrl, onMediaSelected, uploadMediaFile]);

  const removeMedia = useCallback(() => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaAssetId(null);
    setMediaUrl(null);
    setMediaError(null);
    setMediaIsVideo(false);
  }, [mediaPreviewUrl]);

  const useStarter = useCallback((starter: string, append: (text: string, s: string) => string) => {
    setDraft(current => ({ ...current, description: append(current.description, starter) }));
    setUsedStarters(list => [...list, starter]);
  }, []);

  const publish = useCallback(async (): Promise<SpotModel | null> => {
    if (publishing || publishedSpot || mediaUploading) return null;
    const errors = validatePostingStep('review', draft);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return null; }
    setPublishing(true);
    setSubmitError(null);
    try {
      const res = await api.post('/spots', buildSpotPayload(draft, { assetId: mediaAssetId, imageUrl: mediaUrl }));
      const data = res.data?.data;
      if (res.data?.success && data?.id) {
        invalidateCache('spots');
        const spot = normalizeSpot(data);
        setPublishedSpot(spot);
        return spot;
      }
      setSubmitError('The server did not confirm the new destination. Please try again.');
    } catch (err) {
      setSubmitError(apiMessage(err, 'Failed to publish the destination. Your answers are kept — retry when ready.'));
    } finally {
      setPublishing(false);
    }
    return null;
  }, [draft, mediaAssetId, mediaUploading, mediaUrl, publishedSpot, publishing]);

  return {
    draft, setField, recognition, recognizing, nameTouched, usedStarters, useStarter, fieldErrors,
    readiness: postingReadiness(draft),
    media: { file: mediaFile, previewUrl: mediaPreviewUrl, assetId: mediaAssetId, url: mediaUrl, isVideo: mediaIsVideo, uploading: mediaUploading, error: mediaError },
    selectMedia, removeMedia, retryUpload: () => { if (mediaFile) void uploadMediaFile(mediaFile); },
    publish, publishing, submitError, publishedSpot,
  };
}

export type SpotComposer = ReturnType<typeof useSpotComposer>;
