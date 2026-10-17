'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup, TileLayer as LeafletTileLayer, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, normalizeQuest, normalizeSpot, QuestModel, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SpotPostingWizard } from '@/components/SpotPostingWizard';
import { TrailPreviewCard } from '@/components/TrailPreviewCard';
import type { SpotPostingPin } from '@/lib/spot-posting';
import { createQuestPinHtml, createSpotPinHtml, createAreaHitboxHtml } from '@/lib/map-icons';
import { declutterItems } from '@/lib/map-declutter';
import { useSavedLibrary } from '@/lib/saved-library';
import { clusterPoints, MapCluster, MapClusterPoint } from '@/lib/map-cluster';
import { createClusterIcon } from '@/components/map/ClusterIcon';
import { createBaseTileLayer, MAP_MAP_MAX_ZOOM } from '@/lib/map-tiles';
import { PANGASINAN_BOUNDS, PH_LEAFLET_BOUNDS } from '@/lib/map-bounds';
import { clampMapZoom, isValidLatitude, isValidLongitude } from '@/lib/map-url';
import { appRoutes } from '@/lib/routes';
import { MapWorkspacePanel, MobileSnapState } from '@/components/MapWorkspacePanel';
import { MapSearchOverlay } from '@/components/MapSearchOverlay';
import SignInSheet from '@/components/SignInSheet';
import { AreaDefinition, findAreaByIdOrName, KNOWN_AREAS } from '@/lib/areas';
import { formatPoints } from '@/lib/copy';

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
  LocateFixed,
  HelpCircle,
  PlusCircle,
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
let retainedMarkersLayer: LeafletFeatureGroup | null = null;
const retainedMarkerRegistry = new Map<string, LeafletMarker>();
const retainedMarkerSignatures = new Map<string, string>();
const retainedAreaMarkers = new Map<string, LeafletMarker>();
let retainedUserMarker: LeafletMarker | null = null;
let retainedUserCircle: ReturnType<typeof import('leaflet').circle> | null = null;

