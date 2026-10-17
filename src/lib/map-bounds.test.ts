import { describe, expect, it } from 'vitest';
import { boundsContain, PANGASINAN_BOUNDS, PH_LEAFLET_BOUNDS } from './map-bounds';

describe('map camera bounds', () => {
  it('keeps the Pangasinan startup frame inside the Philippines camera area', () => {
    expect(boundsContain(PH_LEAFLET_BOUNDS, PANGASINAN_BOUNDS)).toBe(true);
    expect(PANGASINAN_BOUNDS[0][0]).toBeLessThan(PANGASINAN_BOUNDS[1][0]);
    expect(PANGASINAN_BOUNDS[0][1]).toBeLessThan(PANGASINAN_BOUNDS[1][1]);
  });
});
