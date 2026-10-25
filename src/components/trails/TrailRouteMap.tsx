'use client';

import { useEffect, useRef, useState } from 'react';
import type { TrailStop } from '@/lib/trails-api';
import 'maplibre-gl/dist/maplibre-gl.css';

export function TrailRouteMap({ stops }: { stops: TrailStop[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let map: import('maplibre-gl').Map | null = null;
    void import('maplibre-gl').then(({ Map, LngLatBounds }) => {
      if (disposed || !container.current) return;
      const center = stops.length
        ? [stops.reduce((sum, stop) => sum + stop.lng, 0) / stops.length, stops.reduce((sum, stop) => sum + stop.lat, 0) / stops.length] as [number, number]
        : [119.98, 16.16] as [number, number];
      map = new Map({
        container: container.current,
        style: `${window.location.origin}/map/style.json`,
        center,
        zoom: stops.length > 1 ? 10 : 12,
        cooperativeGestures: true,
      });
      map.once('load', () => {
        if (!map || disposed) return;
        const coordinates = stops.map(stop => [stop.lng, stop.lat]);
        map.addSource('trail-route', { type: 'geojson', data: {
          type: 'FeatureCollection', features: [
            { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } },
            ...stops.map(stop => ({ type: 'Feature' as const, properties: { name: stop.name, position: stop.position }, geometry: { type: 'Point' as const, coordinates: [stop.lng, stop.lat] } })),
          ],
        } });
        map.addLayer({ id: 'trail-route-line', type: 'line', source: 'trail-route', filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#2D6A4F', 'line-width': 5, 'line-opacity': 0.9 } });
        map.addLayer({ id: 'trail-route-stops', type: 'circle', source: 'trail-route', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 8, 'circle-color': '#F4A261', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
        map.addLayer({ id: 'trail-route-labels', type: 'symbol', source: 'trail-route', filter: ['==', '$type', 'Point'], layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0, 1.4], 'text-anchor': 'top' }, paint: { 'text-color': '#24352e', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
        if (coordinates.length > 1) {
          const bounds = coordinates.reduce((value, coordinate) => value.extend(coordinate as [number, number]), new LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));
          map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
        }
      });
      map.on('error', event => { if (event.error) setMapError(true); });
    }).catch(() => setMapError(true));
    return () => { disposed = true; map?.remove(); };
  }, [stops]);

  return <div className="relative h-72 overflow-hidden rounded-2xl border border-stone-200 bg-[#e9eee8] sm:h-96" aria-label="Trail route map">
    <div ref={container} className="absolute inset-0" />
    {mapError && <div className="absolute inset-0 grid place-items-center bg-[#e9eee8]/95 p-6 text-center text-sm text-stone-700">Map preview is temporarily unavailable. Your stop list and check-ins still work below.</div>}
  </div>;
}