function hasMapFocusParameters(search: string): boolean {
  const params = new URLSearchParams(search);
  return ['area', 'q', 'spot', 'quest', 'lat', 'lng'].some((key) => params.has(key));
}

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
      if (isValidLatitude(lat) && isValidLongitude(lng)) {
        const osmArea: AreaDefinition = {
          id: `osm-${lat.toFixed(4)}-${lng.toFixed(4)}`,
          name: nameParam,
          type: (searchParams.get('type') as any) || 'city',
          subtitle: searchParams.get('subtitle') || 'Territory via OpenStreetMap',
          center: [lat, lng],
          zoom: clampMapZoom(parseFloat(searchParams.get('zoom') || '13')),
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
  const router = useRouter();
  const { user } = useAuth();
  const { library: savedLibrary, toggle: toggleSaved, isSaved } = useSavedLibrary();
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'quest' | 'spot'; data: QuestModel | SpotModel } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'quests' | 'spots' | 'saved'>('all');
  const [currentZoom, setCurrentZoom] = useState<number>(REGIONAL_ZOOM);
  const [mapViewportNonce, setMapViewportNonce] = useState(0);
  const [clusterZoom, setClusterZoom] = useState<number>(REGIONAL_ZOOM);
  const isZoomedIn = currentZoom >= DESTINATIONS_MIN_ZOOM;

  // Responsive Workspace Panel state (collapsed as default per user directive)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true);
  const [mobileSnap, setMobileSnap] = useState<MobileSnapState>('peek');
  const [activeArea, setActiveArea] = useState<AreaDefinition | null>(null);

  const [signInPrompt, setSignInPrompt] = useState<{ open: boolean; actionLabel: string }>({
    open: false,
    actionLabel: 'Pin a destination',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [clusterItems, setClusterItems] = useState<Array<{ type: 'quest' | 'spot'; data: QuestModel | SpotModel }> | null>(null);

  // Explicit locate flow only: no location request before the traveler asks.
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const followUserRef = useRef(false);

  // Map-first destination posting: armed pin placement, draft pin and wizard.
  const [pinPlacementActive, setPinPlacementActive] = useState(false);
  const [draftPin, setDraftPin] = useState<SpotPostingPin | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMinimized, setWizardMinimized] = useState(false);
  const [pinHelpOpen, setPinHelpOpen] = useState(false);
  const pinPlacementRef = useRef(false);
  const pinPlacementCommitRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const draftMarkerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    pinPlacementRef.current = pinPlacementActive;
  }, [pinPlacementActive]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LeafletFeatureGroup | null>(retainedMarkersLayer);
  const markerRegistryRef = useRef(retainedMarkerRegistry);
  const markerSignaturesRef = useRef(retainedMarkerSignatures);
  const areaMarkersRef = useRef(retainedAreaMarkers);
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
        } else if (isValidLatitude(urlLat) && isValidLongitude(urlLng) && urlName) {
          const osmArea: AreaDefinition = {
            id: `osm-${urlLat.toFixed(4)}-${urlLng.toFixed(4)}`,
            name: urlName,
            type: (searchParams.get('type') as any) || 'city',
            subtitle: searchParams.get('subtitle') || 'Territory via OpenStreetMap',
            center: [urlLat, urlLng],
            zoom: clampMapZoom(parseFloat(searchParams.get('zoom') || '13')),
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
        } else if (isValidLatitude(urlLat) && isValidLongitude(urlLng)) {
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

  // Check ?add=1 query param to arm pin mode (redirects to login if signed out)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === '1') {
      if (!user) {
        setSignInPrompt({ open: true, actionLabel: 'Pin a destination' });
      } else {
        setPinPlacementActive(true);
      }
      router.replace('/map');
    }
  }, [user, router]);

  // Escape key cancels pin placement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pinPlacementActive) {
        setPinPlacementActive(false);
        if (wizardOpen) setWizardMinimized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinPlacementActive, wizardOpen]);

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

  // Truthful locate flow: explicit action, bounded timeout, honest failure copy.
  const handleUseMyLocation = useCallback(() => {
    setLocationNotice('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationNotice('Location is not available in this browser. Use search or pan the map instead.');
      return;
    }
    setLocating(true);
    followUserRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
        if (accuracy > 2000) {
          setLocationNotice(`Approximate location shown (±${Math.round(accuracy)} m). Move to an open area for a better fix.`);
        }
        // Respect a manual pan that happened while the fix was pending.
        if (!followUserRef.current) return;
        const map = mapInstanceRef.current || retainedMap;
        if (map) {
          try {
            map.flyTo([latitude, longitude], Math.max(map.getZoom(), 14), { duration: 0.8 });
          } catch (e) {
            console.warn('Locate camera flight deferred:', e);
          }
        }
      },
      (geoError) => {
        setLocating(false);
        if (geoError.code === 1) {
          setLocationNotice('Location permission was denied. Search or pan the map instead.');
        } else if (geoError.code === 3) {
          setLocationNotice('Finding your location timed out. Try again or use search.');
        } else {
          setLocationNotice('Your location could not be determined. Search or pan the map instead.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
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
          if (typeof window !== 'undefined' && !hasMapFocusParameters(window.location.search) && !fittedRef.current) {
            retainedMap.fitBounds(PANGASINAN_BOUNDS, { animate: false });
          }
          setCurrentZoom(retainedMap.getZoom());

          if (!markersLayerRef.current) {
            markersLayerRef.current = retainedMarkersLayer ?? L.featureGroup().addTo(retainedMap);
            retainedMarkersLayer = markersLayerRef.current;
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
            center: PANGASINAN_CENTER,
            zoom: REGIONAL_ZOOM,
            minZoom: 5,
            maxZoom: MAP_MAP_MAX_ZOOM,
            maxBounds: L.latLngBounds(PH_LEAFLET_BOUNDS).pad(0.1),
            maxBoundsViscosity: 0.8,
            zoomControl: false,
          });

          L.control.zoom({ position: 'bottomright' }).addTo(map);

          retainedTileLayer = createBaseTileLayer(L).addTo(map);

          markersLayerRef.current = L.featureGroup().addTo(map);
          retainedMarkersLayer = markersLayerRef.current;
          mapInstanceRef.current = map;
          retainedMap = map;
          retainedHost = host;
          setCurrentZoom(REGIONAL_ZOOM);
          if (typeof window === 'undefined' || !hasMapFocusParameters(window.location.search)) {
            map.fitBounds(PANGASINAN_BOUNDS, { animate: false });
          }
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
              setClusterZoom(activeMap.getZoom());
              setMapViewportNonce((v) => v + 1);
            }
          };

          const onMapClick = (e: any) => {
            if (!e?.latlng) return;

            // Armed destination-pin placement: commit the draft pin instead of
            // area selection or zoom behavior.
            if (pinPlacementRef.current) {
              pinPlacementCommitRef.current?.(e.latlng.lat, e.latlng.lng);
              return;
            }

            // Check if traveler clicked directly on or near an existing place/town name on the map tile
            const clickPt = activeMap.latLngToContainerPoint(e.latlng);
            let matchedArea: AreaDefinition | null = null;
            let closestDist = 38; // px proximity threshold around the name on the tile

            for (const area of KNOWN_AREAS) {
              if (area.id === 'philippines' || area.id === 'luzon' || area.id === 'ilocos') continue;
              const pt = activeMap.latLngToContainerPoint(area.center);
              const dist = Math.hypot(clickPt.x - pt.x, clickPt.y - pt.y);
              if (dist < closestDist) {
                closestDist = dist;
                matchedArea = area;
              }
            }

            if (matchedArea) {
              handleSelectArea(matchedArea);
              return;
            }

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

          // A manual pan cancels any automatic follow after locating.
          const onDragStart = () => {
            followUserRef.current = false;
          };
          activeMap.on('dragstart', onDragStart);

          activeMapCleanup = () => {
            activeMap.off('zoom', onZoomUpdate);
            activeMap.off('zoomend', onViewportEnd);
            activeMap.off('moveend', onViewportEnd);
            activeMap.off('click', onMapClick);
            activeMap.off('dragstart', onDragStart);
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
        // Pad the camera so the opened panel/sheet never hides the selected pin.
        let center: [number, number] = [data.gpsLat, data.gpsLng];
        try {
          const isDesktopView =
            typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
          const point = map.project([data.gpsLat, data.gpsLng], targetZoom);
          const containerHeight = map.getContainer().clientHeight || 0;
          const offsetX = isDesktopView ? -170 : 0; // pin sits right of the left desktop dock
          const offsetY = isDesktopView ? 0 : Math.round(containerHeight * 0.18); // pin above the mobile sheet
          const shifted = map.unproject(point.add([offsetX, offsetY]), targetZoom);
          center = [shifted.lat, shifted.lng];
        } catch {
          // Fall back to exact centering when projection is unavailable.
        }
        if ((map as any)._loaded) {
          map.flyTo(center, targetZoom, { duration: 0.8 });
        } else {
          map.setView(center, targetZoom);
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

  const handlePlaceDestinationPin = useCallback((lat: number, lng: number) => {
    setDraftPin({ lat, lng });
    setWizardOpen(true);
    setWizardMinimized(false);
    setPinPlacementActive(false);
  }, []);

  const handlePlaceAtCenter = useCallback(() => {
    const map = mapInstanceRef.current || retainedMap;
    if (!map) return;
    const center = map.getCenter();
    handlePlaceDestinationPin(center.lat, center.lng);
  }, [handlePlaceDestinationPin]);

  useEffect(() => {
    pinPlacementCommitRef.current = handlePlaceDestinationPin;
  }, [handlePlaceDestinationPin]);

  const handleCancelPinPlacement = useCallback(() => {
    setPinPlacementActive(false);
    if (wizardOpen) setWizardMinimized(false);
  }, [wizardOpen]);

  const handleRequestMovePin = useCallback(() => {
    setWizardMinimized(true);
    setPinPlacementActive(true);
  }, []);

  // Draft destination pin: draggable marker shown while the wizard is active.
  useEffect(() => {
    let disposed = false;
    (async () => {
      const map = mapInstanceRef.current || retainedMap;
      const L = (await import('leaflet')).default;
      if (disposed || !map) return;
      if (draftMarkerRef.current) {
        draftMarkerRef.current.remove();
        draftMarkerRef.current = null;
      }
      if (!draftPin) return;
      const marker = L.marker([draftPin.lat, draftPin.lng], {
        draggable: true,
        keyboard: false,
        icon: L.divIcon({
          className: 'leaflet-custom-marker jdq-draft-pin',
          html: '<div style="position:relative;width:38px;height:38px"><div style="position:absolute;inset:0;border:3px dashed #FFB703;border-radius:9999px;background:rgba(255,183,3,0.12);box-shadow:0 0 0 3px rgba(255,183,3,0.2)"></div><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:20px;line-height:1">📍</div></div>',
          iconSize: [38, 38],
          iconAnchor: [19, 32],
        }),
      }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setDraftPin({ lat: pos.lat, lng: pos.lng });
      });
      draftMarkerRef.current = marker;
    })();
    return () => {
      disposed = true;
      if (draftMarkerRef.current) {
        draftMarkerRef.current.remove();
        draftMarkerRef.current = null;
      }
    };
  }, [draftPin]);

  const markerCandidates = useMemo(() => {
    const items: Array<{ type: 'spot' | 'quest'; data: SpotModel | QuestModel }> = [];
    const points: MapClusterPoint[] = [];
    const byId = new Map<string, { type: 'spot' | 'quest'; data: SpotModel | QuestModel }>();
    if (filterType === 'all' || filterType === 'quests' || filterType === 'saved') {
      for (const quest of quests) {
        if (filterType === 'saved' && !isSaved('quests', quest.id)) continue;
        items.push({ type: 'quest', data: quest });
        const id = `quest:${quest.id}`;
        points.push({ id, kind: 'quest', lat: quest.gpsLat, lng: quest.gpsLng,
          pinned: (selectedItem?.type === 'quest' && selectedItem.data.id === quest.id) ||
            isSaved('quests', quest.id) || quest.funding?.status === 'active' });
        byId.set(id, { type: 'quest', data: quest });
      }
    }
    if (filterType === 'all' || filterType === 'spots' || filterType === 'saved') {
      for (const spot of spots) {
        if (filterType === 'saved' && !isSaved('spots', spot.id)) continue;
        items.push({ type: 'spot', data: spot });
        const id = `spot:${spot.id}`;
        points.push({ id, kind: 'spot', lat: spot.gpsLat, lng: spot.gpsLng,
          pinned: (selectedItem?.type === 'spot' && selectedItem.data.id === spot.id) || isSaved('spots', spot.id) });
        byId.set(id, { type: 'spot', data: spot });
      }
    }
    return { items, points, byId };
  }, [quests, spots, filterType, isSaved, savedLibrary, selectedItem?.type, selectedItem?.data.id]);
  const clusteredDestinations = useMemo(
    () => clusterPoints(markerCandidates.points, clusterZoom),
    [markerCandidates.points, clusterZoom],
  );

  // Diff destination markers by stable identity. A pan updates labels and hitbox
  // visibility without recreating any destination marker.
  useEffect(() => {
    const map = mapInstanceRef.current || retainedMap;
    const group = markersLayerRef.current || retainedMarkersLayer;
    if (!map || !group) return;

    let isDisposed = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (isDisposed) return;

      const allCoordinates: [number, number][] = [
        ...quests.map((q): [number, number] => [q.gpsLat, q.gpsLng]),
        ...spots.map((s): [number, number] => [s.gpsLat, s.gpsLng]),
      ];
      allCoordinatesRef.current = allCoordinates;

      const bounds = map.getBounds().pad(0.15);
      const isInViewport = (lat: number, lng: number) => bounds.contains([lat, lng]);
      const toScreenPoint = (lat: number, lng: number) => {
        const pt = map.latLngToContainerPoint([lat, lng]);
        return { x: pt.x, y: pt.y };
      };
      const selectedId = selectedItem?.data.id;
      const decluttered = declutterItems(
        markerCandidates.items,
        currentZoom,
        toScreenPoint,
        isInViewport,
        selectedId,
        isSaved,
      );
      const labelIds = new Set(
        decluttered.filter((item) => item.showLabel).map((item) => `${item.type}:${item.data.id}`),
      );

      const desiredKeys = new Set<string>();
      for (const result of clusteredDestinations) {
        const key = result.type === 'cluster' ? `cluster:${result.key}` : result.id;
        desiredKeys.add(key);
        const existing = markerRegistryRef.current.get(key);
        let marker: LeafletMarker;
        let signature: string;

        if (result.type === 'cluster') {
          const cluster = result as MapCluster;
          const icon = createClusterIcon(L, cluster);
          signature = `${cluster.count}:${cluster.hasQuest}`;
          if (existing) {
            marker = existing;
            marker.setLatLng([cluster.lat, cluster.lng]);
            if (markerSignaturesRef.current.get(key) !== signature) marker.setIcon(icon);
          } else {
            marker = L.marker([cluster.lat, cluster.lng], {
              icon,
              keyboard: true,
              title: `${cluster.count} destinations, zoom in`,
            }).addTo(group);
            markerRegistryRef.current.set(key, marker);
          }
          marker.off('click');
          marker.on('click', (event: any) => {
            if (event?.originalEvent) event.originalEvent.stopPropagation();
            const span = cluster.bounds.maxLat !== cluster.bounds.minLat ||
              cluster.bounds.maxLng !== cluster.bounds.minLng;
            if (span) {
              map.fitBounds(
                L.latLngBounds(
                  [cluster.bounds.minLat, cluster.bounds.minLng],
                  [cluster.bounds.maxLat, cluster.bounds.maxLng],
                ).pad(0.2),
                { maxZoom: Math.min(map.getZoom() + 3, 16) },
              );
            } else {
              const items = cluster.ids
                .map((id) => markerCandidates.byId.get(id))
                .filter((item): item is { type: 'spot' | 'quest'; data: SpotModel | QuestModel } => Boolean(item));
              setClusterItems(items);
              setIsDesktopCollapsed(true);
              setMobileSnap('peek');
            }
          });
        } else {
          const point = markerCandidates.byId.get(result.id);
          if (!point) continue;
          const isSelected = selectedId === point.data.id;
          const showLabel = labelIds.has(result.id);
          const icon = point.type === 'quest'
            ? L.divIcon({
                className: 'leaflet-custom-marker',
                html: createQuestPinHtml(
                  isSelected,
                  isSaved('quests', point.data.id),
                  showLabel ? (point.data as QuestModel).title : undefined,
                  (point.data as QuestModel).category,
                ),
                iconAnchor: [18, 44],
              })
            : L.divIcon({
                className: 'leaflet-custom-marker',
                html: createSpotPinHtml(
                  isSelected,
                  isSaved('spots', point.data.id),
                  showLabel ? (point.data as SpotModel).name : undefined,
                  (point.data as SpotModel).imageUrl,
                  (point.data as SpotModel).category,
                  (point.data as SpotModel).subcategory,
                ),
                iconAnchor: [18, 44],
              });
          signature = String(icon.options.html);
          const latLng: [number, number] = [point.data.gpsLat, point.data.gpsLng];
          if (existing) {
            marker = existing;
            marker.setLatLng(latLng);
            if (markerSignaturesRef.current.get(key) !== signature) marker.setIcon(icon);
          } else {
            marker = L.marker(latLng, {
              icon,
              keyboard: true,
              title: 'title' in point.data ? point.data.title : point.data.name,
            }).addTo(group);
            markerRegistryRef.current.set(key, marker);
          }
          marker.off('click');
          marker.on('click', (event: any) => {
            if (event?.originalEvent) event.originalEvent.stopPropagation();
            handleSelectItem(point.type, point.data);
          });
        }
        markerSignaturesRef.current.set(key, signature);
      }

      for (const [key, marker] of markerRegistryRef.current) {
        if (!desiredKeys.has(key)) {
          marker.remove();
          markerRegistryRef.current.delete(key);
          markerSignaturesRef.current.delete(key);
        }
      }

      // Area hitboxes are created once and only have visibility/pointer state
      // updated after pans, so map movement never creates replacement markers.
      const areaBounds = map.getBounds();
      for (const area of KNOWN_AREAS) {
        if (area.id === 'philippines' || area.id === 'luzon' || area.id === 'ilocos') continue;
        let marker = areaMarkersRef.current.get(area.id);
        if (!marker) {
          const areaIcon = L.divIcon({
            className: 'leaflet-custom-marker',
            html: createAreaHitboxHtml(area.name),
            iconAnchor: [38, 16],
          });
          marker = L.marker(area.center, { icon: areaIcon, keyboard: false }).addTo(group);
          areaMarkersRef.current.set(area.id, marker);
        }
        marker.off('click');
        marker.on('click', (event: any) => {
          if (event?.originalEvent) event.originalEvent.stopPropagation();
          if (map.getZoom() <= 13 && filterType === 'all' && areaBounds.contains(area.center)) {
            handleSelectArea(area);
          }
        });
        const visible = map.getZoom() <= 13 && filterType === 'all' && areaBounds.contains(area.center);
        marker.setOpacity(visible ? 1 : 0);
        const element = marker.getElement();
        if (element) {
          element.style.pointerEvents = visible ? 'auto' : 'none';
          element.setAttribute('aria-hidden', visible ? 'false' : 'true');
        }
      }

      if (userLocation) {
        if (retainedUserCircle) {
          retainedUserCircle.setLatLng([userLocation.lat, userLocation.lng]);
          retainedUserCircle.setRadius(Math.min(userLocation.accuracy || 0, 2000));
        } else {
          retainedUserCircle = L.circle([userLocation.lat, userLocation.lng], {
            radius: Math.min(userLocation.accuracy || 0, 2000),
            color: '#1D4ED8',
            weight: 1,
            opacity: 0.35,
            fillColor: '#1D4ED8',
            fillOpacity: 0.08,
            interactive: false,
          }).addTo(group);
        }
        if (retainedUserMarker) {
          retainedUserMarker.setLatLng([userLocation.lat, userLocation.lng]);
        } else {
          retainedUserMarker = L.marker([userLocation.lat, userLocation.lng], {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
              className: '',
              html: '<div style="width:18px;height:18px;border-radius:9999px;background:#1D4ED8;border:3px solid #fff;box-shadow:0 0 0 2px rgba(29,78,216,0.35),0 2px 6px rgba(0,0,0,0.3)"></div>',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            }),
          }).addTo(group);
        }
      } else {
        retainedUserMarker?.remove();
        retainedUserCircle?.remove();
        retainedUserMarker = null;
        retainedUserCircle = null;
      }

      // Preserve explicit URL focus behavior after the point data has loaded.
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
        if (isValidLatitude(urlLat) && isValidLongitude(urlLng)) {
          const zoom = clampMapZoom(parseFloat(searchParams.get('zoom') || ''), urlName ? 13 : FOCUSED_ZOOM);
          if (urlName) {
            setActiveArea({
              id: `osm-${urlLat.toFixed(4)}-${urlLng.toFixed(4)}`,
              name: urlName,
              type: (searchParams.get('type') as any) || 'city',
              subtitle: searchParams.get('subtitle') || 'Territory via OpenStreetMap',
              center: [urlLat, urlLng],
              zoom,
              keywords: [urlName.toLowerCase()],
              source: 'osm',
            });
          }
          map.setView([urlLat, urlLng], zoom, { animate: true });
          fittedRef.current = true;
          return;
        }
        const matchedSpot = urlSpot && spots.find((spot) => spot.id === urlSpot || spot.slug === urlSpot);
        if (matchedSpot) {
          map.setView([matchedSpot.gpsLat, matchedSpot.gpsLng], FOCUSED_ZOOM, { animate: true });
          fittedRef.current = true;
          return;
        }
        const matchedQuest = urlQuest && quests.find((quest) => quest.id === urlQuest);
        if (matchedQuest) {
          map.setView([matchedQuest.gpsLat, matchedQuest.gpsLng], FOCUSED_ZOOM, { animate: true });
          fittedRef.current = true;
        }
      }
    })();

    return () => { isDisposed = true; };
  }, [
    quests,
    spots,
    filterType,
    selectedItem?.data.id,
    savedLibrary,
    isSaved,
    currentZoom,
    clusterZoom,
    mapViewportNonce,
    userLocation,
    markerCandidates,
    clusteredDestinations,
    handleSelectItem,
  ]);

  // Center on a wide geographic area (e.g. Pangasinan province, Bolinao municipality)
  function handleSelectArea(area: AreaDefinition) {
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
  }

  // Clear area filter and return to Pangasinan regional view
  const handleClearActiveArea = useCallback(() => {
    setActiveArea(null);
    const map = mapInstanceRef.current || retainedMap;
    if (map) {
      try {
        if ((map as any)._loaded) {
          map.flyTo(PANGASINAN_CENTER, REGIONAL_ZOOM, { duration: 1.0 });
        } else {
          map.setView(PANGASINAN_CENTER, REGIONAL_ZOOM);
        }
      } catch (e) {
        console.warn('Map camera flight deferred:', e);
      }
    }
  }, []);

  // Accessible, non-map results list (same filter semantics as the pins).
  const visiblePlaces = useMemo(() => {
    const items: Array<{ type: 'quest' | 'spot'; data: QuestModel | SpotModel }> = [];
    if (filterType === 'all' || filterType === 'quests' || filterType === 'saved') {
      quests
        .filter((q) => filterType !== 'saved' || isSaved('quests', q.id))
        .forEach((q) => items.push({ type: 'quest', data: q }));
    }
    if (filterType === 'all' || filterType === 'spots' || filterType === 'saved') {
      spots
        .filter((s) => filterType !== 'saved' || isSaved('spots', s.id))
        .forEach((s) => items.push({ type: 'spot', data: s }));
    }
    return items.sort((a, b) => {
      const nameA = ('title' in a.data ? a.data.title : a.data.name).toLowerCase();
      const nameB = ('title' in b.data ? b.data.title : b.data.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [quests, spots, filterType, isSaved]);

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
          <h1 className="sr-only">Destination map</h1>
          {/* Edge-to-Edge Full Screen Leaflet Map Canvas */}
          <div ref={mapContainerRef} className={`absolute inset-0 w-full h-full z-0 ${pinPlacementActive ? 'jdq-pin-mode' : ''}`} />

          {/* STANDALONE FLOATING SEARCH OVERLAY */}
          <MapSearchOverlay
            onSelectArea={handleSelectArea}
            onSelectDestination={handleSelectItem}
            activeArea={activeArea}
            onClearActiveArea={handleClearActiveArea}
            spots={spots}
            quests={quests}
          />

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
                : `${quests.length} Eco-Quests • ${spots.length} Spots`
            }
            badge={
              selectedItem
                ? selectedItem.type === 'quest'
                  ? { label: 'Eco-Quest', variant: 'amber' }
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
                <button
                  type="button"
                  onClick={() => {
                    if (pinPlacementActive) {
                      handleCancelPinPlacement();
                    } else if (wizardOpen && !wizardMinimized) {
                      handleRequestMovePin();
                    } else {
                      setPinPlacementActive(true);
                      if (wizardOpen) setWizardMinimized(true);
                    }
                  }}
                  title={pinPlacementActive ? 'Cancel pin placement' : 'Pin a destination on the map'}
                  aria-label={pinPlacementActive ? 'Cancel pin placement' : 'Pin a new destination on the map'}
                  aria-pressed={pinPlacementActive}
                  className={`h-10 px-3 rounded-2xl border shadow-md inline-flex items-center justify-center gap-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
                    pinPlacementActive
                      ? 'bg-[#FFB703] border-amber-400 text-[#582F0E] animate-pulse'
                      : 'bg-white/95 backdrop-blur-md border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{pinPlacementActive ? 'Cancel' : 'Add spot'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPinHelpOpen((open) => !open)}
                  title="How destination pinning works"
                  aria-label="How destination pinning works"
                  aria-expanded={pinHelpOpen}
                  className="h-10 px-2.5 sm:px-3 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md inline-flex items-center justify-center gap-1.5 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Help</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  title="Use my location"
                  aria-label="Use my location"
                  className="h-10 px-2.5 sm:px-3 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md inline-flex items-center justify-center gap-1.5 text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  {locating ? (
                    <RotateCw className="w-4 h-4 animate-spin text-[#2D6A4F] shrink-0" />
                  ) : (
                    <LocateFixed className="w-4 h-4 shrink-0" />
                  )}
                  <span className="hidden sm:inline">Locate</span>
                </button>

                {activeArea && (
                  <button
                    type="button"
                    onClick={handleClearActiveArea}
                    title={`Clear ${activeArea.name} (Reset to Pangasinan)`}
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
                  className="h-10 px-2.5 sm:px-3 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md inline-flex items-center justify-center gap-1.5 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  <Compass className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Fit all</span>
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
                      {selectedItem.type === 'quest' ? '🏆 Eco-Quest' : '📍 Destination Spot'}
                    </span>
                    {selectedItem.type === 'quest' && (
                      <div className="flex items-center gap-1 text-[#7D5800] text-[11px] font-black bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Award className="w-3 h-3 text-[#FFB703]" />
                        <span>{formatPoints((selectedItem.data as QuestModel).rewardPoints, { signed: true })}</span>
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

                {selectedItem.type === 'spot' && (
                  <TrailPreviewCard key={(selectedItem.data as SpotModel).id} />
                )}
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

                {/* Accessible non-map results list: same filter semantics as the pins */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#837560] px-1">
                    Places at a glance ({visiblePlaces.length})
                  </span>
                  {visiblePlaces.length === 0 ? (
                    <p className="text-[11px] text-[#837560] px-1 leading-relaxed">
                      {loading
                        ? 'Loading places…'
                        : error
                        ? 'Places could not be loaded from the server. The basemap is still interactive.'
                        : filterType === 'saved'
                        ? 'Nothing saved yet. Use the bookmark on a place to save it.'
                        : 'No places match this filter.'}
                    </p>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto rounded-xl border border-[#E3DFD5] bg-white divide-y divide-[#EFEEEA]">
                      {visiblePlaces.slice(0, 60).map(({ type, data }) => (
                        <li key={`${type}-${data.id}`}>
                          <button
                            type="button"
                            onClick={() => handleSelectItem(type, data)}
                            className="w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-[#FAF9F5] transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-xs font-bold text-[#2C221E]">
                              <span aria-hidden="true">{type === 'quest' ? '🏆' : '📍'}</span>
                              <span className="truncate">{'title' in data ? data.title : data.name}</span>
                            </span>
                            <span className="block text-[10px] text-[#837560] truncate mt-0.5">
                              {'locationName' in data ? data.locationName : data.municipality}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </MapWorkspacePanel>

          {clusterItems && (
            <div
              className="absolute inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center"
              onClick={() => setClusterItems(null)}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="map-cluster-list-title"
                className="max-h-[78vh] w-full max-w-lg overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white p-4 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="map-cluster-list-title" className="text-base font-black text-[#582F0E]">
                      Destinations at this location
                    </h2>
                    <p className="mt-1 text-xs text-stone-600">{clusterItems.length} destinations</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close destination list"
                    onClick={() => setClusterItems(null)}
                    className="min-h-11 min-w-11 rounded-full text-xl text-stone-600 hover:bg-stone-100"
                  >
                    ×
                  </button>
                </div>
                <ul className="mt-3 max-h-[62vh] divide-y divide-stone-100 overflow-y-auto">
                  {clusterItems.map((item) => {
                    const title = 'title' in item.data ? item.data.title : item.data.name;
                    const subtitle = 'locationName' in item.data
                      ? item.data.locationName
                      : (item.data.address || item.data.municipality);
                    return (
                      <li key={`${item.type}:${item.data.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setClusterItems(null);
                            handleSelectItem(item.type, item.data);
                          }}
                          className="flex min-h-14 w-full items-center gap-3 py-2 text-left hover:bg-stone-50"
                        >
                          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#2D6A4F]">
                            {item.type === 'quest' ? '🏆' : '📍'}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-[#2C221E]">{title}</span>
                            <span className="block truncate text-xs text-stone-600">{subtitle}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          )}

          {pinPlacementActive && (
            <div
              role="status"
              className="absolute top-[64px] lg:top-[76px] left-1/2 -translate-x-1/2 z-30 flex max-w-[92vw] items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50/95 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-[#7D5800] shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <MapPin className="w-4 h-4 text-[#B45309] shrink-0" />
              <span className="min-w-0">
                {wizardMinimized
                  ? 'Click the map to move the destination pin.'
                  : 'Click the map to place your destination pin.'}
              </span>
              <button
                type="button"
                onClick={handlePlaceAtCenter}
                className="shrink-0 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[10px] font-black text-[#2D6A4F] transition hover:bg-emerald-50 cursor-pointer"
              >
                Place at map center
              </button>
              <button
                type="button"
                onClick={handleCancelPinPlacement}
                className="shrink-0 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[10px] font-black text-[#7D5800] transition hover:bg-amber-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {pinHelpOpen && (
            <div className="absolute right-4 top-16 z-30 w-72 max-w-[calc(100vw-2rem)] space-y-2.5 rounded-2xl border border-[#E3DFD5] bg-white/97 backdrop-blur-md p-4 text-xs leading-relaxed text-[#514532] shadow-xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#582F0E]">Add a spot</span>
                <button
                  type="button"
                  onClick={() => setPinHelpOpen(false)}
                  aria-label="Close pin help"
                  className="rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p>
                Press <strong className="text-[#582F0E]">Add spot</strong>. Your cursor turns into a pin, so click where the place is (or use <em>Place at map center</em>). Drag the pin to fine-tune it. We&apos;ll fill in the address for you.
              </p>
              <p>
                Nothing is published until you review and press <strong className="text-[#582F0E]">Publish</strong>.
              </p>
            </div>
          )}

          {/* Loading Indicator Toast */}
          {loading && (
            <div className="absolute top-[124px] left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-[#E3DFD5] shadow-md flex items-center gap-2 text-xs font-bold text-[#582F0E]">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-[#2D6A4F]" />
              <span>Loading destination markers...</span>
            </div>
          )}

          {/* Error Toast */}
          {error && (
            <div className="absolute top-[124px] left-1/2 -translate-x-1/2 z-20 bg-amber-50/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-200 shadow-md flex items-center gap-2 text-xs font-bold text-[#7D5800]">
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

          {locationNotice && (
            <div
              role="status"
              aria-live="polite"
              className="absolute bottom-36 left-4 right-4 z-20 rounded-2xl border border-blue-200 bg-blue-50/95 px-4 py-3 text-xs font-semibold text-blue-900 shadow-md sm:right-auto sm:max-w-sm"
            >
              {locationNotice}
            </div>
          )}

          {tilesUnavailable && (
            <div role="status" className="absolute bottom-20 left-4 right-4 z-20 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-xs font-semibold text-amber-900 shadow-md sm:right-auto sm:max-w-sm">
              Basemap tiles are temporarily unavailable. Pins, search and place details still work.{' '}
              <button type="button" onClick={() => retainedTileLayer?.redraw()} className="min-h-11 font-bold underline underline-offset-2">
                Retry tiles
              </button>
            </div>
          )}

          {wizardOpen && (
            <SpotPostingWizard
              pin={draftPin}
              minimized={wizardMinimized}
              onClose={() => {
                setWizardOpen(false);
                setWizardMinimized(false);
                setDraftPin(null);
              }}
              onRequestMovePin={handleRequestMovePin}
              onPublished={(spot) => {
                setSpots((previous) =>
                  previous.some((s) => s.id === spot.id) ? previous : [spot, ...previous]
                );
                handleSelectSpot(spot);
              }}
            />
          )}

          <SignInSheet
            open={signInPrompt.open}
            onClose={() => setSignInPrompt({ open: false, actionLabel: 'Pin a destination' })}
            actionLabel={signInPrompt.actionLabel}
          />
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
