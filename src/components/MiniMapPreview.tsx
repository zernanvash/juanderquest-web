'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, MapPin, Maximize2, Compass } from 'lucide-react';
import { MAP_TILE_URL, MAP_TILE_ATTRIBUTION, MAP_TILE_MAX_ZOOM } from '@/lib/map-tiles';
import { createSpotPinHtml, createQuestPinHtml, createDestinationPinHtml } from '@/lib/map-icons';

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
  onLocationChange?: (lat: number, lng: number) => void;
  hideBadge?: boolean;
  badgeLabel?: string;
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
}: MiniMapPreviewProps) {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Validate coordinates
  const validLat = typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90 ? lat : 16.0232;
  const validLng = typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180 ? lng : 120.2317;

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
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
          dragging: interactive,
          touchZoom: interactive,
          scrollWheelZoom: false,
          doubleClickZoom: interactive,
          boxZoom: false,
          keyboard: false,
        }).setView([validLat, validLng], zoom);

        L.tileLayer(MAP_TILE_URL, {
          maxZoom: MAP_TILE_MAX_ZOOM,
          attribution: MAP_TILE_ATTRIBUTION,
        }).addTo(map);

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

        const marker = L.marker([validLat, validLng], {
          icon: customIcon,
          draggable: Boolean(interactive && onLocationChange),
        }).addTo(map);

        if (interactive && onLocationChange) {
          marker.on('dragend', (ev: any) => {
            const pos = ev.target.getLatLng();
            onLocationChange(pos.lat, pos.lng);
          });

          map.on('click', (ev: any) => {
            marker.setLatLng(ev.latlng);
            map.panTo(ev.latlng, { animate: true });
            onLocationChange(ev.latlng.lat, ev.latlng.lng);
          });
        }

        mapInstanceRef.current = map;
        markerRef.current = marker;
        setLoading(false);

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
      }
    };
  }, [mounted, interactive]);

  // Update center & marker position if coordinates change dynamically
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([validLat, validLng]);
      mapInstanceRef.current.panTo([validLat, validLng], { animate: true });
    }
  }, [validLat, validLng]);

  return (
    <div
      className={`group relative w-full ${height} rounded-2xl overflow-hidden border border-[#E3DFD5] bg-[#FAF9F5] shadow-xs select-none ${
        !interactive ? 'cursor-pointer transition-all hover:border-[#2D6A4F] hover:shadow-md' : ''
      } ${className}`}
      onClick={!interactive ? () => handleOpenFullMap() : undefined}
      onKeyDown={!interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenFullMap(e); } : undefined}
      role={!interactive ? 'button' : undefined}
      tabIndex={!interactive ? 0 : undefined}
      aria-label={!interactive ? `View ${name || 'location'} on interactive map` : 'Map preview'}
    >
      {/* Underlying Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Loading state skeleton */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#FAF9F5]/90 backdrop-blur-xs text-[#582F0E] space-y-2">
          <Compass className="w-6 h-6 animate-spin text-[#2D6A4F]" />
          <span className="text-[11px] font-bold tracking-wide">Loading Map Preview...</span>
        </div>
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

      {/* Subtle Bottom Location Pill (if name or municipality provided) */}
      {(name || municipality || address) && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 pointer-events-none">
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
