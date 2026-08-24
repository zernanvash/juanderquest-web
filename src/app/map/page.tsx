'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, normalizeQuest, normalizeSpot, QuestModel, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Skeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MapPin, Compass, Award, ExternalLink, Navigation as NavIcon, Trophy, Sparkles, Filter } from 'lucide-react';

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
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        markersLayerRef.current = L.featureGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const group = markersLayerRef.current;
      if (group) group.clearLayers();

      const allCoordinates: [number, number][] = [];

      // Add Quests markers (Gold)
      if (filterType === 'all' || filterType === 'quests') {
        quests.forEach((q) => {
          allCoordinates.push([q.gpsLat, q.gpsLng]);
          const icon = L.divIcon({
            className: '',
            html: `<div class="w-8 h-8 rounded-full bg-[#FFB703] text-[#582F0E] font-black text-sm border-2 border-white shadow-md flex items-center justify-center cursor-pointer transform hover:scale-110 transition">🏆</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          L.marker([q.gpsLat, q.gpsLng], { icon })
            .bindPopup(`<b>${q.title}</b><br/>${q.locationName}<br/>+${q.rewardPoints} mJDQ`)
            .on('click', () => setSelectedItem({ type: 'quest', data: q }))
            .addTo(group);
        });
      }

      // Add Spots markers (Green)
      if (filterType === 'all' || filterType === 'spots') {
        spots.forEach((s) => {
          allCoordinates.push([s.gpsLat, s.gpsLng]);
          const icon = L.divIcon({
            className: '',
            html: `<div class="w-7 h-7 rounded-full bg-[#2D6A4F] text-white font-bold text-xs border-2 border-white shadow-md flex items-center justify-center cursor-pointer transform hover:scale-110 transition">📍</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          L.marker([s.gpsLat, s.gpsLng], { icon })
            .bindPopup(`<b>${s.name}</b><br/>${s.municipality}`)
            .on('click', () => setSelectedItem({ type: 'spot', data: s }))
            .addTo(group);
        });
      }

      if (allCoordinates.length > 0) {
        map.fitBounds(L.latLngBounds(allCoordinates).pad(0.15));
      }
    })();

    return () => {
      isDisposed = true;
    };
  }, [isReady, loading, error, quests, spots, filterType]);

  if (!isReady) return null;

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Pangasinan Map">
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E3DFD5] shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#7D5800] uppercase tracking-wider">Geographical Discovery</span>
                <span className="px-2 py-0.5 rounded-md bg-[#2D6A4F]/10 text-[#2D6A4F] text-[10px] font-black">
                  Interactive Eco-Map
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-serif text-[#582F0E]">Pangasinan Tourism Map</h1>
            </div>

            {/* Filter Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-[#FAF9F5] p-1 rounded-2xl border border-[#E3DFD5]">
              {[
                { id: 'all', label: 'All Markers' },
                { id: 'quests', label: '🏆 Quests Only' },
                { id: 'spots', label: '📍 Destination Spots' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
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

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Skeleton className="lg:col-span-8 h-[550px] rounded-3xl" />
              <Skeleton className="lg:col-span-4 h-[550px] rounded-3xl" />
            </div>
          ) : error ? (
            <div className="bg-white p-12 rounded-3xl border border-red-200 text-center text-xs text-[#BC4749] space-y-4 shadow-xs">
              <p className="font-bold">{error}</p>
              <button
                onClick={() => fetchData(true)}
                className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-extrabold cursor-pointer active:scale-95"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            /* Expansive Full-Width Map Grid (12 Columns) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Main Full-Bleed Map Canvas (8 cols) */}
              <div className="lg:col-span-8 bg-white p-3 rounded-3xl border border-[#E3DFD5] shadow-md">
                <div className="relative rounded-2xl overflow-hidden h-[500px] lg:h-[620px] bg-stone-100 border border-[#D5C4AC]">
                  <div ref={mapContainerRef} className="w-full h-full" />
                </div>
              </div>

              {/* Selected Marker Inspector Sidebar (4 cols) */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#E3DFD5] shadow-xs space-y-5 lg:sticky lg:top-20">
                {selectedItem ? (
                  <>
                    <div className="flex items-center justify-between border-b border-[#E3DFD5] pb-3">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-[#FAF9F5] border border-[#E3DFD5] text-[#582F0E]">
                        {selectedItem.type === 'quest' ? '🏆 Quest Trail' : '📍 Destination Spot'}
                      </span>
                      {selectedItem.type === 'quest' && (
                        <div className="flex items-center gap-1 text-[#7D5800] text-xs font-extrabold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Award className="w-3.5 h-3.5" />
                          <span>+{(selectedItem.data as QuestModel).rewardPoints} mJDQ</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-lg font-black font-serif text-[#582F0E]">
                        {'title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name}
                      </h2>
                      <p className="text-xs text-[#514532] leading-relaxed line-clamp-4">
                        {selectedItem.data.description}
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#FAF9F5] rounded-2xl border border-[#E3DFD5] text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Location:</span>
                        <span className="font-extrabold text-[#582F0E] text-right">
                          {'locationName' in selectedItem.data ? selectedItem.data.locationName : selectedItem.data.municipality}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Coordinates:</span>
                        <span className="font-mono text-stone-600">
                          {selectedItem.data.gpsLat.toFixed(4)}, {selectedItem.data.gpsLng.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div className="space-y-2 pt-2">
                      <Link
                        href={`/navigate?name=${encodeURIComponent('title' in selectedItem.data ? selectedItem.data.title : selectedItem.data.name)}&lat=${selectedItem.data.gpsLat}&lng=${selectedItem.data.gpsLng}&address=${encodeURIComponent('locationName' in selectedItem.data ? selectedItem.data.locationName : selectedItem.data.address)}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-black py-3.5 px-4 rounded-2xl text-xs shadow-md transition active:scale-95"
                      >
                        <NavIcon className="w-4 h-4 text-[#FFB703]" />
                        <span>Navigate with Valhalla</span>
                      </Link>

                      {selectedItem.type === 'quest' ? (
                        <Link
                          href={`/quests/${selectedItem.data.id}`}
                          className="w-full inline-flex items-center justify-center gap-2 bg-[#FAF9F5] hover:bg-white text-[#582F0E] font-extrabold py-3 px-4 rounded-2xl text-xs border border-[#E3DFD5] transition"
                        >
                          <span>Open Quest Trail</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/spots/${(selectedItem.data as SpotModel).slug}`}
                          className="w-full inline-flex items-center justify-center gap-2 bg-[#FAF9F5] hover:bg-white text-[#582F0E] font-extrabold py-3 px-4 rounded-2xl text-xs border border-[#E3DFD5] transition"
                        >
                          <span>View Destination Details</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-12">
                    Click any marker on the map to view destination details and calculate turn-by-turn routes.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
