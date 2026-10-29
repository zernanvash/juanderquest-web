// Test fixture: build tiny JPEGs with EXIF GPS (Plan 70).
/** A minimal JPEG whose EXIF carries GPS (degrees/minutes/seconds), little- or big-endian. */
export function jpegWithGps(lat: number, lng: number, littleEndian = true): Uint8Array {
  const dms = (value: number) => {
    const abs = Math.abs(value);
    const d = Math.floor(abs), m = Math.floor((abs - d) * 60), s = Math.round(((abs - d) * 60 - m) * 60 * 1000);
    return [[d, 1], [m, 1], [s, 1000]];
  };
  const tiff: number[] = [];
  const u16 = (v: number) => (littleEndian ? [v & 255, v >> 8] : [v >> 8, v & 255]);
  const u32 = (v: number) => (littleEndian ? [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24] : [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255]);
  const gpsIfd = 26, data = gpsIfd + 2 + 4 * 12 + 4;
  tiff.push(...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8));
  tiff.push(...u16(1), ...u16(0x8825), ...u16(4), ...u32(1), ...u32(gpsIfd), ...u32(0));
  const ascii = (ch: string) => (littleEndian ? [ch.charCodeAt(0), 0, 0, 0] : [ch.charCodeAt(0), 0, 0, 0]);
  tiff.push(...u16(4),
    ...u16(1), ...u16(2), ...u32(2), ...ascii(lat >= 0 ? 'N' : 'S'),
    ...u16(2), ...u16(5), ...u32(3), ...u32(data),
    ...u16(3), ...u16(2), ...u32(2), ...ascii(lng >= 0 ? 'E' : 'W'),
    ...u16(4), ...u16(5), ...u32(3), ...u32(data + 24),
    ...u32(0));
  for (const [num, den] of [...dms(lat), ...dms(lng)]) tiff.push(...u32(num), ...u32(den));
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const length = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 255, ...app1, 0xff, 0xda, 0, 2]);
}
