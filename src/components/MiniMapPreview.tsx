'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, MapPin, Maximize2, Compass, Layers } from 'lucide-react';
import { createBaseTileLayer, createSatelliteTileLayer, satelliteAvailable } from '@/lib/map-tiles';
import { createSpotPinHtml, createQuestPinHtml, createDestinationPinHtml } from '@/lib/map-icons';
import { PinReticle } from '@/components/PinAimCard';

export interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  municipality?: string;
  spotId?: string;
  questId?: string;
  zoom?: number;
  height?: string;
  className?: string;
  pinType?: 'spot' | 'quest' | 'destination';
  interactive?: boolean;
  onLocationChange?: (lat: number, lng: number, zoom?: number) => void;
  /** Plan 70: the pin stays in the centre and the map pans under it (needs interactive). */
  reticleMode?: boolean;
  hideBadge?: boolean;
  badgeLabel?: string;
  showMarker?: boolean;
  /** Plan 71: small dots for nearby places around the main pin (not interactive). */
  points?: Array<{ lat: number; lng: number; title?: string }>;
  /** Show a Map / Satellite switch (hidden when no imagery key is configured). */
  satelliteToggle?: boolean;
}

const BASEMAP_PREF_KEY = 'jdq_minimap_basemap_v1';

function readBasemapPref(): 'map' | 'satellite' {
  try {
    return window.localStorage.getItem(BASEMAP_PREF_KEY) === 'satellite' ? 'satellite' : 'map';
  } catch {
    return 'map';
  }
}

