'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AdminAreaDetailModel,
  SpotModel,
  fetchAdminAreas,
  fetchAdminAreaDetail,
  fetchAdminAreaShape,
  fetchAdminAreaSpots,
} from '@/lib/api';
import { buildInvertedMask } from '@/lib/map-mask';
import { SpotPostingPin } from '@/lib/spot-posting';

export interface VectorMapCanvasProps {
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  onSelectSpot: (spot: SpotModel) => void;
  onClearArea: () => void;
  onAreaDetailLoaded?: (detail: AdminAreaDetailModel) => void;
  // Pin placement support
  pinPlacementActive?: boolean;
  onDropPin?: (pin: SpotPostingPin) => void;
  draftPin?: SpotPostingPin | null;
  // User location
  userLocation?: { lat: number; lng: number; accuracy: number } | null;
}

const PANGASINAN_CENTER: [number, number] = [120.33, 16.03]; // [lng, lat] for MapLibre

export function VectorMapCanvas({
  selectedAreaId,
  onSelectArea,
  onSelectSpot,
  onClearArea,
  onAreaDetailLoaded,
  pinPlacementActive = false,
  onDropPin,
  draftPin,
  userLocation,
}: VectorMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeAreaSpots, setActiveAreaSpots] = useState<SpotModel[]>([]);
  const activeAreaSpotsRef = useRef<SpotModel[]>([]);
  activeAreaSpotsRef.current = activeAreaSpots;

  // Store callback handlers in refs so map initialization never tears down on parent re-renders
  const onSelectAreaRef = useRef(onSelectArea);
  onSelectAreaRef.current = onSelectArea;
  const onSelectSpotRef = useRef(onSelectSpot);
  onSelectSpotRef.current = onSelectSpot;
  const onClearAreaRef = useRef(onClearArea);
  onClearAreaRef.current = onClearArea;
  const onAreaDetailLoadedRef = useRef(onAreaDetailLoaded);
  onAreaDetailLoadedRef.current = onAreaDetailLoaded;
  const pinPlacementActiveRef = useRef(pinPlacementActive);
  pinPlacementActiveRef.current = pinPlacementActive;
  const onDropPinRef = useRef(onDropPin);
  onDropPinRef.current = onDropPin;

  const [loadingShape, setLoadingShape] = useState(false);
  const moveEndTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize MapLibre ONCE on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isCancelled = false;

    async function initMap() {
      const maplibregl = (await import('maplibre-gl')).default;
      if (isCancelled || !containerRef.current) return;

      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      // Build style at runtime with absolute URLs for tiles & glyphs
      let resolvedStyle: any = '/map/style.json';
      try {
        const styleRes = await fetch('/map/style.json');
        if (styleRes.ok) {
          const styleJson = await styleRes.json();
          if (styleJson.sources?.openmaptiles?.tiles) {
            styleJson.sources.openmaptiles.tiles = styleJson.sources.openmaptiles.tiles.map((t: string) =>
              t.startsWith('/') ? `${origin}${t}` : t
            );
          }
          if (styleJson.glyphs && styleJson.glyphs.startsWith('/')) {
            styleJson.glyphs = `${origin}${styleJson.glyphs}`;
          }
          resolvedStyle = styleJson;
        }
      } catch (err) {
        console.warn('[vector-map] Could not fetch style.json for runtime absolute URL rewrite; using fallback transformRequest', err);
      }

      if (isCancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: resolvedStyle,
        center: PANGASINAN_CENTER,
        zoom: 9.5,
        minZoom: 6,
        maxZoom: 18,
        maxBounds: [
          [114.0, 4.0],
          [127.0, 22.0],
        ],
        attributionControl: false,
        transformRequest: (url: string) => {
          if (url.startsWith('/vt/') || url.startsWith('/map/')) {
            return { url: `${origin}${url}` };
          }
          return { url };
        },
      });

      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
        }),
        'bottom-right'
      );

      map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

      let layersAdded = false;
      const setupLayersAndPlaces = () => {
        if (isCancelled || layersAdded) return;
        if (!map.getSource('openmaptiles')) return;
        layersAdded = true;
        mapRef.current = map;
        if (typeof window !== 'undefined') {
          (window as any).__jdqVectorMap = map;
        }

        // Add places GeoJSON source for clickable towns and barangays
        if (!map.getSource('admin-places')) {
          map.addSource('admin-places', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
        }

        // Add selected area mask & highlight layers
        if (!map.getSource('selected-area-shape')) {
          map.addSource('selected-area-shape', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
        }

        if (!map.getSource('selected-area-mask')) {
          map.addSource('selected-area-mask', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
        }

        // Layer: Inverted dimming mask
        if (!map.getLayer('selected-area-mask-fill')) {
          map.addLayer({
            id: 'selected-area-mask-fill',
            type: 'fill',
            source: 'selected-area-mask',
            paint: {
              'fill-color': '#000000',
              'fill-opacity': 0.35,
            },
          });
        }

        // Layer: Selected area fill
        if (!map.getLayer('selected-area-fill')) {
          map.addLayer({
            id: 'selected-area-fill',
            type: 'fill',
            source: 'selected-area-shape',
            paint: {
              'fill-color': '#2D6A4F',
              'fill-opacity': 0.14,
            },
          });
        }

        // Layer: Selected area boundary outline
        if (!map.getLayer('selected-area-stroke')) {
          map.addLayer({
            id: 'selected-area-stroke',
            type: 'line',
            source: 'selected-area-shape',
            paint: {
              'line-color': '#2D6A4F',
              'line-width': 2.5,
              'line-opacity': 0.9,
            },
          });
        }

        // Layer: Clickable place symbols (name + spot count badge)
        if (!map.getLayer('place-labels')) {
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
        }

        // Add destination spots source for selected area
        if (!map.getSource('area-spots')) {
          map.addSource('area-spots', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
        }

        // Layer: Destination spot circles/pins
        if (!map.getLayer('area-spots-circles')) {
          map.addLayer({
            id: 'area-spots-circles',
            type: 'circle',
            source: 'area-spots',
            paint: {
              'circle-radius': 8,
              'circle-color': '#2D6A4F',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#FAF9F5',
            },
          });
        }

        // Click on place name -> select area
        map.on('click', 'place-labels', (e) => {
          if (e.features && e.features[0]) {
            const areaId = e.features[0].properties?.id;
            if (areaId) {
              onSelectAreaRef.current(areaId);
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
            const spot = activeAreaSpotsRef.current.find((s) => s.id === spotId);
            if (spot) {
              onSelectSpotRef.current(spot);
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

          if (pinPlacementActiveRef.current && onDropPinRef.current) {
            onDropPinRef.current({
              lat: Number(e.lngLat.lat.toFixed(6)),
              lng: Number(e.lngLat.lng.toFixed(6)),
            });
          }
        });

        // Mark loaded so effects run
        setMapLoaded(true);

        // Initial places fetch
        try {
          const bounds = map.getBounds();
          const zoom = Math.floor(map.getZoom());
          const bboxStr = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
          fetchAdminAreas({ bbox: bboxStr, zoom })
            .then((areas) => {
              const src = map.getSource('admin-places') as GeoJSONSource | undefined;
              if (src) {
                src.setData({
                  type: 'FeatureCollection',
                  features: areas.map((a) => ({
                    type: 'Feature',
                    geometry: {
                      type: 'Point',
                      coordinates: [a.label_lng, a.label_lat],
                    },
                    properties: {
                      id: a.id,
                      name: a.name === 'Dagupan' ? 'Dagupan City' : a.name,
                      raw_name: a.name,
                      level: a.level,
                      published_spot_count: a.published_spot_count,
                    },
                  })),
                });
              }
            })
            .catch((err) => {
              console.warn('[vector-map] Initial places load error:', err);
            });
        } catch (e) {
          console.warn('[vector-map] Initial bounds error:', e);
        }
      };

      map.on('load', setupLayersAndPlaces);
      map.on('styledata', setupLayersAndPlaces);
      if (map.isStyleLoaded()) {
        setupLayersAndPlaces();
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      if (moveEndTimerRef.current) {
        clearTimeout(moveEndTimerRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Load and refresh places layer on camera move (debounced)
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
              name: a.name === 'Dagupan' ? 'Dagupan City' : a.name,
              raw_name: a.name,
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

    // Trigger immediately on load
    updatePlaces();

    const handleMoveEnd = () => {
      if (moveEndTimerRef.current) {
        clearTimeout(moveEndTimerRef.current);
      }
      moveEndTimerRef.current = setTimeout(() => {
        updatePlaces();
      }, 250);
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
      if (moveEndTimerRef.current) {
        clearTimeout(moveEndTimerRef.current);
      }
    };
  }, [mapLoaded, updatePlaces]);

  // Handle selected area: shape, mask, detail metadata, and camera fit
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
      if (typeof window !== 'undefined') {
        (window as any).__jdqAreaState = null;
      }
      // Reset camera back to regional Pangasinan overview
      map.flyTo({ center: PANGASINAN_CENTER, zoom: 9.5, duration: 900 });
      return;
    }

    let isCurrent = true;
    setLoadingShape(true);

    async function loadAreaDetails() {
      try {
        const retryFetch = async <T,>(fn: () => Promise<T>, retries = 2): Promise<T> => {
          let lastErr: unknown;
          for (let i = 0; i <= retries; i++) {
            try {
              return await fn();
            } catch (e) {
              lastErr = e;
              if (i < retries) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
            }
          }
          throw lastErr;
        };

        const [detailData, shapeData, spotsData] = await Promise.all([
          retryFetch(() => fetchAdminAreaDetail(selectedAreaId!)).catch(() => null),
          retryFetch(() => fetchAdminAreaShape(selectedAreaId!)),
          retryFetch(() => fetchAdminAreaSpots(selectedAreaId!)),
        ]);

        if (!isCurrent || !map) return;

        if (detailData && onAreaDetailLoadedRef.current) {
          onAreaDetailLoadedRef.current(detailData);
        }

        setActiveAreaSpots(spotsData.spots);

        if (typeof window !== 'undefined') {
          (window as any).__jdqAreaState = {
            selectedAreaId,
            hasShape: Boolean(shapeData?.geometry),
            hasMask: Boolean(shapeData?.geometry),
            spotCount: spotsData.spots.length,
          };
        }

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
            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity;
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
              { padding: { top: 60, bottom: 60, left: 60, right: 340 }, maxZoom: 15, duration: 800 }
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
