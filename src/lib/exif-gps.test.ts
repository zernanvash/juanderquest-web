import { describe, expect, it } from 'vitest';
import { extractPhotoGps, metersBetween, parseJpegGps } from './exif-gps';
import { jpegWithGps } from './__fixtures__/jpeg-gps';

describe('photo EXIF GPS (Plan 70)', () => {
  it('reads GPS from little- and big-endian EXIF', () => {
    for (const little of [true, false]) {
      const gps = parseJpegGps(jpegWithGps(16.3268, 119.7842, little).buffer as ArrayBuffer);
      expect(gps!.lat).toBeCloseTo(16.3268, 4);
      expect(gps!.lng).toBeCloseTo(119.7842, 4);
    }
  });

  it('ignores points outside the Philippines and files that are not JPEGs or have no GPS', async () => {
    expect(parseJpegGps(jpegWithGps(35.68, 139.69).buffer as ArrayBuffer)).toBeNull(); // Tokyo
    expect(parseJpegGps(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    expect(parseJpegGps(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer)).toBeNull();
    expect(parseJpegGps(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 4, 1, 2]).buffer)).toBeNull();
    expect(await extractPhotoGps(new Blob(['x'], { type: 'image/png' }))).toBeNull();
    const photo = new Blob([jpegWithGps(16.0294, 120.2289) as BlobPart], { type: 'image/jpeg' });
    expect((await extractPhotoGps(photo))!.lat).toBeCloseTo(16.0294, 4);
  });

  it('measures distance in meters', () => {
    expect(metersBetween({ lat: 16, lng: 120 }, { lat: 16.001, lng: 120 })).toBeGreaterThan(100);
    expect(metersBetween({ lat: 16, lng: 120 }, { lat: 16.001, lng: 120 })).toBeLessThan(120);
  });
});
