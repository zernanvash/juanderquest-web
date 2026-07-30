'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, QuestModel } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { MapPin, Compass, Award, ExternalLink, Navigation as NavIcon } from 'lucide-react';

export default function QuestMapPage() {
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<QuestModel | null>(null);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      const res = await api.get('/quests');
      if (res.data?.success && res.data.data.length > 0) {
        setQuests(res.data.data);
        setSelectedQuest(res.data.data[0]);
      } else {
        fallbackQuests();
      }
    } catch (e) {
      fallbackQuests();
    }
  };

  const fallbackQuests = () => {
    const list: QuestModel[] = [
      {
        id: 'quest_1',
        title: 'Hundred Islands Eco-Adventure',
        description: 'Explore Governor’s Island view deck and coastal biodiversity in Alaminos City.',
        category: 'eco',
        target_lat: 16.2012,
        target_lng: 120.0381,
        radius_meters: 500,
        reward_points: 100,
        target_marker_id: 'MARKER_HUNDRED_ISLANDS',
      },
      {
        id: 'quest_2',
        title: 'Manaoag Shrine Cultural Trail',
        description: 'Visit the historic Minor Basilica of Our Lady of the Rosary in Manaoag.',
        category: 'cultural',
        target_lat: 16.0435,
        target_lng: 120.4851,
        radius_meters: 300,
        reward_points: 80,
        target_marker_id: 'MARKER_MANAOAG',
      },
      {
        id: 'quest_3',
        title: 'Dagupan Bangus Culinary Tour',
        description: 'Experience authentic milkfish gastronomy along Bonuan Blue Beach seafood hub.',
        category: 'food_trade',
        target_lat: 16.0821,
        target_lng: 120.3412,
        radius_meters: 400,
        reward_points: 75,
        target_marker_id: 'MARKER_DAGUPAN_BANGUS',
      },
    ];
    setQuests(list);
    setSelectedQuest(list[0]);
  };

  return (
    <Navigation>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">Quest Map</h1>
          <p className="text-xs text-[#514532]">Explore Pangasinan quest markers centered at (16.0350, 120.3330).</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Map Visual Container */}
          <div className="lg:col-span-2 bg-[#1B4332] rounded-3xl p-6 border border-[#D5C4AC]/40 shadow-sm relative min-h-[420px] flex flex-col justify-between overflow-hidden">
            {/* Map Canvas Fallback Visual */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#2D6A4F] to-[#0D1B2A] opacity-90" />
            <div className="absolute inset-0 bg-[radial-gradient(#FFB703_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs text-[#FFB703] font-bold">
                <NavIcon className="w-3.5 h-3.5" />
                <span>PANGASINAN REGION MAP</span>
              </div>
              <span className="text-[11px] text-gray-300">Lat: 16.0350 • Lng: 120.3330</span>
            </div>

            {/* Simulated Pins */}
            <div className="relative z-10 my-12 flex flex-wrap items-center justify-center gap-6">
              {quests.map((q) => {
                const isSelected = selectedQuest?.id === q.id;
                return (
                  <button
                    key={q.id.toString()}
                    onClick={() => setSelectedQuest(q)}
                    className={`p-3 rounded-2xl border-2 transition transform hover:scale-105 flex items-center gap-2 text-left shadow-lg ${
                      isSelected
                        ? 'bg-[#FFB703] text-[#582F0E] border-white font-extrabold'
                        : 'bg-white/90 text-[#582F0E] border-[#D5C4AC] backdrop-blur-md'
                    }`}
                  >
                    <MapPin className={`w-5 h-5 ${isSelected ? 'text-[#582F0E]' : 'text-[#2D6A4F]'}`} />
                    <div>
                      <div className="text-xs font-bold leading-tight">{q.title}</div>
                      <div className="text-[10px] opacity-80">{q.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="relative z-10 text-xs text-gray-300 text-center">
              Click pins to inspect destination details and launcher proof capture.
            </div>
          </div>

          {/* Selected Quest Sidebar Detail Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#D5C4AC]/40 shadow-sm flex flex-col justify-between space-y-4">
            {selectedQuest ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#EFEEEA] text-[#837560]">
                      {selectedQuest.category}
                    </span>
                    <div className="flex items-center gap-1 text-[#7D5800] text-xs font-extrabold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Award className="w-3.5 h-3.5" />
                      <span>+{selectedQuest.reward_points} PTS</span>
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
                      <span className="font-bold text-[#582F0E]">{selectedQuest.target_lat}, {selectedQuest.target_lng}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#837560]">Radius:</span>
                      <span className="font-bold text-[#582F0E]">{selectedQuest.radius_meters}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#837560]">AR Marker:</span>
                      <code className="font-mono text-[#7D5800] font-bold">{selectedQuest.target_marker_id}</code>
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
      </div>
    </Navigation>
  );
}
