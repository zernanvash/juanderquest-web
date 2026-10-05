'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap, FeatureGroup as LeafletFeatureGroup, TileLayer as LeafletTileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, normalizeQuest, normalizeSpot, QuestModel, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { createQuestPinHtml, createSpotPinHtml } from '@/lib/map-icons';
import { useSavedLibrary } from '@/lib/saved-library';
import { MAP_TILE_ATTRIBUTION, MAP_TILE_MAX_ZOOM, MAP_TILE_URL } from '@/lib/map-tiles';
import { appRoutes } from '@/lib/routes';
import { MapWorkspacePanel, MobileSnapState, MapWorkspaceTab } from '@/components/MapWorkspacePanel';

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

const MAP_CENTER: [number, number] = [16.03, 120.33];

// One map host per browser session; retain rendered tiles and viewport state between route visits.
let retainedMap: LeafletMap | null = null;
let retainedHost: HTMLDivElement | null = null;
let retainedTileLayer: LeafletTileLayer | null = null;

export default function QuestMapPage() {
  const { library: savedLibrary, toggle: toggleSaved, isSaved } = useSavedLibrary();
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'quest' | 'spot'; data: QuestModel | SpotModel } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'quests' | 'spots' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Responsive Workspace Panel state
  const [activeTab, setActiveTab] = useState<'explore' | 'details'>('explore');
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [mobileSnap, setMobileSnap] = useState<MobileSnapState>('half');

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
        const urlLat = parseFloat(searchParams.get('lat') || '');
        const urlLng = parseFloat(searchParams.get('lng') || '');
        const urlSpot = searchParams.get('spot');
        const urlQuest = searchParams.get('quest');

        if (urlSpot) {
          const matchedSpot = loadedSpots.find((s) => s.id === urlSpot || s.slug === urlSpot);
          if (matchedSpot) {
            setSelectedItem({ type: 'spot', data: matchedSpot });
            setActiveTab('details');
            setMobileSnap('half');
          }
        } else if (urlQuest) {
          const matchedQuest = loadedQuests.find((q) => q.id === urlQuest);
          if (matchedQuest) {
            setSelectedItem({ type: 'quest', data: matchedQuest });
            setActiveTab('details');
            setMobileSnap('half');
          }
        } else if (!isNaN(urlLat) && !isNaN(urlLng)) {
          const matchedSpot = loadedSpots.find(
            (s) => Math.abs(s.gpsLat - urlLat) < 0.005 && Math.abs(s.gpsLng - urlLng) < 0.005
          );
          if (matchedSpot) {
            setSelectedItem({ type: 'spot', data: matchedSpot });
            setActiveTab('details');
            setMobileSnap('half');
          } else {
            const matchedQuest = loadedQuests.find(
              (q) => Math.abs(q.gpsLat - urlLat) < 0.005 && Math.abs(q.gpsLng - urlLng) < 0.005
            );
            if (matchedQuest) {
              setSelectedItem({ type: 'quest', data: matchedQuest });
              setActiveTab('details');
              setMobileSnap('half');
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
    const onTileError = () => setTilesUnavailable(true);
    const onTileLoad = () => setTilesUnavailable(false);

    (async () => {
      const L = (await import('leaflet')).default;
      if (isDisposed || !mapContainerRef.current) return;

      try {
        if (retainedMap && retainedHost) {
          container.replaceChildren(retainedHost);
          mapInstanceRef.current = retainedMap;

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
            center: MAP_CENTER,
            zoom: 10,
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
        }

        retainedTileLayer?.on('tileerror', onTileError);
        retainedTileLayer?.on('tileload', onTileLoad);

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

    const resizeObserver = new ResizeObserver(() => {
      const map = mapInstanceRef.current || retainedMap;
      map?.invalidateSize({ pan: false });
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      retainedTileLayer?.off('tileerror', onTileError);
      retainedTileLayer?.off('tileload', onTileLoad);
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
                setActiveTab('details');
                setMobileSnap('half');
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
                setActiveTab('details');
                setMobileSnap('half');
                map.setView([s.gpsLat, s.gpsLng], Math.max(map.getZoom(), 12), { animate: true });
              })
              .addTo(group);
          });
      }

      allCoordinatesRef.current = allCoordinates;

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

  // Center on an item and open details
  const handleSelectItem = useCallback((type: 'quest' | 'spot', data: QuestModel | SpotModel) => {
    setSelectedItem({ type, data });
    setActiveTab('details');
    setMobileSnap('half');
    const map = mapInstanceRef.current || retainedMap;
    if (map) {
      map.setView([data.gpsLat, data.gpsLng], Math.max(map.getZoom(), 13), { animate: true });
    }
  }, []);

  // Filtered destination list for the Explore tab
  const filteredList = useMemo(() => {
    const qLower = searchQuery.toLowerCase().trim();

    const filteredQuests = (filterType === 'all' || filterType === 'quests' || filterType === 'saved')
      ? quests.filter((q) => {
          if (filterType === 'saved' && !isSaved('quests', q.id)) return false;
          if (!qLower) return true;
          return (
            q.title.toLowerCase().includes(qLower) ||
            q.description.toLowerCase().includes(qLower) ||
            q.locationName.toLowerCase().includes(qLower)
          );
        }).map((q) => ({ type: 'quest' as const, data: q }))
      : [];

    const filteredSpots = (filterType === 'all' || filterType === 'spots' || filterType === 'saved')
      ? spots.filter((s) => {
          if (filterType === 'saved' && !isSaved('spots', s.id)) return false;
          if (!qLower) return true;
          return (
            s.name.toLowerCase().includes(qLower) ||
            s.description.toLowerCase().includes(qLower) ||
            s.municipality.toLowerCase().includes(qLower) ||
            (s.category && s.category.toLowerCase().includes(qLower))
          );
        }).map((s) => ({ type: 'spot' as const, data: s }))
      : [];

    return [...filteredQuests, ...filteredSpots];
  }, [quests, spots, filterType, searchQuery, isSaved]);

  // Workspace Tabs configuration
  const tabs: MapWorkspaceTab[] = [
    {
      id: 'explore',
      label: 'Explore',
      icon: MapPin,
      badge: filteredList.length,
    },
    {
      id: 'details',
      label: 'Details',
      icon: Award,
      badge: selectedItem ? '1' : null,
    },
  ];

  return (
    <Navigation fullBleed>
      <ErrorBoundary fallbackTitle="Unable to display destination map">
        <div className="relative w-full h-full min-h-0 flex-1 bg-stone-100 overflow-hidden select-none">
          {/* Edge-to-Edge Full Screen Leaflet Map Canvas */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* UNIFIED RESPONSIVE MAP WORKSPACE PANEL */}
          <MapWorkspacePanel
            title="Destination Map"
            subtitle={`${quests.length} Quests • ${spots.length} Spots`}
            badge={{ label: 'Interactive', variant: 'emerald' }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'explore' | 'details')}
            isDesktopCollapsed={isDesktopCollapsed}
            onDesktopCollapseChange={setIsDesktopCollapsed}
            mobileSnap={mobileSnap}
            onMobileSnapChange={setMobileSnap}
            // Floating tools (Top-right)
            floatingTools={
              <>
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
            {/* TAB 1: EXPLORE PLACES */}
            {activeTab === 'explore' && (
              <div className="space-y-3">
                {/* Search Bar Input */}
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#837560] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter places or quests..."
                    className="w-full h-9 bg-[#FAF9F5] border border-[#E3DFD5] focus:border-[#2D6A4F] rounded-xl pl-8.5 pr-8 text-xs font-semibold text-[#2C221E] placeholder:text-[#837560]/70 outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Category Chips */}
                <div className="grid grid-cols-4 gap-1 bg-[#FAF9F5] p-1 rounded-xl border border-[#E3DFD5]">
                  {[
                    { id: 'all', label: 'All', count: quests.length + spots.length },
                    { id: 'saved', label: 'Saved', count: savedLibrary.spots.length + savedLibrary.quests.length },
                    { id: 'quests', label: 'Quests', count: quests.length },
                    { id: 'spots', label: 'Spots', count: spots.length },
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
                      <span className={`text-[9px] px-1 py-0.1 rounded-full font-black ${
                        filterType === f.id ? 'bg-white/20 text-white' : 'text-[#837560]'
                      }`}>
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Scrollable Places List */}
                <div className="space-y-1.5 pt-1">
                  {filteredList.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] text-center text-xs text-[#837560] font-medium space-y-1">
                      <p>No matching places found.</p>
                      {filterType === 'saved' && (
                        <p className="text-[11px] text-[#2D6A4F] font-bold">
                          Bookmark spots or quests to see them here!
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredList.map((item) => {
                      const isQuest = item.type === 'quest';
                      const qData = item.data as QuestModel;
                      const sData = item.data as SpotModel;
                      const isCurrent = selectedItem?.data.id === item.data.id;
                      const bookmarked = isSaved(isQuest ? 'quests' : 'spots', item.data.id);

                      return (
                        <div
                          key={`${item.type}-${item.data.id}`}
                          onClick={() => handleSelectItem(item.type, item.data)}
                          className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2.5 group ${
                            isCurrent
                              ? 'bg-[#2D6A4F]/10 border-[#2D6A4F]'
                              : 'bg-white border-[#E3DFD5] hover:border-[#2D6A4F]/50 hover:bg-[#FAF9F5]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 font-bold border ${
                                isQuest
                                  ? 'bg-amber-100 text-[#7D5800] border-amber-200'
                                  : 'bg-emerald-100 text-[#2D6A4F] border-emerald-200'
                              }`}
                            >
                              {isQuest ? '🏆' : '📍'}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="text-xs font-bold text-[#2C221E] truncate group-hover:text-[#2D6A4F] transition">
                                {isQuest ? qData.title : sData.name}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-[#837560] font-medium truncate">
                                  {isQuest ? qData.locationName : sData.municipality}
                                </span>
                                {isQuest ? (
                                  <span className="text-[9px] font-black text-[#7D5800] bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200 shrink-0">
                                    +{qData.rewardPoints} mJDQ
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-[#2D6A4F] bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200 shrink-0">
                                    {sData.category || 'Spot'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaved(isQuest ? 'quests' : 'spots', item.data.id);
                              }}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                                bookmarked
                                  ? 'border-amber-300 bg-amber-50 text-[#B45309]'
                                  : 'border-transparent text-stone-400 hover:text-[#2D6A4F] hover:bg-stone-100'
                              }`}
                              title={bookmarked ? 'Remove bookmark' : 'Bookmark for later'}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                            </button>
                            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#2D6A4F] transition" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SELECTED DESTINATION DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-3.5">
                {selectedItem ? (
                  <>
                    {/* Top subheader with category badge & back to explore */}
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
                        onClick={() => setSelectedItem(null)}
                        className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                        title="Deselect place"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-[#2C221E] leading-snug">
                        {'title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name}
                      </h3>
                      <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
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

                    <button
                      type="button"
                      onClick={() => setActiveTab('explore')}
                      className="w-full text-center text-[11px] font-bold text-[#837560] hover:text-[#2D6A4F] pt-1 cursor-pointer transition"
                    >
                      ← Back to all places in Explore
                    </button>
                  </>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-stone-100 text-[#582F0E] flex items-center justify-center mx-auto">
                      <MapPin className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <p className="text-xs font-bold text-[#582F0E]">No destination selected</p>
                    <p className="text-[11px] text-[#837560]">
                      Tap any pin on the map or select a place from the Explore tab.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('explore')}
                      className="mt-2 py-1.5 px-3 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold transition cursor-pointer"
                    >
                      Browse Places
                    </button>
                  </div>
                )}
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
