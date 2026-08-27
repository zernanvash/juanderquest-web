'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, normalizeQuest, normalizeSpot, QuestModel, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  MapPin,
  Compass,
  Award,
  ExternalLink,
  Navigation as NavIcon,
  Trophy,
  Sparkles,
  Filter,
  X,
  RotateCw,
  Layers,
  ChevronRight,
  Maximize2,
  AlertTriangle
} from 'lucide-react';

const MAP_CENTER: [number, number] = [16.03, 120.33];

export default function QuestMapPage() {
  const { isReady } = useRequireAuth();
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'quest' | 'spot'; data: QuestModel | SpotModel } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'quests' | 'spots'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<any>(null);
  const allCoordinatesRef = useRef<[number, number][]>([]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [questsRes, spotsRes] = await Promise.all([
        fetchWithCache('map_quests', async () => {
          const res = await api.get('/quests');
          return (res.data.data as Parameters<typeof normalizeQuest>[0][]).map(normalizeQuest);
        }, { ttlMs: 120_000, forceRefresh }),
        fetchWithCache('map_spots', async () => {
          const res = await api.get('/spots');
          return (res.data.data as Parameters<typeof normalizeSpot>[0][]).map(normalizeSpot);
        }, { ttlMs: 120_000, forceRefresh }),
      ]);

      setQuests(questsRes.data);
      setSpots(spotsRes.data);
      if (questsRes.data[0]) {
        setSelectedItem({ type: 'quest', data: questsRes.data[0] });
      }
    } catch {
      setError('Could not load map coordinates from the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fit map to all loaded marker coordinates
  const handleFitBounds = useCallback(async () => {
    if (!mapInstanceRef.current || allCoordinatesRef.current.length === 0) return;
    const L = (await import('leaflet')).default;
    mapInstanceRef.current.fitBounds(L.latLngBounds(allCoordinatesRef.current).pad(0.12));
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !isReady || loading || error) return;

    let isDisposed = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (isDisposed || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: MAP_CENTER,
          zoom: 10,
          zoomControl: false, // Custom placed or default off
        });

        // Add subtle zoom control at bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          subdomains: 'abcd',
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);


        markersLayerRef.current = L.featureGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const group = markersLayerRef.current;
      if (group) group.clearLayers();

      const allCoordinates: [number, number][] = [];

      // Add Quests markers (Gold Badge)
      if (filterType === 'all' || filterType === 'quests') {
        quests.forEach((q) => {
          allCoordinates.push([q.gpsLat, q.gpsLng]);
          const icon = L.divIcon({
            className: '',
            html: `<div class="w-9 h-9 rounded-full bg-[#FFB703] text-[#582F0E] font-black text-sm border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transform hover:scale-115 transition duration-200">🏆</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });

          L.marker([q.gpsLat, q.gpsLng], { icon })
            .on('click', () => {
              setSelectedItem({ type: 'quest', data: q });
              map.setView([q.gpsLat, q.gpsLng], Math.max(map.getZoom(), 12), { animate: true });
            })
            .addTo(group);
        });
      }

      // Add Destination Spots markers (Emerald Badge)
      if (filterType === 'all' || filterType === 'spots') {
        spots.forEach((s) => {
          allCoordinates.push([s.gpsLat, s.gpsLng]);
          const icon = L.divIcon({
            className: '',
            html: `<div class="w-8 h-8 rounded-full bg-[#2D6A4F] text-white font-bold text-xs border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transform hover:scale-115 transition duration-200">📍</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
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

      if (allCoordinates.length > 0) {
        map.fitBounds(L.latLngBounds(allCoordinates).pad(0.12));
      }
    })();

    return () => {
      isDisposed = true;
    };
  }, [isReady, loading, error, quests, spots, filterType]);

  if (!isReady) return null;

  return (
    <Navigation fullBleed>
      <ErrorBoundary fallbackTitle="Unable to display Pangasinan Map">
        <div className="relative w-full h-full flex-1 bg-stone-100 overflow-hidden select-none">
          {/* Edge-to-Edge Full Screen Leaflet Map Canvas */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Top-Left Floating Filter & Header Overlay Panel */}
          <div className="absolute top-4 left-4 right-4 sm:right-auto sm:left-6 z-10 max-w-md pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-[#E3DFD5] shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#FFB703]" />
                  </div>
                  <div>
                    <h1 className="text-xs sm:text-sm font-black text-[#582F0E] leading-tight">
                      Pangasinan Tourism Map
                    </h1>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {quests.length} Quests • {spots.length} Spots Active
                    </span>
                  </div>
                </div>

                <Link
                  href="/search"
                  className="text-[11px] font-bold text-[#2D6A4F] bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] px-2.5 py-1 rounded-lg transition"
                >
                  Search Spots →
                </Link>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 rounded-lg border border-[#E3DFD5]">
                {[
                  { id: 'all', label: 'All Markers' },
                  { id: 'quests', label: '🏆 Quests Only' },
                  { id: 'spots', label: '📍 Destination Spots' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id as any)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition cursor-pointer text-center ${
                      filterType === f.id
                        ? 'bg-[#2D6A4F] text-white shadow-xs'
                        : 'text-[#582F0E] hover:bg-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Top-Right Floating Map Tool Controls */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex flex-col gap-2 pointer-events-auto">
            <button
              onClick={handleFitBounds}
              title="Fit All Coordinates"
              className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <Compass className="w-5 h-5" />
            </button>

            <button
              onClick={() => fetchData(true)}
              title="Reload Coordinates"
              className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-[#E3DFD5] text-[#582F0E] hover:text-[#2D6A4F] hover:bg-white shadow-md flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Bottom-Left Floating Marker Inspector Overlay Card */}
          {selectedItem && (
            <div className="absolute bottom-20 lg:bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:w-96 z-10 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="bg-white/98 backdrop-blur-md rounded-xl p-4 sm:p-5 border border-[#E3DFD5] shadow-xl space-y-3.5 relative">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedItem(null)}
                  title="Dismiss details"
                  className="absolute top-3 right-3 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header Tag & Rewards */}
                <div className="flex items-center gap-2 pr-6">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E3DFD5] text-[#582F0E]">
                    {selectedItem.type === 'quest' ? '🏆 Quest Trail' : '📍 Destination Spot'}
                  </span>
                  {selectedItem.type === 'quest' && (
                    <div className="flex items-center gap-1 text-[#7D5800] text-[11px] font-black bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
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
                <div className="p-2.5 bg-[#FAF9F5] rounded-lg border border-[#E3DFD5] text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-[#2C221E] truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                    <span className="truncate">
                      {'locationName' in selectedItem.data ? selectedItem.data.locationName : selectedItem.data.municipality}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-500 shrink-0 ml-2">
                    {selectedItem.data.gpsLat.toFixed(3)}, {selectedItem.data.gpsLng.toFixed(3)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href={`/navigate?name=${encodeURIComponent('title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name)}&lat=${selectedItem.data.gpsLat}&lng=${selectedItem.data.gpsLng}&address=${encodeURIComponent('locationName' in selectedItem.data ? selectedItem.data.locationName : selectedItem.data.address)}`}
                    className="py-2.5 px-3 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                  >
                    <NavIcon className="w-3.5 h-3.5 text-[#FFB703]" />
                    <span>Navigate</span>
                  </Link>

                  {selectedItem.type === 'quest' ? (
                    <Link
                      href={`/quests/${selectedItem.data.id}`}
                      className="py-2.5 px-3 rounded-lg bg-[#FAF9F5] hover:bg-white text-[#582F0E] font-bold text-xs border border-[#E3DFD5] flex items-center justify-center gap-1 transition active:scale-95"
                    >
                      <span>View Quest</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href={`/spots/${(selectedItem.data as SpotModel).slug}`}
                      className="py-2.5 px-3 rounded-lg bg-[#FAF9F5] hover:bg-white text-[#582F0E] font-bold text-xs border border-[#E3DFD5] flex items-center justify-center gap-1 transition active:scale-95"
                    >
                      <span>View Spot</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
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
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-red-50/95 backdrop-blur-md px-4 py-2 rounded-xl border border-red-200 shadow-md flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>{error}</span>
              <button onClick={() => fetchData(true)} className="underline ml-2">Retry</button>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
