'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup, TileLayer as LeafletTileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, normalizeQuest, normalizeSpot, QuestModel, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { createQuestPinHtml, createSpotPinHtml, createRegionalBeaconHtml } from '@/lib/map-icons';
import { declutterItems } from '@/lib/map-declutter';
import { useSavedLibrary } from '@/lib/saved-library';
import { MAP_TILE_ATTRIBUTION, MAP_TILE_MAX_ZOOM, MAP_TILE_URL } from '@/lib/map-tiles';
import { appRoutes } from '@/lib/routes';
import { MapWorkspacePanel, MobileSnapState } from '@/components/MapWorkspacePanel';
import { AreaDefinition, findAreaByIdOrName } from '@/lib/areas';

import {
  MapPin,
  Compass,
  Award,
  Navigation as NavIcon,
  X,
  RotateCw,
  ChevronRight,
  AlertTriangle,
  Bookmark,
  Search,
} from 'lucide-react';

const PHILIPPINES_CENTER: [number, number] = [15.89, 120.30];
const PANGASINAN_CENTER: [number, number] = [16.03, 120.33];
const MAP_CENTER = PANGASINAN_CENTER;
const DESTINATIONS_MIN_ZOOM = 9;
const INITIAL_MACRO_ZOOM = 7;
const REGIONAL_ZOOM = 10;
const FOCUSED_ZOOM = 13;

// One map host per browser session; retain rendered tiles and viewport state between route visits.
let retainedMap: LeafletMap | null = null;
let retainedHost: HTMLDivElement | null = null;
let retainedTileLayer: LeafletTileLayer | null = null;

function MapUrlSync({
  onSelectArea,
  onSelectSpot,
  onSelectQuest,
  spots,
  quests,
}: {
  onSelectArea: (area: AreaDefinition) => void;
  onSelectSpot: (spot: SpotModel) => void;
  onSelectQuest: (quest: QuestModel) => void;
  spots: SpotModel[];
  quests: QuestModel[];
}) {
  const searchParams = useSearchParams();
  const lastProcessedKeyRef = useRef<string>('');

  useEffect(() => {
    const areaQuery = searchParams.get('area') || searchParams.get('q') || '';
    const spotQuery = searchParams.get('spot') || '';
    const questQuery = searchParams.get('quest') || '';
    const latParam = searchParams.get('lat') || '';
    const lngParam = searchParams.get('lng') || '';
    const nameParam = searchParams.get('name') || '';
    const currentKey = `${areaQuery}:${spotQuery}:${questQuery}:${latParam}:${lngParam}:${nameParam}`;

    // Prevent infinite re-render cycles
    if (currentKey === lastProcessedKeyRef.current) {
      return;
    }

    if (areaQuery) {
      const matched = findAreaByIdOrName(areaQuery);
      if (matched) {
        lastProcessedKeyRef.current = currentKey;
        onSelectArea(matched);
        return;
      }
    }

    // Dynamic OpenStreetMap territory parameters (?lat=...&lng=...&name=...)
    if (latParam && lngParam && nameParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        const osmArea: AreaDefinition = {
          id: `osm-${lat.toFixed(4)}-${lng.toFixed(4)}`,
          name: nameParam,
          type: (searchParams.get('type') as any) || 'city',
          subtitle: searchParams.get('subtitle') || 'Territory via OpenStreetMap',
          center: [lat, lng],
          zoom: parseInt(searchParams.get('zoom') || '13', 10),
          keywords: [nameParam.toLowerCase()],
          source: 'osm',
        };
        lastProcessedKeyRef.current = currentKey;
        onSelectArea(osmArea);
        return;
      }
    }

    if (spotQuery && spots.length > 0) {
      const matched = spots.find((s) => s.id === spotQuery || s.slug === spotQuery);
      if (matched) {
        lastProcessedKeyRef.current = currentKey;
        onSelectSpot(matched);
        return;
      }
    }

    if (questQuery && quests.length > 0) {
      const matched = quests.find((q) => q.id === questQuery);
      if (matched) {
        lastProcessedKeyRef.current = currentKey;
        onSelectQuest(matched);
        return;
      }
    }

    lastProcessedKeyRef.current = currentKey;
  }, [searchParams, spots, quests, onSelectArea, onSelectSpot, onSelectQuest]);

  return null;
}

