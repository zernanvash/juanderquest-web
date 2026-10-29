// Plan 70: read where a JPEG was taken from its EXIF GPS tags, entirely in the browser.
// Never throws: non-JPEGs, stripped EXIF, broken headers and points outside the
// Philippines all return null.

export interface PhotoGps { lat: number; lng: number }

export const PH_BOUNDS = { minLat: 4.5, maxLat: 21.5, minLng: 116, maxLng: 127 } as const;
export const insidePhilippines = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat >= PH_BOUNDS.minLat && lat <= PH_BOUNDS.maxLat && lng >= PH_BOUNDS.minLng && lng <= PH_BOUNDS.maxLng;

const HEAD_BYTES = 128 * 1024;

/** Parses EXIF GPS from the start of a JPEG; exported for tests. */
export function parseJpegGps(buffer: ArrayBuffer): PhotoGps | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      const size = view.getUint16(offset + 2);
      if ((marker & 0xff00) !== 0xff00 || size < 2) return null;
      // APP1 with "Exif\0\0"
      if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0) {
        return readTiffGps(view, offset + 10);
      }
      if (marker === 0xffda) return null; // image data starts; no EXIF before it
      offset += 2 + size;
    }
    return null;
  } catch {
    return null;
  }
}

function readTiffGps(view: DataView, tiff: number): PhotoGps | null {
  const order = view.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return null;
  const little = order === 0x4949;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  if (u16(tiff + 2) !== 42) return null;
  const ifd0 = tiff + u32(tiff + 4);
  const entries = (ifd: number) => {
    const count = u16(ifd);
    return Array.from({ length: count }, (_, i) => ifd + 2 + i * 12);
  };
  const gpsEntry = entries(ifd0).find(entry => u16(entry) === 0x8825);
  if (gpsEntry === undefined) return null;
  const gpsIfd = tiff + u32(gpsEntry + 8);
  const tags = new Map<number, number>();
  for (const entry of entries(gpsIfd)) tags.set(u16(entry), entry);

  const ref = (tag: number) => {
    const entry = tags.get(tag);
    return entry === undefined ? null : String.fromCharCode(view.getUint8(entry + 8));
  };
  const dms = (tag: number) => {
    const entry = tags.get(tag);
    if (entry === undefined || u16(entry + 2) !== 5 || u32(entry + 4) < 3) return null; // 3 RATIONALs
    const at = tiff + u32(entry + 8);
    const rational = (i: number) => {
      const den = u32(at + i * 8 + 4);
      return den === 0 ? NaN : u32(at + i * 8) / den;
    };
    return rational(0) + rational(1) / 60 + rational(2) / 3600;
  };

  const latAbs = dms(0x0002), lngAbs = dms(0x0004);
  if (latAbs === null || lngAbs === null) return null;
  const lat = ref(0x0001) === 'S' ? -latAbs : latAbs;
  const lng = ref(0x0003) === 'W' ? -lngAbs : lngAbs;
  return insidePhilippines(lat, lng) ? { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 } : null;
}

export async function extractPhotoGps(file: Blob): Promise<PhotoGps | null> {
  try {
    if (file.type && !/jpe?g/i.test(file.type)) return null;
    return parseJpegGps(await file.slice(0, HEAD_BYTES).arrayBuffer());
  } catch {
    return null;
  }
}

/** Distance in meters between two points (haversine). */
export function metersBetween(a: PhotoGps, b: PhotoGps): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
