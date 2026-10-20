'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap, GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
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
import { isPointInsideGeometry } from '@/lib/map-geometry';
import { SpotPostingPin } from '@/lib/spot-posting';
import { MapPin, Navigation, Eye, Award } from 'lucide-react';
import Link from 'next/link';
import { appRoutes } from '@/lib/routes';

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

interface HoverCardState {
  spot: SpotModel;
  x: number;
  y: number;
  questCount?: number;
}

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

  // Selected area geometry for D7 click-away boundary check
  const activeAreaGeometryRef = useRef<any | null>(null);
  const selectedAreaIdRef = useRef<string | null>(selectedAreaId);
  selectedAreaIdRef.current = selectedAreaId;

  // Hover card state for D8
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null);

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

      map.on('error', (e) => {
        console.error('[vector-map-error]', e.error ? e.error.message : e);
      });

      let layersAdded = false;
      const setupLayersAndPlaces = () => {
        if (isCancelled || layersAdded) return;
        if (!map.getSource('openmaptiles')) return;
        layersAdded = true;
        mapRef.current = map;
        if (typeof window !== 'undefined') {
          (window as any).__jdqVectorMap = map;
          (window as any).__jdqSelectArea = (areaId: string) => onSelectAreaRef.current(areaId);
          (window as any).__jdqClearArea = () => onClearAreaRef.current();
        }

        // Synchronously draw JDQ teardrop pin icons to canvas ImageData (D9)
        const registerPinImage = (name: string, width: number, height: number, selected: boolean) => {
          if (map.hasImage(name)) return;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const cx = width / 2;
          const cy = selected ? 12 : 10;
          const r = selected ? 10 : 9;
          const tipY = selected ? 29 : 25;

          // Subtle ground drop shadow
          ctx.beginPath();
          ctx.ellipse(cx, height - 2, selected ? 6 : 5, selected ? 1.8 : 1.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = selected ? 'rgba(0, 0, 0, 0.30)' : 'rgba(0, 0, 0, 0.22)';
          ctx.fill();

          // Optional selection ring (D9)
          if (selected) {
            ctx.beginPath();
            ctx.arc(cx, cy, 11.2, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFB703';
            ctx.lineWidth = 2.2;
            ctx.stroke();
          }

          // Teardrop body (#2D6A4F fill, #1B4332 1.5px outline)
          const path = new Path2D(
            selected
              ? 'M13 2C7.47715 2 3 6.47715 3 12C3 19.2 11.6 27.8 12.3 28.5C12.7 28.9 13.3 28.9 13.7 28.5C14.4 27.8 23 19.2 23 12C23 6.47715 18.5228 2 13 2Z'
              : 'M10 1C5.02944 1 1 5.02944 1 10C1 16.5 8.8 24.2 9.4 24.8C9.75 25.1 10.25 25.1 10.6 24.8C11.2 24.2 19 16.5 19 10C19 5.02944 14.9706 1 10 1Z'
          );
          ctx.fillStyle = '#2D6A4F';
          ctx.fill(path);
          ctx.strokeStyle = '#1B4332';
          ctx.lineWidth = selected ? 1.8 : 1.5;
          ctx.lineJoin = 'round';
          ctx.stroke(path);

          // White center dot
          ctx.beginPath();
          ctx.arc(cx, cy, selected ? 3.8 : 3.2, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          const imgData = ctx.getImageData(0, 0, width, height);
          map.addImage(name, imgData);
        };

        registerPinImage('jdq-pin-slimmer', 20, 28, false);
        registerPinImage('jdq-pin-selected', 26, 34, true);

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

        // Add destination spots source for selected area (supports clustering D6)
        if (!map.getSource('area-spots')) {
          map.addSource('area-spots', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: 11,
            clusterRadius: 50,
          });
        }

        // Clusters for macro / province zoom (zoom < 12)
        if (!map.getLayer('area-spots-clusters')) {
          map.addLayer({
            id: 'area-spots-clusters',
            type: 'circle',
            source: 'area-spots',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['coalesce', ['get', 'point_count'], 0],
                '#2D6A4F',
                10,
                '#1B4332',
                25,
                '#0B271E',
              ],
              'circle-radius': [
                'step',
                ['coalesce', ['get', 'point_count'], 0],
                16,
                10,
                20,
                25,
                24,
              ],
              'circle-stroke-width': 3,
              'circle-stroke-color': '#FAF9F5',
            },
          });
        }

        if (!map.getLayer('area-spots-cluster-count')) {
          map.addLayer({
            id: 'area-spots-cluster-count',
            type: 'symbol',
            source: 'area-spots',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['to-string', ['coalesce', ['get', 'point_count_abbreviated'], ['get', 'point_count'], '']],
              'text-font': ['Noto Sans Bold'],
              'text-size': 12,
            },
            paint: {
              'text-color': '#FAF9F5',
            },
          });
        }

        // Unclustered pins: Slimmer JDQ Pin icon with Destination Name pill beside it (D9)
        if (!map.getLayer('area-spots-pins')) {
          map.addLayer({
            id: 'area-spots-pins',
            type: 'symbol',
            source: 'area-spots',
            filter: ['!', ['has', 'point_count']],
            layout: {
              'icon-image': 'jdq-pin-slimmer',
              'icon-size': 1.0,
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              'text-field': ['coalesce', ['get', 'name'], ''],
              'text-font': ['Noto Sans Bold'],
              'text-size': 11,
              'text-anchor': 'left',
              'text-offset': [0.9, -1.1],
              'text-optional': true,
              'text-allow-overlap': false,
            },
            paint: {
              'text-color': '#1B4332',
              'text-halo-color': '#FAF9F5',
              'text-halo-width': 2.0,
            },
          });
        }

        // Click cluster -> zoom in
        map.on('click', 'area-spots-clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['area-spots-clusters'] });
          if (!features || !features[0]) return;
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource('area-spots') as any;
          if (source && source.getClusterExpansionZoom) {
            source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
              if (err) return;
              const geom = features[0].geometry as any;
              map.easeTo({ center: geom.coordinates, zoom: zoom + 0.5 });
            });
          }
        });

        // Click on place name -> select area
        map.on('click', 'place-labels', (e) => {
          if (e.features && e.features[0]) {
            const areaId = e.features[0].properties?.id;
            if (areaId) {
              onSelectAreaRef.current(areaId);
            }
          }
        });

        // Cursor style for places & clusters
        map.on('mouseenter', 'place-labels', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'place-labels', () => {
          map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'area-spots-clusters', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'area-spots-clusters', () => {
          map.getCanvas().style.cursor = '';
        });

        // Spot pin interactions: Hover (D8) & Click
        map.on('mouseenter', 'area-spots-pins', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          if (e.features && e.features[0]) {
            const spotId = e.features[0].properties?.id;
            const spot = activeAreaSpotsRef.current.find((s) => s.id === spotId);
            if (spot) {
              setHoveredSpotId(spot.id);
              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
              hoverTimerRef.current = setTimeout(() => {
                setHoverCard({
                  spot,
                  x: e.point.x,
                  y: e.point.y,
                  questCount: spot.questId ? 1 : 0,
                });
              }, 150); // ~150ms delay per D8
            }
          }
        });

        map.on('mousemove', 'area-spots-pins', (e) => {
          if (e.features && e.features[0]) {
            const spotId = e.features[0].properties?.id;
            if (hoverCard && hoverCard.spot.id === spotId) {
              // Update point position if mouse moves slightly
              setHoverCard((prev) => (prev ? { ...prev, x: e.point.x, y: e.point.y } : null));
            }
          }
        });

        map.on('mouseleave', 'area-spots-pins', () => {
          map.getCanvas().style.cursor = '';
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          setHoveredSpotId(null);
          setHoverCard(null);
        });

        // Click on spot pin -> select spot directly (or open spot)
        map.on('click', 'area-spots-pins', (e) => {
          if (e.features && e.features[0]) {
            const spotId = e.features[0].properties?.id;
            const spot = activeAreaSpotsRef.current.find((s) => s.id === spotId);
            if (spot) {
              onSelectSpotRef.current(spot);
            }
          }
        });

        // D7 Click-away & pin placement click handler
        map.on('click', (e: MapMouseEvent) => {
          // If clicking an interactive layer (place label, pin, or cluster), handled by their specific handlers
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['place-labels', 'area-spots-pins', 'area-spots-clusters'].filter((l) => map.getLayer(l)),
          });
          if (features.length > 0) return;

          // Spot drop pin if placement mode is active
          if (pinPlacementActiveRef.current && onDropPinRef.current) {
            onDropPinRef.current({
              lat: Number(e.lngLat.lat.toFixed(6)),
              lng: Number(e.lngLat.lng.toFixed(6)),
            });
            return;
          }

          // D7 Click-away: Clicking OUTSIDE the highlighted area clears the selection;
          // Clicking INSIDE does nothing unless a name or pin was clicked.
          if (selectedAreaIdRef.current && activeAreaGeometryRef.current) {
            const isInside = isPointInsideGeometry(e.lngLat.lng, e.lngLat.lat, activeAreaGeometryRef.current);
            if (!isInside) {
              onClearAreaRef.current();
            }
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
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
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
      activeAreaGeometryRef.current = null;
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

        activeAreaGeometryRef.current = shapeData?.geometry || null;

        if (detailData && onAreaDetailLoadedRef.current) {
          onAreaDetailLoadedRef.current(detailData);
        }

        setActiveAreaSpots(spotsData.spots);

        if (typeof window !== 'undefined') {
          (window as any).__jdqSelectArea = (areaId: string) => onSelectAreaRef.current(areaId);
          (window as any).__jdqClearArea = () => onClearAreaRef.current();
          (window as any).__jdqAreaState = {
            selectedAreaId,
            hasShape: Boolean(shapeData?.geometry),
            hasMask: Boolean(shapeData?.geometry),
            isFallbackCircle: Boolean(shapeData?.properties?.is_fallback_circle),
            geomType: shapeData?.geometry?.type,
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

        // Update destination pins (supports clustering for province overview D6)
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
                name: s.name || '',
                category: s.category || '',
                municipality: s.municipality || '',
                imageUrl: s.imageUrl || '',
                questId: s.questId || '',
                description: s.description || '',
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

            const isProvince = selectedAreaId === 'pangasinan';
            map.fitBounds(
              [
                [minX, minY],
                [maxX, maxY],
              ],
              {
                padding: { top: 60, bottom: 60, left: 60, right: 340 },
                maxZoom: isProvince ? 10.5 : 15,
                duration: 800,
              }
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

      {/* D8 Hover Preview Card */}
      {hoverCard && (
        <div
          data-testid="pin-hover-card"
          className="absolute z-20 pointer-events-auto bg-[#FAF9F5] border border-[#E3DFD5] rounded-2xl shadow-xl p-3 w-64 max-w-[calc(100vw-32px)] text-[#2C221E] transition-opacity duration-150"
          style={{
            // Position carefully so card never covers its pin or leaves the viewport
            left: Math.max(16, Math.min(hoverCard.x - 128, (containerRef.current?.clientWidth || 800) - 272)),
            top: hoverCard.y > 220 ? hoverCard.y - 195 : hoverCard.y + 25,
          }}
          onMouseEnter={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          }}
          onMouseLeave={() => {
            setHoverCard(null);
            setHoveredSpotId(null);
          }}
        >
          {hoverCard.spot.imageUrl && (
            <div className="w-full h-24 mb-2 rounded-xl overflow-hidden bg-stone-200">
              <img
                src={hoverCard.spot.imageUrl}
                alt={hoverCard.spot.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-[#2D6A4F] border border-emerald-200 truncate">
              {hoverCard.spot.category?.replace(/_/g, ' ') || 'Spot'}
            </span>
            {hoverCard.questCount && hoverCard.questCount > 0 ? (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-[#7D5800] border border-amber-200 flex items-center gap-1">
                <Award className="w-2.5 h-2.5 text-[#FFB703]" />
                Eco-Quest
              </span>
            ) : null}
          </div>

          <h4 className="text-xs font-bold text-[#1B4332] line-clamp-1 leading-snug">
            {hoverCard.spot.name}
          </h4>

          <div className="flex items-center gap-1 text-[10px] text-[#582F0E]/80 mt-0.5 mb-1.5 truncate">
            <MapPin className="w-3 h-3 text-[#2D6A4F] shrink-0" />
            <span className="truncate">
              {hoverCard.spot.municipality || 'Pangasinan'}
            </span>
          </div>

          {hoverCard.spot.description && (
            <p className="text-[10px] text-[#514532] line-clamp-2 leading-relaxed mb-2.5">
              {hoverCard.spot.description}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-[#E3DFD5]">
            <button
              type="button"
              onClick={() => {
                onSelectSpotRef.current(hoverCard.spot);
                setHoverCard(null);
              }}
              className="flex-1 py-1 px-2.5 rounded-lg bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>View</span>
            </button>
            <Link
              href={`/navigate?name=${encodeURIComponent(hoverCard.spot.name)}&lat=${hoverCard.spot.gpsLat}&lng=${hoverCard.spot.gpsLng}`}
              className="py-1 px-2 rounded-lg bg-white border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] text-[11px] font-bold flex items-center justify-center transition active:scale-95"
            >
              <Navigation className="w-3 h-3 text-[#FFB703]" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