export default function QuestMapPage() {
  const { library: savedLibrary, toggle: toggleSaved, isSaved } = useSavedLibrary();
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'quest' | 'spot'; data: QuestModel | SpotModel } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'quests' | 'spots' | 'saved'>('all');
  const [currentZoom, setCurrentZoom] = useState<number>(INITIAL_MACRO_ZOOM);
  const [mapViewportNonce, setMapViewportNonce] = useState(0);
  const isZoomedIn = currentZoom >= DESTINATIONS_MIN_ZOOM;

  // Responsive Workspace Panel state (collapsed as default per user directive)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true);
  const [mobileSnap, setMobileSnap] = useState<MobileSnapState>('peek');
  const [activeArea, setActiveArea] = useState<AreaDefinition | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LeafletFeatureGroup | null>(null);
  const allCoordinatesRef = useRef<[number, number][]>([]);
  const fittedRef = useRef(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [questsRes, spotsRes] = await Promise.all([
        fetchWithCache(
          'map_quests',
          async () => {
            const res = await api.get('/quests');
            return (res.data.data as Parameters<typeof normalizeQuest>[0][]).map(normalizeQuest);
          },
          { ttlMs: 120_000, forceRefresh }
        ),
        fetchWithCache(
          'map_spots',
          async () => {
            const res = await api.get('/spots');
            return (res.data.data as Parameters<typeof normalizeSpot>[0][]).map(normalizeSpot);
          },
          { ttlMs: 120_000, forceRefresh }
        ),
      ]);

      const loadedQuests = questsRes.data;
      const loadedSpots = spotsRes.data;
      setQuests(loadedQuests);
      setSpots(loadedSpots);

      // Check URL search parameters for initial focus
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const urlArea = searchParams.get('area') || searchParams.get('q');
        const urlLat = parseFloat(searchParams.get('lat') || '');
        const urlLng = parseFloat(searchParams.get('lng') || '');
        const urlSpot = searchParams.get('spot');
        const urlQuest = searchParams.get('quest');

        const urlName = searchParams.get('name');

        if (urlArea) {
          const matchedArea = findAreaByIdOrName(urlArea);
          if (matchedArea) {
            setActiveArea(matchedArea);
            setIsDesktopCollapsed(true);
            setMobileSnap('peek');
          }
        } else if (!isNaN(urlLat) && !isNaN(urlLng) && urlName) {
          const osmArea: AreaDefinition = {
            id: `osm-${urlLat.toFixed(4)}-${urlLng.toFixed(4)}`,
            name: urlName,
            type: (searchParams.get('type') as any) || 'city',
            subtitle: searchParams.get('subtitle') || 'Territory via OpenStreetMap',
            center: [urlLat, urlLng],
            zoom: parseInt(searchParams.get('zoom') || '13', 10),
            keywords: [urlName.toLowerCase()],
            source: 'osm',
          };
          setActiveArea(osmArea);
          setIsDesktopCollapsed(true);
          setMobileSnap('peek');
        } else if (urlSpot) {
          const matchedSpot = loadedSpots.find((s) => s.id === urlSpot || s.slug === urlSpot);
          if (matchedSpot) {
            setSelectedItem({ type: 'spot', data: matchedSpot });
            setMobileSnap('half');
          }
        } else if (urlQuest) {
          const matchedQuest = loadedQuests.find((q) => q.id === urlQuest);
          if (matchedQuest) {
            setSelectedItem({ type: 'quest', data: matchedQuest });
            setMobileSnap('half');
          }
        } else if (!isNaN(urlLat) && !isNaN(urlLng)) {
          const matchedSpot = loadedSpots.find(
            (s) => Math.abs(s.gpsLat - urlLat) < 0.005 && Math.abs(s.gpsLng - urlLng) < 0.005
          );
          if (matchedSpot) {
            setSelectedItem({ type: 'spot', data: matchedSpot });
            setMobileSnap('half');
          } else {
            const matchedQuest = loadedQuests.find(
              (q) => Math.abs(q.gpsLat - urlLat) < 0.005 && Math.abs(q.gpsLng - urlLng) < 0.005
            );
            if (matchedQuest) {
              setSelectedItem({ type: 'quest', data: matchedQuest });
              setMobileSnap('half');
            }
          }
        }
      }
    } catch {
      setError('Could not load map coordinates from the server. The basemap remains interactive.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const filterParam = new URLSearchParams(window.location.search).get('filter');
      if (filterParam === 'saved') {
        setFilterType('saved');
      }
    }
  }, []);

  // Fit map to all loaded marker coordinates
  const handleFitBounds = useCallback(async () => {
    const map = mapInstanceRef.current || retainedMap;
    if (!map) return;
    if (allCoordinatesRef.current.length > 0) {
      const L = (await import('leaflet')).default;
      map.fitBounds(L.latLngBounds(allCoordinatesRef.current).pad(0.12));
    } else {
      map.flyTo(PANGASINAN_CENTER, REGIONAL_ZOOM, { duration: 1.0 });
    }
  }, []);

  // 1. Initialize or Re-attach Retained Leaflet Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let isDisposed = false;
    let activeMapCleanup: (() => void) | null = null;
    const onTileError = () => setTilesUnavailable(true);
    const onTileLoad = () => setTilesUnavailable(false);

    (async () => {
      const L = (await import('leaflet')).default;
      if (isDisposed || !mapContainerRef.current) return;

      try {
        if (retainedMap && retainedHost) {
          container.replaceChildren(retainedHost);
          mapInstanceRef.current = retainedMap;
          if (typeof window !== 'undefined' && !window.location.search && !fittedRef.current) {
            retainedMap.setView(PHILIPPINES_CENTER, INITIAL_MACRO_ZOOM, { animate: false });
          }
          setCurrentZoom(retainedMap.getZoom());

          if (!markersLayerRef.current) {
            markersLayerRef.current = L.featureGroup().addTo(retainedMap);
          }
        } else {
          const host = document.createElement('div');
          host.style.position = 'absolute';
          host.style.inset = '0';
          host.style.width = '100%';
          host.style.height = '100%';
          host.style.outline = 'none';

          container.replaceChildren(host);

          const map = L.map(host, {
            center: PHILIPPINES_CENTER,
            zoom: INITIAL_MACRO_ZOOM,
            zoomControl: false,
          });

          L.control.zoom({ position: 'bottomright' }).addTo(map);

          retainedTileLayer = L.tileLayer(MAP_TILE_URL, {
            maxZoom: MAP_TILE_MAX_ZOOM,
            attribution: MAP_TILE_ATTRIBUTION,
          }).addTo(map);

          markersLayerRef.current = L.featureGroup().addTo(map);
          mapInstanceRef.current = map;
          retainedMap = map;
          retainedHost = host;
          setCurrentZoom(INITIAL_MACRO_ZOOM);
        }

        retainedTileLayer?.on('tileerror', onTileError);
        retainedTileLayer?.on('tileload', onTileLoad);

        const activeMap = mapInstanceRef.current;
        if (activeMap) {
          const onZoomUpdate = () => {
            if (!isDisposed) {
              setCurrentZoom(activeMap.getZoom());
            }
          };

          const onViewportEnd = () => {
            if (!isDisposed) {
              setCurrentZoom(activeMap.getZoom());
              setMapViewportNonce((v) => v + 1);
            }
          };

          const onMapClick = (e: any) => {
            const z = activeMap.getZoom();
            if (z < DESTINATIONS_MIN_ZOOM) {
              const targetZoom = Math.min(Math.max(z + 3, REGIONAL_ZOOM), 12);
              activeMap.flyTo(e.latlng, targetZoom, { duration: 0.8 });
            } else {
              setSelectedItem(null);
            }
          };

          activeMap.on('zoom', onZoomUpdate);
          activeMap.on('zoomend', onViewportEnd);
          activeMap.on('moveend', onViewportEnd);
          activeMap.on('click', onMapClick);

          activeMapCleanup = () => {
            activeMap.off('zoom', onZoomUpdate);
            activeMap.off('zoomend', onViewportEnd);
            activeMap.off('moveend', onViewportEnd);
            activeMap.off('click', onMapClick);
          };

          activeMap.invalidateSize({ pan: false });
          requestAnimationFrame(() => {
            if (!isDisposed) activeMap.invalidateSize({ pan: false });
          });
          setTimeout(() => {
            if (!isDisposed) activeMap.invalidateSize({ pan: false });
          }, 150);
          setTimeout(() => {
            if (!isDisposed) activeMap.invalidateSize({ pan: false });
          }, 400);
        }
      } catch (e) {
        console.error('Leaflet initialization error:', e);
      }
    })();

    const resizeObserver = new ResizeObserver(() => {
      const map = mapInstanceRef.current || retainedMap;
      map?.invalidateSize({ pan: false });
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      activeMapCleanup?.();
      retainedTileLayer?.off('tileerror', onTileError);
      retainedTileLayer?.off('tileload', onTileLoad);
      resizeObserver.disconnect();
      markersLayerRef.current?.clearLayers();
      mapInstanceRef.current = null;
      retainedHost?.remove();
    };
  }, []);

  // Center on an item and open details, zooming in like Google Maps
  const handleSelectItem = useCallback((type: 'quest' | 'spot', data: QuestModel | SpotModel) => {
    setSelectedItem({ type, data });
    setActiveArea(null);
    setMobileSnap('half');
    setIsDesktopCollapsed(false);
    const map = mapInstanceRef.current || retainedMap;
    if (map) {
      try {
        const targetZoom = Math.max(map.getZoom(), 15);
        if ((map as any)._loaded) {
          map.flyTo([data.gpsLat, data.gpsLng], targetZoom, { duration: 0.8 });
        } else {
          map.setView([data.gpsLat, data.gpsLng], targetZoom);
        }
      } catch (e) {
        console.warn('Map view update deferred:', e);
      }
    }
  }, []);

  const handleSelectSpot = useCallback(
    (spot: SpotModel) => {
      handleSelectItem('spot', spot);
    },
    [handleSelectItem]
  );

  const handleSelectQuest = useCallback(
    (quest: QuestModel) => {
      handleSelectItem('quest', quest);
    },
    [handleSelectItem]
  );

  // 2. Render Markers on Map when Data or Filters Update
  useEffect(() => {
    const map = mapInstanceRef.current || retainedMap;
    const group = markersLayerRef.current;
    if (!map || !group) return;

    let isDisposed = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (isDisposed) return;

      group.clearLayers();
      const allCoordinates: [number, number][] = [
        ...quests.map((q): [number, number] => [q.gpsLat, q.gpsLng]),
        ...spots.map((s): [number, number] => [s.gpsLat, s.gpsLng]),
      ];
      allCoordinatesRef.current = allCoordinates;

      // 1. Zoomed-In: Smart spatial decluttering and collision-free POI pins
      if (isZoomedIn) {
        const candidateItems: Array<{ type: 'spot' | 'quest'; data: SpotModel | QuestModel }> = [];

        if (filterType === 'all' || filterType === 'quests' || filterType === 'saved') {
          quests
            .filter((q) => filterType !== 'saved' || isSaved('quests', q.id))
            .forEach((q) => candidateItems.push({ type: 'quest', data: q }));
        }

        if (filterType === 'all' || filterType === 'spots' || filterType === 'saved') {
          spots
            .filter((s) => filterType !== 'saved' || isSaved('spots', s.id))
            .forEach((s) => candidateItems.push({ type: 'spot', data: s }));
        }

        const bounds = map.getBounds().pad(0.15);
        const isInViewport = (lat: number, lng: number) => bounds.contains([lat, lng]);
        const toScreenPoint = (lat: number, lng: number) => {
          const pt = map.latLngToContainerPoint([lat, lng]);
          return { x: pt.x, y: pt.y };
        };

        const selectedId = selectedItem?.data.id;
        const decluttered = declutterItems(
          candidateItems,
          currentZoom,
          toScreenPoint,
          isInViewport,
          selectedId,
          isSaved
        );

        decluttered.forEach(({ type, data, showLabel }) => {
          const isSelected = selectedId === data.id;
          if (type === 'quest') {
            const q = data as QuestModel;
            const icon = L.divIcon({
              className: 'leaflet-custom-marker',
              html: createQuestPinHtml(
                isSelected,
                isSaved('quests', q.id),
                showLabel ? q.title : undefined,
                q.category
              ),
              iconAnchor: [18, 44],
            });

            L.marker([q.gpsLat, q.gpsLng], { icon })
              .on('click', (e) => {
                if (e?.originalEvent) e.originalEvent.stopPropagation();
                handleSelectItem('quest', q);
              })
              .addTo(group);
          } else {
            const s = data as SpotModel;
            const icon = L.divIcon({
              className: 'leaflet-custom-marker',
              html: createSpotPinHtml(
                isSelected,
                isSaved('spots', s.id),
                showLabel ? s.name : undefined,
                s.imageUrl,
                s.category,
                s.subcategory
              ),
              iconAnchor: [18, 44],
            });

            L.marker([s.gpsLat, s.gpsLng], { icon })
              .on('click', (e) => {
                if (e?.originalEvent) e.originalEvent.stopPropagation();
                handleSelectItem('spot', s);
              })
              .addTo(group);
          }
        });
      } else {
        // Macro zoom (< 9): spacious province beacon to guide travelers
        const totalCount = quests.length + spots.length;
        if (totalCount > 0) {
          const beaconIcon = L.divIcon({
            className: 'leaflet-custom-marker leaflet-beacon-marker',
            html: createRegionalBeaconHtml(totalCount, 'Pangasinan'),
            iconAnchor: [95, 76],
          });

          L.marker(PANGASINAN_CENTER, { icon: beaconIcon })
            .on('click', (e) => {
              if (e?.originalEvent) e.originalEvent.stopPropagation();
              map.flyTo(PANGASINAN_CENTER, REGIONAL_ZOOM, { duration: 0.8 });
            })
            .addTo(group);
        }
      }

      // Check URL parameters for explicit destination focus
      if (typeof window !== 'undefined' && !fittedRef.current) {
        const searchParams = new URLSearchParams(window.location.search);
        const urlArea = searchParams.get('area') || searchParams.get('q');
        const urlLat = parseFloat(searchParams.get('lat') || '');
        const urlLng = parseFloat(searchParams.get('lng') || '');
        const urlName = searchParams.get('name');
        const urlSpot = searchParams.get('spot');
        const urlQuest = searchParams.get('quest');

        if (urlArea) {
          const matchedArea = findAreaByIdOrName(urlArea);
          if (matchedArea) {
            setActiveArea(matchedArea);
            map.setView(matchedArea.center, matchedArea.zoom, { animate: true });
            fittedRef.current = true;
            return;
          }
        }

        if (!isNaN(urlLat) && !isNaN(urlLng)) {
          const zoomParam = parseInt(searchParams.get('zoom') || '', 10);
          const zoom = !isNaN(zoomParam) ? zoomParam : (urlName ? 13 : FOCUSED_ZOOM);
          if (urlName) {
            const dynamicArea: AreaDefinition = {
              id: `osm-${urlLat.toFixed(4)}-${urlLng.toFixed(4)}`,
              name: urlName,
              type: (searchParams.get('type') as any) || 'city',
              subtitle: searchParams.get('subtitle') || 'Territory via OpenStreetMap',
              center: [urlLat, urlLng],
              zoom,
              keywords: [urlName.toLowerCase()],
              source: 'osm',
            };
            setActiveArea(dynamicArea);
          }
          map.setView([urlLat, urlLng], zoom, { animate: true });
          fittedRef.current = true;
          return;
        }

        if (urlSpot) {
          const matched = spots.find((s) => s.id === urlSpot || s.slug === urlSpot);
          if (matched) {
            map.setView([matched.gpsLat, matched.gpsLng], FOCUSED_ZOOM, { animate: true });
            fittedRef.current = true;
            return;
          }
        }

        if (urlQuest) {
          const matched = quests.find((q) => q.id === urlQuest);
          if (matched) {
            map.setView([matched.gpsLat, matched.gpsLng], FOCUSED_ZOOM, { animate: true });
            fittedRef.current = true;
            return;
          }
        }
      }
    })();

    return () => {
      isDisposed = true;
    };
  }, [
    quests,
    spots,
    filterType,
    selectedItem?.data.id,
    savedLibrary,
    isSaved,
    isZoomedIn,
    currentZoom,
    mapViewportNonce,
    handleSelectItem,
  ]);

  // Center on a wide geographic area (e.g. Pangasinan province, Bolinao municipality)
  const handleSelectArea = useCallback((area: AreaDefinition) => {
    setActiveArea((prev) => (prev?.id === area.id ? prev : area));
    setSelectedItem(null);
    setIsDesktopCollapsed(true);
    setMobileSnap('peek');
    const map = mapInstanceRef.current || retainedMap;
    if (map) {
      try {
        if ((map as any)._loaded) {
          map.flyTo(area.center, area.zoom, { duration: 1.0 });
        } else {
          map.setView(area.center, area.zoom);
        }
      } catch (e) {
        console.warn('Map camera flight deferred:', e);
      }
    }
  }, []);

  // Clear area filter and return to full archipelago view
  const handleClearActiveArea = useCallback(() => {
    setActiveArea(null);
    const map = mapInstanceRef.current || retainedMap;
    if (map) {
      try {
        if ((map as any)._loaded) {
          map.flyTo(PHILIPPINES_CENTER, INITIAL_MACRO_ZOOM, { duration: 1.0 });
        } else {
          map.setView(PHILIPPINES_CENTER, INITIAL_MACRO_ZOOM);
        }
      } catch (e) {
        console.warn('Map camera flight deferred:', e);
      }
    }
  }, []);

  return (
    <Navigation fullBleed>
      <ErrorBoundary fallbackTitle="Unable to display destination map">
        <Suspense fallback={null}>
          <MapUrlSync
            onSelectArea={handleSelectArea}
            onSelectSpot={handleSelectSpot}
            onSelectQuest={handleSelectQuest}
            spots={spots}
            quests={quests}
          />
        </Suspense>

        <div className="relative w-full h-full min-h-0 flex-1 bg-stone-100 overflow-hidden select-none">
          {/* Edge-to-Edge Full Screen Leaflet Map Canvas */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* UNIFIED RESPONSIVE MAP WORKSPACE PANEL */}
          <MapWorkspacePanel
            title={
              selectedItem
                ? ('title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name)
                : activeArea
                ? activeArea.name
                : 'Destination Map'
            }
            subtitle={
              selectedItem
                ? ('locationName' in selectedItem.data ? selectedItem.data.locationName : selectedItem.data.municipality)
                : activeArea
                ? activeArea.subtitle
                : `${quests.length} Quests • ${spots.length} Spots`
            }
            badge={
              selectedItem
                ? selectedItem.type === 'quest'
                  ? { label: 'Quest', variant: 'amber' }
                  : { label: 'Spot', variant: 'emerald' }
                : activeArea
                ? { label: activeArea.type, variant: 'emerald' }
                : { label: 'Interactive', variant: 'emerald' }
            }
            isDesktopCollapsed={isDesktopCollapsed}
            onDesktopCollapseChange={setIsDesktopCollapsed}
            mobileSnap={mobileSnap}
            onMobileSnapChange={setMobileSnap}
            // Floating tools (Top-right)
            floatingTools={
              <>
                {activeArea && (
                  <button
                    type="button"
                    onClick={handleClearActiveArea}
                    title={`Clear ${activeArea.name} (Reset to whole country)`}
                    aria-label="Clear area filter"
                    className="w-10 h-10 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-[#2D6A4F] shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleFitBounds}
                  title="Fit All Coordinates"
                  aria-label="Fit all markers in view"
                  className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => fetchData(true)}
                  title="Reload Coordinates"
                  aria-label="Reload map data"
                  className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2D6A4F]' : ''}`} />
                </button>

                <Link
                  href="/search"
                  title="Search Destinations"
                  aria-label="Search spots and destinations"
                  className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95"
                >
                  <Search className="w-4 h-4" />
                </Link>
              </>
            }
            // Mobile Peek Bar Slot (compact summary)
            peekContent={
              selectedItem ? (
                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base shrink-0">
                      {selectedItem.type === 'quest' ? '🏆' : '📍'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-[#582F0E] truncate">
                        {'title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name}
                      </p>
                      <p className="text-[10px] text-[#837560] font-semibold truncate leading-tight">
                        {'locationName' in selectedItem.data
                          ? selectedItem.data.locationName
                          : selectedItem.data.municipality}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/navigate?name=${encodeURIComponent(
                      'title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name
                    )}&lat=${selectedItem.data.gpsLat}&lng=${selectedItem.data.gpsLng}&address=${encodeURIComponent(
                      'locationName' in selectedItem.data
                        ? selectedItem.data.locationName
                        : selectedItem.data.address
                    )}`}
                    onClick={(e) => e.stopPropagation()}
                    className="min-h-[32px] px-3 rounded-xl bg-[#2D6A4F] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs shrink-0"
                  >
                    <NavIcon className="w-3 h-3 text-[#FFB703]" />
                    <span>Go</span>
                  </Link>
                </div>
              ) : activeArea ? (
                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Compass className="w-3.5 h-3.5 text-[#FFB703]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-black text-[#582F0E] truncate">{activeArea.name}</h2>
                      <p className="text-[10px] text-[#837560] font-semibold truncate leading-tight">
                        {activeArea.subtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearActiveArea();
                    }}
                    className="min-h-[30px] px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#582F0E] text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Reset to whole map"
                  >
                    <span>Reset</span>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <MapPin className="w-3.5 h-3.5 text-[#FFB703]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xs font-black text-[#582F0E] truncate">Destination Map</h2>
                    <p className="text-[10px] text-[#837560] font-semibold truncate leading-tight">
                      {quests.length + spots.length} places pinned across Pangasinan
                    </p>
                  </div>
                </div>
              )
            }
          >
            {selectedItem ? (
              <div className="space-y-3.5">
                {/* Top subheader with category badge & deselect */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#FAF9F5] border border-[#E3DFD5] text-[#582F0E]">
                      {selectedItem.type === 'quest' ? '🏆 Quest Trail' : '📍 Destination Spot'}
                    </span>
                    {selectedItem.type === 'quest' && (
                      <div className="flex items-center gap-1 text-[#7D5800] text-[11px] font-black bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Award className="w-3 h-3 text-[#FFB703]" />
                        <span>+{(selectedItem.data as QuestModel).rewardPoints} mJDQ</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(null);
                      setMobileSnap('peek');
                    }}
                    className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                    title="Deselect place"
                    aria-label="Deselect place"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-[#2C221E] leading-snug">
                    {'title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name}
                  </h3>
                  <p className="text-xs text-[#514532] leading-relaxed line-clamp-4">
                    {selectedItem.data.description}
                  </p>
                </div>

                {/* Verified Location Bar */}
                <div className="p-2.5 bg-[#FAF9F5] rounded-2xl border border-[#E3DFD5] text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-[#2C221E] truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                    <span className="truncate">
                      {'locationName' in selectedItem.data
                        ? selectedItem.data.locationName
                        : selectedItem.data.municipality}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[#2D6A4F] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 ml-2">
                    Verified Pin
                  </span>
                </div>

                {/* Actions: Navigate, View Details, Bookmark */}
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pt-1">
                  <Link
                    href={`/navigate?name=${encodeURIComponent(
                      'title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name
                    )}&lat=${selectedItem.data.gpsLat}&lng=${selectedItem.data.gpsLng}&address=${encodeURIComponent(
                      'locationName' in selectedItem.data
                        ? selectedItem.data.locationName
                        : selectedItem.data.address
                    )}`}
                    className="min-w-0 min-h-[42px] py-2 px-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                  >
                    <NavIcon className="w-3.5 h-3.5 text-[#FFB703] shrink-0" />
                    <span className="truncate">Navigate</span>
                  </Link>

                  {selectedItem.type === 'quest' ? (
                    <Link
                      href={appRoutes.quest(selectedItem.data.id)}
                      className="min-w-0 min-h-[42px] py-2 px-3 rounded-xl bg-[#FAF9F5] hover:bg-white text-[#582F0E] font-bold text-xs border border-[#E3DFD5] flex items-center justify-center gap-1 transition active:scale-95"
                    >
                      <span className="truncate">View Quest</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </Link>
                  ) : (
                    <Link
                      href={appRoutes.spot((selectedItem.data as SpotModel).id)}
                      className="min-w-0 min-h-[42px] py-2 px-3 rounded-xl bg-[#FAF9F5] hover:bg-white text-[#582F0E] font-bold text-xs border border-[#E3DFD5] flex items-center justify-center gap-1 transition active:scale-95"
                    >
                      <span className="truncate">View Spot</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      toggleSaved(selectedItem.type === 'quest' ? 'quests' : 'spots', selectedItem.data.id)
                    }
                    title={
                      isSaved(selectedItem.type === 'quest' ? 'quests' : 'spots', selectedItem.data.id)
                        ? 'Remove from saved'
                        : 'Save for later'
                    }
                    className={`flex w-10 min-h-[42px] items-center justify-center rounded-xl border transition cursor-pointer ${
                      isSaved(selectedItem.type === 'quest' ? 'quests' : 'spots', selectedItem.data.id)
                        ? 'border-amber-300 bg-amber-50 text-[#B45309]'
                        : 'border-[#E3DFD5] bg-[#FAF9F5] text-[#837560] hover:text-[#2D6A4F]'
                    }`}
                  >
                    <Bookmark
                      className={`h-4 w-4 ${
                        isSaved(selectedItem.type === 'quest' ? 'quests' : 'spots', selectedItem.data.id)
                          ? 'fill-current'
                          : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeArea ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-[#2D6A4F]" />
                        <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-wider">
                          Active Geographic Zone
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearActiveArea}
                        className="text-stone-400 hover:text-stone-700 p-0.5 rounded-lg hover:bg-white transition cursor-pointer"
                        title="Clear area filter"
                        aria-label="Clear area filter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-extrabold text-[#582F0E]">{activeArea.name}</h3>
                      <p className="text-xs text-[#514532] leading-relaxed">{activeArea.subtitle}</p>
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-[#837560] border-t border-emerald-200/60">
                      <span>Zoom Level {activeArea.zoom}</span>
                      <button
                        type="button"
                        onClick={() => handleSelectArea(activeArea)}
                        className="text-[#2D6A4F] font-bold hover:underline cursor-pointer"
                      >
                        Re-center area
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center mx-auto">
                      <MapPin className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#582F0E]">Select a pin on the map</p>
                      <p className="text-[11px] text-[#837560] mt-0.5 leading-relaxed">
                        Tap any quest 🏆 or spot 📍 marker to view details, rewards, and sovereign navigation.
                      </p>
                    </div>
                  </div>
                )}

                {/* Map Pin Filter Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#837560] px-1">
                    Filter Map Markers
                  </span>
                  <div className="grid grid-cols-4 gap-1 bg-[#FAF9F5] p-1 rounded-xl border border-[#E3DFD5]">
                    {[
                      { id: 'all', label: 'All', count: quests.length + spots.length },
                      { id: 'quests', label: 'Quests', count: quests.length },
                      { id: 'spots', label: 'Spots', count: spots.length },
                      { id: 'saved', label: 'Saved', count: savedLibrary.spots.length + savedLibrary.quests.length },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterType(f.id as any)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
                          filterType === f.id
                            ? 'bg-[#2D6A4F] text-white shadow-xs'
                            : 'text-[#582F0E] hover:bg-white'
                        }`}
                      >
                        <span className="truncate">{f.label}</span>
                        <span
                          className={`text-[9px] px-1 py-0.1 rounded-full font-black ${
                            filterType === f.id ? 'bg-white/20 text-white' : 'text-[#837560]'
                          }`}
                        >
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </MapWorkspacePanel>

          {/* Loading Indicator Toast */}
          {loading && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-[#E3DFD5] shadow-md flex items-center gap-2 text-xs font-bold text-[#582F0E]">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-[#2D6A4F]" />
              <span>Loading destination markers...</span>
            </div>
          )}

          {/* Error Toast */}
          {error && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-amber-50/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-200 shadow-md flex items-center gap-2 text-xs font-bold text-[#7D5800]">
              <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
              <span>{error}</span>
              <button
                onClick={() => fetchData(true)}
                className="underline ml-2 text-[#2D6A4F] hover:text-[#1B4332] cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {tilesUnavailable && (
            <div role="status" className="absolute bottom-20 left-4 right-4 z-20 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-xs font-semibold text-amber-900 shadow-md sm:right-auto sm:max-w-sm">
              Map tiles are unavailable in this local setup. Pins and place details still work.{' '}
              <button type="button" onClick={() => retainedTileLayer?.redraw()} className="min-h-11 font-bold underline underline-offset-2">
                Retry tiles
              </button>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
