export const PH_LEAFLET_BOUNDS: [[number, number], [number, number]] = [
  [4.5, 116],
  [21.5, 127],
];

/** Western/eastern island and provincial extents used to frame Pangasinan. */
export const PANGASINAN_BOUNDS: [[number, number], [number, number]] = [
  [15.7, 119.75],
  [16.45, 120.95],
];

export function boundsContain(
  outer: [[number, number], [number, number]],
  inner: [[number, number], [number, number]],
): boolean {
  return (
    outer[0][0] <= inner[0][0] &&
    outer[0][1] <= inner[0][1] &&
    outer[1][0] >= inner[1][0] &&
    outer[1][1] >= inner[1][1]
  );
}
