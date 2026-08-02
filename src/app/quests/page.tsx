'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, normalizeQuest, QuestModel } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Compass, MapPin, Award, ArrowRight, Loader2 } from 'lucide-react';

export default function QuestsPage() {
  const { isReady } = useRequireAuth();
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const fetchQuests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/quests');
      if (res.data?.success) {
        setQuests((res.data.data as Parameters<typeof normalizeQuest>[0][]).map(normalizeQuest));
      } else {
        setError('The quest feed is unavailable right now.');
      }
    } catch (e) {
      setError('Could not reach the quest server.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  if (!isReady) return null;

  const filteredQuests = quests.filter((q) => {
    if (activeCategory === 'all') return true;
    return q.category === activeCategory;
  });

  return (
    <Navigation>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#3F6653] uppercase tracking-wider mb-1">
              <Compass className="w-4 h-4 text-[#FFB703]" />
              <span>EXPLORE & UNLOCK REWARDS</span>
            </div>
            <h1 className="text-3xl font-extrabold font-serif text-[#582F0E]">Pangasinan Quest Trails</h1>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Quests' },
              { id: 'eco', label: 'Eco-Tourism' },
              { id: 'cultural', label: 'Cultural Heritage' },
              { id: 'food_trade', label: 'Food & Culinary' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-[#2D6A4F] text-white shadow-md scale-105'
                    : 'bg-white text-[#582F0E] border border-[#D5C4AC]/40 hover:bg-[#FAF9F5]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#837560]">
            <Loader2 className="w-10 h-10 animate-spin text-[#2D6A4F] mb-3" />
            <span className="text-xs font-bold text-[#582F0E]">Loading quest trails...</span>
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
        ) : filteredQuests.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560]">
            No quest trails available in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredQuests.map((quest) => (
              <div
                key={quest.id}
                className="bg-white rounded-3xl border-2 border-[#D5C4AC]/40 hover:border-[#FFB703] p-6 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-xl bg-[#FAF9F5] text-[#837560] border border-[#D5C4AC]/40">
                      {quest.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1.5 text-[#7D5800] text-xs font-black gold-gradient px-3 py-1 rounded-xl shadow-sm text-white">
                      <Award className="w-4 h-4" />
                      <span>+{quest.rewardPoints} PTS</span>
                    </div>
                  </div>

                  <h2 className="text-lg font-bold font-serif text-[#582F0E] group-hover:text-[#2D6A4F] transition">
                    {quest.title}
                  </h2>

                  <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                    {quest.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-[#837560] pt-2">
                    <MapPin className="w-4 h-4 text-[#2D6A4F]" />
                    <span className="truncate">{quest.locationName}</span>
                    <span className="shrink-0">• Radius: {quest.radiusMeters}m</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#EFEEEA] flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#837560]">+{quest.rewardPoints} reward pts</span>

                  <Link
                    href={`/quests/${quest.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#2D6A4F] hover:text-[#1B4332] transition group-hover:translate-x-1"
                  >
                    <span>Start Quest</span>
                    <ArrowRight className="w-4 h-4" />
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
