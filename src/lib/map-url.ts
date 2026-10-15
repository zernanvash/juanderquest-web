import { MAP_TILE_MAX_ZOOM } from './map-tiles';

// Deep-link hardening for /map query parameters: reject impossible coordinates
// and keep zoom inside the supported tile range.

export const isValidLatitude = (value: number): boolean =>
  Number.isFinite(value) && value >= -90 && value <= 90;

export const isValidLongitude = (value: number): boolean =>
  Number.isFinite(value) && value >= -180 && value <= 180;

export const clampMapZoom = (value: number, fallback = 13): number =>
  Number.isFinite(value) ? Math.min(MAP_TILE_MAX_ZOOM, Math.max(6, Math.round(value))) : fallback;
