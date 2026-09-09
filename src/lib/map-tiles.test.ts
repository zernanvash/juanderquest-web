import { describe, expect, it } from 'vitest';
import { isValidTileCoordinate, parseTileCoordinate } from './map-tiles';

describe('map tile coordinate validation', () => {
  it('accepts a valid XYZ coordinate and png y suffix', () => {
    expect(parseTileCoordinate('11')).toBe(11);
    expect(parseTileCoordinate('930.png', true)).toBe(930);
    expect(isValidTileCoordinate(11, 1707, 930)).toBe(true);
  });

  it('rejects malformed and out-of-range coordinates', () => {
    expect(parseTileCoordinate('../11')).toBeNull();
    expect(parseTileCoordinate('930.jpg', true)).toBeNull();
    expect(isValidTileCoordinate(20, 1, 1)).toBe(false);
    expect(isValidTileCoordinate(2, 4, 0)).toBe(false);
  });
});