export function MiniMapPreview({
  lat,
  lng,
  name,
  address,
  municipality,
  spotId,
  questId,
  zoom = 14,
  height = 'h-44',
  className = '',
  pinType = 'spot',
  interactive = false,
  onLocationChange,
  hideBadge = false,
  badgeLabel,
  showMarker = true,
  reticleMode = false,
  points,
  satelliteToggle = false,
}: MiniMapPreviewProps) {
  const canSatellite = satelliteToggle && satelliteAvailable();
  const [basemap, setBasemap] = useState<'map' | 'satellite'>('map');
  const baseLayerRef = useRef<any>(null);
  const baseModeRef = useRef<'map' | 'satellite'>('map');
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pointsLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Validate coordinates
  const validLat = typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90 ? lat : 16.0232;
  const validLng = typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180 ? lng : 120.2317;
  const viewRef = useRef({ lat: validLat, lng: validLng, zoom });
  const onLocationChangeRef = useRef(onLocationChange);

  useEffect(() => {
    viewRef.current = { lat: validLat, lng: validLng, zoom };
    onLocationChangeRef.current = onLocationChange;
  }, [validLat, validLng, zoom, onLocationChange]);

  const handleOpenFullMap = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const params = new URLSearchParams();
    params.set('lat', validLat.toString());
    params.set('lng', validLng.toString());
    if (name) params.set('name', name);
    if (spotId) params.set('spot', spotId);
    if (questId) params.set('quest', questId);
    router.push(`/map?${params.toString()}`);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (canSatellite) setBasemap(readBasemapPref());
  }, [canSatellite]);

  // Swap the base layer in place so the view, pin and dots stay put.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    const wanted = canSatellite && basemap === 'satellite' ? 'satellite' : 'map';
    if (baseModeRef.current === wanted) return;
    const next = wanted === 'satellite' ? createSatelliteTileLayer(L) : createBaseTileLayer(L);
    baseLayerRef.current?.remove();
    baseLayerRef.current = next.addTo(map);
    next.bringToBack();
    baseModeRef.current = wanted;
  }, [basemap, canSatellite, mapReady]);

  const toggleBasemap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMode = basemap === 'satellite' ? 'map' : 'satellite';
    setBasemap(nextMode);
    try {
      window.localStorage.setItem(BASEMAP_PREF_KEY, nextMode);
    } catch {
      // Remembering the choice is a convenience only.
    }
  };

  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    let isDisposed = false;

    async function initMiniMap() {
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        if (isDisposed || !mapContainerRef.current) return;

        // Clean up previous instance if container changed
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          markerRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: interactive,
          attributionControl: true,
          dragging: interactive,
          touchZoom: interactive,
          scrollWheelZoom: false,
          doubleClickZoom: interactive,
          boxZoom: false,
          keyboard: false,
        }).setView([viewRef.current.lat, viewRef.current.lng], viewRef.current.zoom);

        baseLayerRef.current = createBaseTileLayer(L).addTo(map);
        baseModeRef.current = 'map';

        // Select pin icon generator
        let pinHtml = createSpotPinHtml(true);
        if (pinType === 'quest') {
          pinHtml = createQuestPinHtml(true);
        } else if (pinType === 'destination') {
          pinHtml = createDestinationPinHtml(true);
        }

        const customIcon = L.divIcon({
          className: 'leaflet-custom-marker',
          html: pinHtml,
          iconSize: [36, 46],
          iconAnchor: [18, 44],
        });

        const marker = showMarker && !(interactive && reticleMode) ? L.marker([viewRef.current.lat, viewRef.current.lng], {
          icon: customIcon,
          draggable: Boolean(interactive && onLocationChangeRef.current),
        }).addTo(map) : null;

        if (interactive && reticleMode) {
          // Report the centre after each pan/zoom; programmatic moves to the same point are ignored.
          map.on('moveend', () => {
            const c = map.getCenter();
            const v = viewRef.current;
            if (Math.abs(c.lat - v.lat) < 1e-6 && Math.abs(c.lng - v.lng) < 1e-6 && map.getZoom() === v.zoom) return;
            viewRef.current = { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
            onLocationChangeRef.current?.(c.lat, c.lng, map.getZoom());
          });
        } else if (interactive && onLocationChangeRef.current) {
          marker?.on('dragend', (ev: any) => {
            const pos = ev.target.getLatLng();
            onLocationChangeRef.current?.(pos.lat, pos.lng);
          });

          map.on('click', (ev: any) => {
            if (markerRef.current) markerRef.current.setLatLng(ev.latlng);
            map.panTo(ev.latlng, { animate: true });
            onLocationChangeRef.current?.(ev.latlng.lat, ev.latlng.lng);
          });
        }

        mapInstanceRef.current = map;
        markerRef.current = marker;
        leafletRef.current = L;
        pointsLayerRef.current = L.layerGroup().addTo(map);
        setLoading(false);
        setMapReady((n) => n + 1);

        // Invalidate size after layout stabilization
        setTimeout(() => {
          if (!isDisposed && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 150);
      } catch (err) {
        console.error('Failed to initialize MiniMapPreview:', err);
      }
    }

    initMiniMap();

    return () => {
      isDisposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [mounted, interactive, showMarker, pinType, reticleMode]);

  const pointsKey = (points ?? []).map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)},${p.title ?? ''}`).join('|');
  useEffect(() => {
    const L = leafletRef.current;
    const layer = pointsLayerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    for (const point of points ?? []) {
      const dot = L.circleMarker([point.lat, point.lng], {
        radius: 5, color: '#ffffff', weight: 2, fillColor: '#2D6A4F', fillOpacity: 0.9, interactive: false,
      });
      dot.addTo(layer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey, mapReady]);

  // Update center & marker position if coordinates change dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) {
      markerRef.current?.setLatLng([validLat, validLng]);
      const c = map.getCenter();
      // Skip when the map is already there (e.g. the change came from panning it).
      if (Math.abs(c.lat - validLat) < 1e-6 && Math.abs(c.lng - validLng) < 1e-6 && map.getZoom() === zoom) return;
      map.setView([validLat, validLng], zoom, { animate: true });
    }
  }, [validLat, validLng, zoom]);

  return (
    <div
      className={`group relative w-full ${height} rounded-2xl overflow-hidden border border-[#E3DFD5] bg-[#FAF9F5] shadow-xs select-none ${
        !interactive ? 'cursor-pointer transition-all hover:border-[#2D6A4F] hover:shadow-md' : ''
      } ${className}`}
      onClick={!interactive ? () => handleOpenFullMap() : undefined}
      onKeyDown={!interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenFullMap(e); } : undefined}
      role={!interactive ? 'button' : undefined}
      tabIndex={!interactive ? 0 : undefined}
      aria-label={!interactive ? `View ${name || 'location'} on the map` : 'Map preview'}
    >
      {/* Underlying Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {interactive && reticleMode && !loading && <PinReticle />}

      {/* Loading state skeleton */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#FAF9F5]/90 backdrop-blur-xs text-[#582F0E] space-y-2">
          <Compass className="w-6 h-6 animate-spin text-[#2D6A4F]" />
          <span className="text-[11px] font-bold tracking-wide">Loading Map Preview...</span>
        </div>
      )}

      {canSatellite && !loading && (
        <button
          type="button"
          onClick={toggleBasemap}
          aria-pressed={basemap === 'satellite'}
          data-testid="minimap-basemap-toggle"
          className={`absolute top-2.5 ${interactive ? 'left-12' : 'left-2.5'} z-10 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 text-[#2D6A4F] text-[11px] font-extrabold shadow-sm border border-[#E3DFD5] hover:bg-[#2D6A4F] hover:text-white transition-colors`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{basemap === 'satellite' ? 'Map' : 'Satellite'}</span>
        </button>
      )}

      {/* Overlay Badge */}
      {!hideBadge && (
        <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 text-[#2D6A4F] text-[11px] font-extrabold shadow-sm border border-[#E3DFD5] backdrop-blur-xs group-hover:bg-[#2D6A4F] group-hover:text-white transition-colors duration-150">
            {interactive ? (
              <>
                <MapPin className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>{badgeLabel || 'Click map to pin location'}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#FFB703] group-hover:text-amber-300" />
                <span>{badgeLabel || 'Open Full Map'}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Subtle Bottom Location Pill (if name or municipality provided) — positioned above Leaflet attribution */}
      {(name || municipality || address) && (
        <div className="absolute bottom-7 left-2.5 right-2.5 z-10 pointer-events-none">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/60 text-white backdrop-blur-md text-[11px] font-medium shadow-md">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-[#FFB703] shrink-0" />
              <span className="truncate font-bold">
                {name || address || municipality || 'Pangasinan'}
              </span>
            </div>
            {!interactive && (
              <span className="text-[10px] text-amber-200 font-bold shrink-0 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Explore</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
