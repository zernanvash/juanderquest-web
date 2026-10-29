import { beforeEach, describe, expect, it } from 'vitest';
import {
  DRAFT_KEY, LINGAYEN_ANCHOR, addSpotHref, clearSpotDraft, consumeSpotHandoff, isSoftPin, loadSpotDraft,
  resolveInitialSpotLocation, saveLastMapCenter, saveSpotDraft, saveSpotHandoff,
} from './spot-location-handoff';
import { createSpotPostingDraft, type SpotRecognition } from './spot-posting';

const params = (query: string) => new URLSearchParams(query);
const recognition = { recognized: true, place_name: 'Patar White Beach', municipality: 'Bolinao' } as unknown as SpotRecognition;

describe('add-spot location cascade (Plan 70)', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('tier 1: the URL pin, with the map recognition for the same place', () => {
    saveSpotHandoff({ pin: { lat: 16.3268, lng: 119.7842, zoom: 17 }, source: 'map-crosshair', recognition });
    const result = resolveInitialSpotLocation(params('lat=16.32681&lng=119.78419&zoom=17'));
    expect(result.pin).toEqual({ lat: 16.32681, lng: 119.78419, zoom: 17 });
    expect(result.recognition?.place_name).toBe('Patar White Beach');
    expect(result.source).toBe('map-crosshair');
  });

  it('ignores a handoff for another place or an expired one', () => {
    saveSpotHandoff({ pin: { lat: 16.5, lng: 120.1, zoom: 17 }, source: 'map-crosshair', recognition });
    expect(consumeSpotHandoff({ lat: 16.3268, lng: 119.7842 })).toBeNull();
    expect(consumeSpotHandoff({ lat: 16.5, lng: 120.1 }, Date.now() + 31 * 60 * 1000)).toBeNull();
  });

  it('a refresh keeps the URL pin and the draft that belongs to it', () => {
    const draft = { ...createSpotPostingDraft({ lat: 16.3268, lng: 119.7842 }), name: 'My cove', description: 'A quiet cove with clear water.' };
    saveSpotDraft({ pin: { lat: 16.3268, lng: 119.7842, zoom: 18 }, source: 'photo-exif', draft, recognition });
    const result = resolveInitialSpotLocation(params('lat=16.3268&lng=119.7842&zoom=18'));
    expect(result.draft?.name).toBe('My cove');
    expect(result.source).toBe('photo-exif');
  });

  it('tier 2: with no URL, the saved draft', () => {
    const draft = { ...createSpotPostingDraft(null), name: 'Saved spot' };
    saveSpotDraft({ pin: { lat: 16.1, lng: 120.3, zoom: 16 }, source: 'map-crosshair', draft, recognition: null });
    const result = resolveInitialSpotLocation(params(''));
    expect(result).toMatchObject({ pin: { lat: 16.1, lng: 120.3, zoom: 16 }, source: 'draft' });
    expect(result.draft?.name).toBe('Saved spot');
  });

  it('tier 4: the last map view, else Lingayen — and never an invalid pin', () => {
    expect(resolveInitialSpotLocation(params('lat=999&lng=abc'))).toMatchObject({ pin: LINGAYEN_ANCHOR, source: 'fallback-anchor' });
    saveLastMapCenter({ lat: 16.2, lng: 119.9, zoom: 14 });
    expect(resolveInitialSpotLocation(params(''))).toMatchObject({ pin: { lat: 16.2, lng: 119.9, zoom: 14 }, source: 'map-viewport' });
    expect(isSoftPin('map-viewport') && isSoftPin('fallback-anchor') && !isSoftPin('map-crosshair')).toBe(true);
  });

  it('survives corrupted or blocked storage and clears after publishing', () => {
    localStorage.setItem(DRAFT_KEY, '{not json');
    expect(loadSpotDraft()).toBeNull();
    expect(resolveInitialSpotLocation(params('')).source).toBe('fallback-anchor');
    saveSpotDraft({ pin: { lat: 16.1, lng: 120.3, zoom: 16 }, source: 'map-crosshair', draft: createSpotPostingDraft(null), recognition: null });
    clearSpotDraft();
    expect(loadSpotDraft()).toBeNull();
  });

  it('builds the studio link', () => {
    expect(addSpotHref({ lat: 16.3268, lng: 119.7842, zoom: 17 })).toBe('/map/add-spot?lat=16.326800&lng=119.784200&zoom=17');
    expect(addSpotHref()).toBe('/map/add-spot');
  });
});
