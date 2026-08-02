'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, normalizeQuest, QuestModel } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { MapPin, Compass, Award, ExternalLink, Navigation as NavIcon, Loader2 } from 'lucide-react';

// Pangasinan province center.
const MAP_CENTER: [number, number] = [16.0, 120.4];

export default function QuestMapPage() {
  const { isReady } = useRequireAuth();
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<QuestModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/quests');
      if (res.data?.success) {
        const list = (res.data.data as Parameters<typeof normalizeQuest>[0][]).map(normalizeQuest);
        setQuests(list);
        setSelectedQuest(list[0] ?? null);
      } else {
        setError('The quest map is unavailable right now.');
      }
    } catch (e) {
      setError('Could not reach the quest server.');
    }
    setLoading(false);
  };

  // Initialise the real Leaflet map once the container is mounted. Leaflet is
  // imported lazily because it accesses `window` at module load (no SSR).
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !isReady || loading || error || quests.length === 0) return;

    let map: LeafletMap | null = null;
    let disposed = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (disposed || !mapContainerRef.current) return;

      map = L.map(mapContainerRef.current, { center: MAP_CENTER, zoom: 9 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      quests.forEach((quest) => {
        const icon = L.divIcon({
          className: '',
          html: `<div class="jq-marker"><span>${quest.category === 'food_trade' ? '🍤' : quest.category === 'cultural' ? '🛕' : '🏝️'}</span></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });

        L.marker([quest.gpsLat, quest.gpsLng], { icon })
          .addTo(map!)
          .bindPopup(
            `<strong>${quest.title}</strong><br/>${quest.locationName}<br/>+${quest.rewardPoints} pts`
          )
          .on('click', () => setSelectedQuest(quest));
      });

      map.fitBounds(L.latLngBounds(quests.map((q) => [q.gpsLat, q.gpsLng] as [number, number])).pad(0.2));
    })();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [isReady, loading, error, quests]);

  if (!isReady) return null;

  return (
    <Navigation>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">Quest Map</h1>
          <p className="text-xs text-[#514532]">Live Pangasinan quest markers from the server — click a pin to inspect.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#837560]">
            <Loader2 className="w-10 h-10 animate-spin text-[#2D6A4F] mb-3" />
            <span className="text-xs font-bold text-[#582F0E]">Loading quest map...</span>
          </div>
        ) : error ? (
          <div className="bg-white p-12 rounded-3xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560] space-y-4">
            <p>{error}</p>
            <button
              onClick={fetchQuests}
              className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-extrabold"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real interactive Leaflet map */}
            <div className="lg:col-span-2 rounded-3xl border border-[#D5C4AC]/40 shadow-sm overflow-hidden relative">
              <div ref={mapContainerRef} className="w-full h-[480px] z-0" />
              <div className="absolute top-3 left-3 z-[500] inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-xs text-[#582F0E] font-bold shadow">
                <NavIcon className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>PANGASINAN QUEST MAP</span>
              </div>
            </div>

            {/* Selected Quest Sidebar Detail Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#D5C4AC]/40 shadow-sm flex flex-col justify-between space-y-4">
              {selectedQuest ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#EFEEEA] text-[#837560]">
                        {selectedQuest.category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-1 text-[#7D5800] text-xs font-extrabold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Award className="w-3.5 h-3.5" />
                        <span>+{selectedQuest.rewardPoints} PTS</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold font-serif text-[#582F0E]">
                      {selectedQuest.title}
                    </h3>

                    <p className="text-xs text-[#514532] leading-relaxed">
                      {selectedQuest.description}
                    </p>

                    <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#D5C4AC]/40 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#837560]">Coordinates:</span>
                        <span className="font-bold text-[#582F0E]">{selectedQuest.gpsLat}, {selectedQuest.gpsLng}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#837560]">Radius:</span>
                        <span className="font-bold text-[#582F0E]">{selectedQuest.radiusMeters}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#837560]">Location:</span>
                        <span className="font-bold text-[#582F0E] text-right">{selectedQuest.locationName}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/quests/${selectedQuest.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-bold py-3 px-4 rounded-xl text-xs transition"
                  >
                    <span>Launch AR Verification</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <div className="text-xs text-[#837560] text-center my-auto">
                  Select a marker on the map to view details.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Navigation>
  );
}
