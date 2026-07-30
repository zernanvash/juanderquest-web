'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, QuestModel } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { Compass, MapPin, Award, Filter, ArrowRight, Loader2 } from 'lucide-react';

export default function QuestsPage() {
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quests');
      if (res.data?.success) {
        setQuests(res.data.data);
      }
    } catch (e) {
      console.error(e);
      // Fallback preset Pangasinan quests for prototype testing
      setQuests([
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
      ]);
    }
    setLoading(false);
  };

  const filteredQuests = quests.filter((q) => {
    if (activeCategory === 'all') return true;
    return q.category.toLowerCase().includes(activeCategory);
  });

  return (
    <Navigation>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">Pangasinan Quests</h1>
            <p className="text-xs text-[#514532]">Explore featured eco-trails, heritage sites, and local food spots.</p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Quests' },
              { id: 'eco', label: 'Eco-Tourism' },
              { id: 'cultural', label: 'Cultural Heritage' },
              { id: 'food', label: 'Food & Culinary' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-[#3F6653] text-white shadow-sm'
                    : 'bg-white text-[#582F0E] border border-[#D5C4AC]/40 hover:bg-[#EFEEEA]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quests Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#837560]">
            <Loader2 className="w-8 h-8 animate-spin text-[#3F6653] mb-2" />
            <span className="text-xs font-medium">Loading Pangasinan quest destinations...</span>
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560]">
            No quests found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuests.map((quest) => (
              <div
                key={quest.id.toString()}
                className="bg-white rounded-2xl border border-[#D5C4AC]/40 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#EFEEEA] text-[#837560]">
                      {quest.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1 text-[#7D5800] text-xs font-extrabold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                      <Award className="w-3.5 h-3.5" />
                      <span>+{quest.reward_points} PTS</span>
                    </div>
                  </div>

                  <h2 className="text-base font-bold font-serif text-[#582F0E] group-hover:text-[#2D6A4F] transition">
                    {quest.title}
                  </h2>

                  <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                    {quest.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-[#837560]">
                    <MapPin className="w-3.5 h-3.5 text-[#3F6653]" />
                    <span>GPS Radius: {quest.radius_meters}m</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#EFEEEA] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#837560]">
                    Marker: <code className="text-[#582F0E] bg-gray-100 px-1 py-0.5 rounded">{quest.target_marker_id}</code>
                  </span>

                  <Link
                    href={`/quests/${quest.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D6A4F] hover:text-[#1B4332] transition"
                  >
                    <span>View Quest</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Navigation>
  );
}
