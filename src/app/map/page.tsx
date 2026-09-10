'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, normalizeQuest, normalizeSpot, QuestModel, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { createQuestPinHtml, createSpotPinHtml } from '@/lib/map-icons';
import { useSavedLibrary } from '@/lib/saved-library';
import { MAP_TILE_ATTRIBUTION, MAP_TILE_MAX_ZOOM, MAP_TILE_URL } from '@/lib/map-tiles';

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
} from 'lucide-react';

const MAP_CENTER: [number, number] = [16.03, 120.33];

// One map host per browser session; retain rendered tiles and viewport state between route visits.
let retainedMap: LeafletMap | null = null;
let retainedHost: HTMLDivElement | null = null;

export default function QuestMapPage() {
  const { library: savedLibrary, toggle: toggleSaved, isSaved } = useSavedLibrary();
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'quest' | 'spot'; data: QuestModel | SpotModel } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'quests' | 'spots' | 'saved'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const urlLat = parseFloat(searchParams.get('lat') || '');
        const urlLng = parseFloat(searchParams.get('lng') || '');

        if (!isNaN(urlLat) && !isNaN(urlLng)) {
          const matchedSpot = loadedSpots.find(
            (s) => Math.abs(s.gpsLat - urlLat) < 0.005 && Math.abs(s.gpsLng - urlLng) < 0.005
          );
          if (matchedSpot) {
            setSelectedItem({ type: 'spot', data: matchedSpot });
          } else {
            const matchedQuest = loadedQuests.find(
              (q) => Math.abs(q.gpsLat - urlLat) < 0.005 && Math.abs(q.gpsLng - urlLng) < 0.005
            );
            if (matchedQuest) {
              setSelectedItem({ type: 'quest', data: matchedQuest });
            }
          }
        } else if (loadedQuests[0]) {
          setSelectedItem((prev) => prev ?? { type: 'quest', data: loadedQuests[0] });
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

  useEffect(() => {
    setSelectedItem(null);
  }, [filterType]);

  // Fit map to all loaded marker coordinates
  const handleFitBounds = useCallback(async () => {
    const map = mapInstanceRef.current || retainedMap;
    if (!map || allCoordinatesRef.current.length === 0) return;
    const L = (await import('leaflet')).default;
    map.fitBounds(L.latLngBounds(allCoordinatesRef.current).pad(0.12));
  }, []);

  // 1. Initialize or Re-attach Retained Leaflet Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let isDisposed = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (isDisposed || !mapContainerRef.current) return;

      try {
        if (retainedMap && retainedHost) {
          // Re-attach existing session host to new container
          container.replaceChildren(retainedHost);
          mapInstanceRef.current = retainedMap;

          // Re-attach marker layer group if missing
          if (!markersLayerRef.current) {
            markersLayerRef.current = L.featureGroup().addTo(retainedMap);
          }
        } else {
          // Create new session host
          const host = document.createElement('div');
          host.style.position = 'absolute';
          host.style.inset = '0';
          host.style.width = '100%';
          host.style.height = '100%';
          host.style.outline = 'none';

          container.replaceChildren(host);

          const map = L.map(host, {
            center: MAP_CENTER,
            zoom: 10,
            zoomControl: false,
          });

          L.control.zoom({ position: 'bottomright' }).addTo(map);

          L.tileLayer(MAP_TILE_URL, {
            maxZoom: MAP_TILE_MAX_ZOOM,
            attribution: MAP_TILE_ATTRIBUTION,
          }).addTo(map);

          markersLayerRef.current = L.featureGroup().addTo(map);
          mapInstanceRef.current = map;
          retainedMap = map;
          retainedHost = host;
        }

        // Multi-stage dimension invalidation to ensure proper rendering after container layout
        const activeMap = mapInstanceRef.current;
        if (activeMap) {
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

    // ResizeObserver ensures map adjusts to any responsive container changes
    const resizeObserver = new ResizeObserver(() => {
      const map = mapInstanceRef.current || retainedMap;
      map?.invalidateSize({ pan: false });
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      markersLayerRef.current?.clearLayers();
      mapInstanceRef.current = null;
      retainedHost?.remove();
    };
  }, []);

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
      const allCoordinates: [number, number][] = [];

      // Add Quests markers (Gold Timber Pins)
      if (filterType === 'all' || filterType === 'quests' || filterType === 'saved') {
        quests
          .filter((q) => filterType !== 'saved' || isSaved('quests', q.id))
          .forEach((q) => {
            allCoordinates.push([q.gpsLat, q.gpsLng]);
            const isSelected = selectedItem?.type === 'quest' && selectedItem.data.id === q.id;
            const icon = L.divIcon({
              className: 'leaflet-custom-marker',
              html: createQuestPinHtml(isSelected, isSaved('quests', q.id)),
              iconSize: [36, 46],
              iconAnchor: [18, 44],
            });

            L.marker([q.gpsLat, q.gpsLng], { icon })
              .on('click', () => {
                setSelectedItem({ type: 'quest', data: q });
                map.setView([q.gpsLat, q.gpsLng], Math.max(map.getZoom(), 12), { animate: true });
              })
              .addTo(group);
          });
      }

      // Add Destination Spots markers (Emerald Forest Pins)
      if (filterType === 'all' || filterType === 'spots' || filterType === 'saved') {
        spots
          .filter((s) => filterType !== 'saved' || isSaved('spots', s.id))
          .forEach((s) => {
            allCoordinates.push([s.gpsLat, s.gpsLng]);
            const isSelected = selectedItem?.type === 'spot' && selectedItem.data.id === s.id;
            const icon = L.divIcon({
              className: 'leaflet-custom-marker',
              html: createSpotPinHtml(isSelected, isSaved('spots', s.id)),
              iconSize: [36, 46],
              iconAnchor: [18, 44],
            });

            L.marker([s.gpsLat, s.gpsLng], { icon })
              .on('click', () => {
                setSelectedItem({ type: 'spot', data: s });
                map.setView([s.gpsLat, s.gpsLng], Math.max(map.getZoom(), 12), { animate: true });
              })
              .addTo(group);
          });
      }

      allCoordinatesRef.current = allCoordinates;

      // Handle deep-linked coordinates or initial bounding box fit
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const urlLat = parseFloat(searchParams.get('lat') || '');
        const urlLng = parseFloat(searchParams.get('lng') || '');

        if (!isNaN(urlLat) && !isNaN(urlLng) && !fittedRef.current) {
          map.setView([urlLat, urlLng], 13, { animate: true });
          fittedRef.current = true;
          return;
        }
      }

      if (allCoordinates.length > 0 && !fittedRef.current) {
        map.fitBounds(L.latLngBounds(allCoordinates).pad(0.12));
        fittedRef.current = true;
      }
    })();

    return () => {
      isDisposed = true;
    };
  }, [quests, spots, filterType, selectedItem?.data.id, savedLibrary, isSaved]);

  return (
    <Navigation fullBleed>
      <ErrorBoundary fallbackTitle="Unable to display Pangasinan Map">
        <div className="relative w-full h-full min-h-0 flex-1 bg-stone-100 overflow-hidden select-none">
          {/* Edge-to-Edge Full Screen Leaflet Map Canvas */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Top-Left Floating Filter & Header Overlay Panel */}
          <div className="absolute top-4 left-4 right-4 sm:right-auto sm:left-6 z-10 max-w-md pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-[#E3DFD5] shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center shadow-2xs">
                    <MapPin className="w-4 h-4 text-[#FFB703]" />
                  </div>
                  <div>
                    <h1 className="text-xs sm:text-sm font-black text-[#582F0E] leading-tight">
                      Pangasinan Tourism Map
                    </h1>
                    <span className="text-[10px] text-[#837560] font-semibold">
                      {quests.length} Quests • {spots.length} Spots Active
                    </span>
                  </div>
                </div>

                <Link
                  href="/search"
                  className="text-[11px] font-bold text-[#2D6A4F] bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] px-2.5 py-1 rounded-xl transition shadow-2xs"
                >
                  Search Spots →
                </Link>
              </div>

              {/* Filter Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-[#FAF9F5] p-1 rounded-xl border border-[#E3DFD5]">
                {[
                  { id: 'all', label: 'All Markers', badge: null },
                  { id: 'saved', label: 'Saved', badge: savedLibrary.spots.length + savedLibrary.quests.length },
                  { id: 'quests', label: 'Quests', badge: quests.length },
                  { id: 'spots', label: 'Spots', badge: spots.length },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer text-center flex items-center justify-center gap-1 min-h-[32px] ${
                      filterType === f.id
                        ? 'bg-[#2D6A4F] text-white shadow-xs'
                        : 'text-[#582F0E] hover:bg-white'
                    }`}
                  >
                    <span className="truncate">{f.label}</span>
                    {f.badge !== null && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black shrink-0 ${
                        filterType === f.id ? 'bg-white/20 text-white' : 'bg-stone-200/80 text-[#582F0E]'
                      }`}>
                        {f.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-medium text-[#837560]">
                <Bookmark className="h-3 w-3 fill-[#FFB703] text-[#B45309]" />
                Gold bookmark badges mark your saved pins on this device.
              </div>
            </div>
          </div>

          {/* Top-Right Floating Map Tool Controls */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex flex-col gap-2 pointer-events-auto">
            <button
              onClick={handleFitBounds}
              title="Fit All Coordinates"
              className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
              aria-label="Fit all markers in view"
            >
              <Compass className="w-5 h-5" />
            </button>

            <button
              onClick={() => fetchData(true)}
              title="Reload Coordinates"
              className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
              aria-label="Reload map data"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Bottom-Left Floating Marker Inspector Overlay Card */}
          {selectedItem && (
            <div className="absolute bottom-20 lg:bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:w-96 z-10 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="bg-white/98 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#E3DFD5] shadow-xl space-y-3.5 relative">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedItem(null)}
                  title="Dismiss details"
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  aria-label="Dismiss details card"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header Tag & Rewards */}
                <div className="flex items-center gap-2 pr-6">
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

                {/* Body Content */}
                <div className="space-y-1">
                  <h2 className="text-sm sm:text-base font-bold text-[#2C221E] leading-snug line-clamp-1">
                    {'title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name}
                  </h2>
                  <p className="text-xs text-[#514532] line-clamp-2 leading-relaxed">
                    {selectedItem.data.description}
                  </p>
                </div>

                {/* Location & GPS Badge */}
                <div className="p-2.5 bg-[#FAF9F5] rounded-xl border border-[#E3DFD5] text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-[#2C221E] truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                    <span className="truncate">
                      {'locationName' in selectedItem.data
                        ? selectedItem.data.locationName
                        : selectedItem.data.municipality}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-500 shrink-0 ml-2">
                    {selectedItem.data.gpsLat.toFixed(3)}, {selectedItem.data.gpsLng.toFixed(3)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pt-1">
                  <Link
                    href={`/navigate?name=${encodeURIComponent(
                      'title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name
                    )}&lat=${selectedItem.data.gpsLat}&lng=${selectedItem.data.gpsLng}&address=${encodeURIComponent(
                      'locationName' in selectedItem.data
                        ? selectedItem.data.locationName
                        : selectedItem.data.address
                    )}`}
                    className="min-w-0 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                  >
                    <NavIcon className="w-3.5 h-3.5 text-[#FFB703] shrink-0" />
                    <span className="truncate">Navigate</span>
                  </Link>

                  {selectedItem.type === 'quest' ? (
                    <Link
                      href={`/quests/${selectedItem.data.id}`}
                      className="min-w-0 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#FAF9F5] hover:bg-white text-[#582F0E] font-bold text-xs border border-[#E3DFD5] flex items-center justify-center gap-1 transition active:scale-95"
                    >
                      <span className="truncate">View Quest</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </Link>
                  ) : (
                    <Link
                      href={`/spots/${(selectedItem.data as SpotModel).slug}`}
                      className="min-w-0 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#FAF9F5] hover:bg-white text-[#582F0E] font-bold text-xs border border-[#E3DFD5] flex items-center justify-center gap-1 transition active:scale-95"
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
                    aria-label={
                      isSaved(selectedItem.type === 'quest' ? 'quests' : 'spots', selectedItem.data.id)
                        ? 'Remove from saved'
                        : 'Save for later'
                    }
                    className={`flex w-10 items-center justify-center rounded-xl border transition ${
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
            </div>
          )}

          {filterType === 'saved' &&
            !loading &&
            !error &&
            !quests.some((q) => isSaved('quests', q.id)) &&
            !spots.some((s) => isSaved('spots', s.id)) && (
              <div
                role="status"
                className="absolute bottom-24 left-4 right-4 z-10 rounded-2xl border border-amber-200 bg-white p-4 text-sm shadow-md sm:right-auto"
              >
                No saved places or quests on this map yet.{' '}
                <Link href="/explore" className="font-bold text-[#2D6A4F] underline">
                  Find a place to save
                </Link>
              </div>
            )}

          {/* Loading Indicator Toast */}
          {loading && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-[#E3DFD5] shadow-md flex items-center gap-2 text-xs font-bold text-[#582F0E]">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-[#2D6A4F]" />
              <span>Loading Pangasinan Map Markers...</span>
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
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
