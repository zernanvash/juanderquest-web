/**
 * WebGL feature detection for MapLibre vector maps.
 * If WebGL is not supported, the app cleanly falls back to Leaflet raster maps.
 */
export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_VECTOR_MAP === 'false') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl && gl instanceof WebGLRenderingContext);
  } catch {
    return false;
  }
}
