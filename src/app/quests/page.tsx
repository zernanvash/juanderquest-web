'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, normalizeQuest, QuestModel } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Compass, MapPin, Award, ArrowRight, Loader2, Zap, Trophy, ShieldCheck, Sparkles, Filter } from 'lucide-react';

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
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header Banner */}
        <div className="rounded-3xl bg-white border border-[#E3DFD5] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black text-[#2D6A4F] uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4 text-[#FFB703]" />
              <span>Location Check-in Bounties</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#582F0E]">Pangasinan Quest Trails</h1>
            <p className="text-xs text-[#514532] mt-1 max-w-lg">
              Arrive at the destination, verify within GPS radius, and scan the physical marker to earn off-chain prototype rewards.
            </p>
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-[#FAF9F5] p-1.5 rounded-2xl border border-[#E3DFD5]">
            {[
              { id: 'all', label: 'All Quests' },
              { id: 'eco', label: '🏖️ Eco-Tourism' },
              { id: 'cultural', label: '🏛️ Cultural Heritage' },
              { id: 'food_trade', label: '🍜 Culinary' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-[#2D6A4F] text-white shadow-xs'
                    : 'text-[#582F0E] hover:bg-white hover:text-[#2D6A4F]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-16 border border-[#E3DFD5] flex flex-col items-center justify-center text-[#837560]">
            <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F] mb-3" />
            <span className="text-xs font-bold text-[#582F0E]">Loading quest trails...</span>
          </div>
        ) : error ? (
          <div className="bg-white p-10 rounded-3xl border border-red-200 text-center text-xs text-[#BC4749] space-y-3">
            <p className="font-bold">{error}</p>
            <button
              onClick={fetchQuests}
              className="px-4 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-extrabold"
            >
              Retry
            </button>
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-[#E3DFD5] text-center text-xs text-[#837560]">
            No quest trails available in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredQuests.map((quest) => (
              <article
                key={quest.id}
                className="bg-white rounded-2xl border border-[#E3DFD5] hover:border-[#2D6A4F]/50 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition duration-200 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-[#FAF9F5] text-[#2D6A4F] border border-[#E3DFD5]">
                      {quest.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1.5 bg-[#FFB703] text-[#582F0E] text-xs font-black px-2.5 py-1 rounded-lg shadow-xs">
                      <Award className="w-3.5 h-3.5" />
                      <span>+{quest.rewardPoints} PTS</span>
                    </div>
                  </div>

                  <h2 className="text-base font-black font-serif text-[#582F0E] group-hover:text-[#2D6A4F] transition line-clamp-2">
                    {quest.title}
                  </h2>

                  <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                    {quest.description}
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#837560] pt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    <span className="truncate font-semibold">{quest.locationName}</span>
                    <span className="shrink-0">• {quest.radiusMeters}m radius</span>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#E3DFD5]/70 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#7D5800]">GPS &amp; Marker Verified</span>

                  <Link
                    href={`/quests/${quest.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#2D6A4F] group-hover:text-[#1B4332] group-hover:translate-x-0.5 transition"
                  >
                    <span>Start Quest</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Navigation>
  );
}
