import type { DivIcon } from 'leaflet';
import type { MapCluster } from '@/lib/map-cluster';

/** Build the accessible, keyboard-focusable cluster marker icon. */
export function createClusterIcon(L: typeof import('leaflet'), cluster: MapCluster): DivIcon {
  const size = cluster.count < 10 ? 34 : cluster.count < 50 ? 40 : 48;
  const label = `${cluster.count} destinations, zoom in`;
  const questRing = cluster.hasQuest ? 'border:3px solid #FFB703;' : 'border:2px solid #fff;';
  return L.divIcon({
    className: 'jdq-map-cluster',
    html: `<div role="img" aria-label="${label}" style="width:${size}px;height:${size}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#3F6653;${questRing}box-shadow:0 2px 8px rgba(0,0,0,.3);color:#fff;font:700 14px/1 system-ui,sans-serif">${cluster.count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
