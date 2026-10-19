'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AdminAreaModel, SpotModel, fetchAdminAreas, fetchAdminAreaShape, fetchAdminAreaSpots } from '@/lib/api';
import { buildInvertedMask } from '@/lib/map-mask';
import { SpotPostingPin } from '@/lib/spot-posting';

export interface VectorMapCanvasProps {
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  onSelectSpot: (spot: SpotModel) => void;
  onClearArea: () => void;
  // Pin placement support
  pinPlacementActive?: boolean;
  onDropPin?: (pin: SpotPostingPin) => void;
  draftPin?: SpotPostingPin | null;
  // User location
  userLocation?: { lat: number; lng: number; accuracy: number } | null;
}

const PANGASINAN_CENTER: [number, number] = [120.33, 16.03]; // [lng, lat] for MapLibre
const PANGASINAN_BBOX: [number, number, number, number] = [119.5, 15.6, 121.1, 16.4];

export function VectorMapCanvas({
  selectedAreaId,
  onSelectArea,
  onSelectSpot,
  onClearArea,
  pinPlacementActive = false,
  onDropPin,
  draftPin,
  userLocation,
}: VectorMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeAreaSpots, setActiveAreaSpots] = useState<SpotModel[]>([]);
  const [loadingShape, setLoadingShape] = useState(false);

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isCancelled = false;

    async function initMap() {
      const maplibregl = (await import('maplibre-gl')).default;
      if (isCancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: '/map/style.json',
        center: PANGASINAN_CENTER,
        zoom: 9.5,
        minZoom: 6,
        maxZoom: 18,
        maxBounds: [
          [114.0, 4.0],
          [127.0, 22.0],
        ],
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: '© OpenStreetMap contributors · PSA/NAMRIA (indicative) · Protomaps',
        }),
        'bottom-right'
      );

      map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

      map.on('load', async () => {
        if (isCancelled) return;
        mapRef.current = map;
        setMapLoaded(true);

        // Add places GeoJSON source for clickable towns and barangays
        map.addSource('admin-places', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Add selected area mask & highlight layers
        map.addSource('selected-area-shape', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addSource('selected-area-mask', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Layer: Inverted dimming mask
        map.addLayer({
          id: 'selected-area-mask-fill',
          type: 'fill',
          source: 'selected-area-mask',
          paint: {
            'fill-color': '#000000',
            'fill-opacity': 0.35,
          },
        });

        // Layer: Selected area fill
        map.addLayer({
          id: 'selected-area-fill',
          type: 'fill',
          source: 'selected-area-shape',
          paint: {
            'fill-color': '#2D6A4F',
            'fill-opacity': 0.12,
          },
        });

        // Layer: Selected area boundary outline
        map.addLayer({
          id: 'selected-area-stroke',
          type: 'line',
          source: 'selected-area-shape',
          paint: {
            'line-color': '#2D6A4F',
            'line-width': 2.5,
            'line-opacity': 0.85,
          },
        });

        // Layer: Clickable place symbols (name + spot count badge)
        map.addLayer({
          id: 'place-labels',
          type: 'symbol',
          source: 'admin-places',
          layout: {
            'text-field': [
              'case',
              ['>', ['get', 'published_spot_count'], 0],
              ['concat', ['get', 'name'], ' (', ['to-string', ['get', 'published_spot_count']], ')'],
              ['get', 'name'],
            ],
            'text-font': ['Noto Sans Bold'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8, 11,
              12, 14,
              16, 16,
            ],
            'text-anchor': 'center',
            'text-offset': [0, 0],
            'text-allow-overlap': false,
            'symbol-sort-key': ['-', 1000, ['get', 'published_spot_count']], // Places with spots get layout priority
          },
          paint: {
            'text-color': '#1B4332',
            'text-halo-color': '#FAF9F5',
            'text-halo-width': 2.0,
          },
        });

        // Add destination spots source for selected area
        map.addSource('area-spots', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Layer: Destination spot circles/pins
        map.addLayer({
          id: 'area-spots-circles',
          type: 'circle',
          source: 'area-spots',
          paint: {
            'circle-radius': 7,
            'circle-color': '#2D6A4F',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FAF9F5',
          },
        });

        // Click on place name -> select area
        map.on('click', 'place-labels', (e) => {
          if (e.features && e.features[0]) {
            const areaId = e.features[0].properties?.id;
            if (areaId) {
              onSelectArea(areaId);
            }
          }
        });

        // Cursor style for places
        map.on('mouseenter', 'place-labels', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'place-labels', () => {
          map.getCanvas().style.cursor = '';
        });

        // Click on spot pin -> select spot
        map.on('click', 'area-spots-circles', (e) => {
          if (e.features && e.features[0]) {
            const spotId = e.features[0].properties?.id;
            const spot = activeAreaSpots.find((s) => s.id === spotId);
            if (spot) {
              onSelectSpot(spot);
            }
          }
        });

        // Pin placement click handler
        map.on('click', (e) => {
          // If clicking an interactive layer, ignore canvas pin drop
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['place-labels', 'area-spots-circles'].filter((l) => map.getLayer(l)),
          });
          if (features.length > 0) return;

          if (pinPlacementActive && onDropPin) {
            onDropPin({
              lat: Number(e.lngLat.lat.toFixed(6)),
              lng: Number(e.lngLat.lng.toFixed(6)),
            });
          }
        });
      });
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onSelectArea, onSelectSpot, pinPlacementActive, onDropPin]);

  // Load and refresh places layer on camera move
  const updatePlaces = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    try {
      const bounds = map.getBounds();
      const zoom = Math.floor(map.getZoom());
      const bboxStr = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

      const areas = await fetchAdminAreas({ bbox: bboxStr, zoom });

      const source = map.getSource('admin-places') as GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: areas.map((a) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [a.label_lng, a.label_lat],
            },
            properties: {
              id: a.id,
              name: a.name,
              level: a.level,
              published_spot_count: a.published_spot_count,
            },
          })),
        });
      }
    } catch (e) {
      console.warn('[vector-map] Failed to load places:', e);
    }
  }, [mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    updatePlaces();
    map.on('moveend', updatePlaces);
    return () => {
      map.off('moveend', updatePlaces);
    };
  }, [mapLoaded, updatePlaces]);

  // Handle selected area: shape, mask, and camera fit
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const shapeSource = map.getSource('selected-area-shape') as GeoJSONSource | undefined;
    const maskSource = map.getSource('selected-area-mask') as GeoJSONSource | undefined;
    const spotsSource = map.getSource('area-spots') as GeoJSONSource | undefined;

    if (!selectedAreaId) {
      if (shapeSource) shapeSource.setData({ type: 'FeatureCollection', features: [] });
      if (maskSource) maskSource.setData({ type: 'FeatureCollection', features: [] });
      if (spotsSource) spotsSource.setData({ type: 'FeatureCollection', features: [] });
      setActiveAreaSpots([]);
      return;
    }

    let isCurrent = true;
    setLoadingShape(true);

    async function loadAreaDetails() {
      try {
        const [shapeData, spotsData] = await Promise.all([
          fetchAdminAreaShape(selectedAreaId!),
          fetchAdminAreaSpots(selectedAreaId!),
        ]);

        if (!isCurrent || !map) return;

        setActiveAreaSpots(spotsData.spots);

        // Update shape layer
        if (shapeSource && shapeData) {
          shapeSource.setData(shapeData);
        }

        // Update inverted mask
        if (maskSource && shapeData?.geometry) {
          const mask = buildInvertedMask(shapeData.geometry);
          if (mask) {
            maskSource.setData({
              type: 'Feature',
              geometry: mask,
              properties: {},
            });
          }
        }

        // Update destination pins
        if (spotsSource) {
          spotsSource.setData({
            type: 'FeatureCollection',
            features: spotsData.spots.map((s) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [s.gpsLng, s.gpsLat],
              },
              properties: {
                id: s.id,
                name: s.name,
                category: s.category,
              },
            })),
          });
        }

        // Fit camera to area geometry bounds if available
        if (shapeData?.geometry) {
          const coords: [number, number][] = [];
          const extractCoords = (c: any) => {
            if (typeof c[0] === 'number') coords.push([c[0], c[1]]);
            else c.forEach(extractCoords);
          };
          extractCoords(shapeData.geometry.coordinates);

          if (coords.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const [lng, lat] of coords) {
              if (lng < minX) minX = lng;
              if (lat < minY) minY = lat;
              if (lng > maxX) maxX = lng;
              if (lat > maxY) maxY = lat;
            }
            map.fitBounds(
              [
                [minX, minY],
                [maxX, maxY],
              ],
              { padding: { top: 60, bottom: 60, left: 60, right: 380 }, maxZoom: 15 }
            );
          }
        }
      } catch (err) {
        console.error('[vector-map] Error loading area shape/spots:', err);
      } finally {
        if (isCurrent) setLoadingShape(false);
      }
    }

    loadAreaDetails();

    return () => {
      isCurrent = false;
    };
  }, [selectedAreaId, mapLoaded]);

  // Handle draft marker for spot posting
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    let draftSource = map.getSource('draft-spot') as GeoJSONSource | undefined;
    if (!draftSource) {
      map.addSource('draft-spot', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'draft-spot-circle',
        type: 'circle',
        source: 'draft-spot',
        paint: {
          'circle-radius': 9,
          'circle-color': '#FFD166',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#582F0E',
        },
      });
      draftSource = map.getSource('draft-spot') as GeoJSONSource;
    }

    if (draftPin && draftSource) {
      draftSource.setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [draftPin.lng, draftPin.lat],
        },
        properties: {},
      });
    } else if (draftSource) {
      draftSource.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [draftPin, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {loadingShape && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-stone-900/80 text-white text-xs backdrop-blur-sm flex items-center gap-2">
          <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading area boundary...</span>
        </div>
      )}
    </div>
  );
}
