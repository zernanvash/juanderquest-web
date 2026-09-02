'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Sparkles,
  Trophy,
  X,
  Compass,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { api, normalizeSpot, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';

const municipalities = [
  'All Municipalities',
  'Bolinao',
  'Alaminos City',
  'Dagupan City',
  'Lingayen',
  'Dasol',
  'Manaoag',
  'San Fabian',
  'Bani',
  'Sual',
  'Anda',
];

const categoryFilters = [
  { id: 'all', label: 'All Categories' },
  { id: 'nature_outdoors', label: '🏖️ Nature & Beaches' },
  { id: 'eat_drink', label: '🍜 Food & Culinary' },
  { id: 'culture_heritage', label: '🏛️ Heritage & Shrines' },
  { id: 'activities_wellness', label: '🧗 Outdoor & Eco' },
  { id: 'shopping_local', label: '🛍️ Local MSME Crafts' },
];

const popularSearches = [
  'Hundred Islands',
  'Patar White Beach',
  'Cape Bolinao Lighthouse',
  'Dasol Salt Beds',
  'Manaoag Minor Basilica',
  'Bangus Grill',
  'Timmaw Cave',
];

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  query,
  setQuery,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState('All Municipalities');
  const [selectedCrowdFilter, setSelectedCrowdFilter] = useState<'all' | 'quiet' | 'quests'>('all');
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [loading, setLoading] = useState(false);

  // Load spots for search index
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const { data: rawSpots } = await fetchWithCache(
          'spots_search_feed',
          async () => {
            const res = await api.get('/spots');
            if (!res.data?.success) throw new Error('Spots unavailable');
            return (res.data.data as Parameters<typeof normalizeSpot>[0][]).map(normalizeSpot);
          },
          { ttlMs: 120_000 }
        );
        if (active) setSpots(rawSpots);
      } catch {
        // Silent fallback
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered spots calculation
  const filteredSpots = useMemo(() => {
    const qLower = query.toLowerCase().trim();
    return spots.filter((spot) => {
      const matchQuery =
        !qLower ||
        spot.name.toLowerCase().includes(qLower) ||
        spot.description.toLowerCase().includes(qLower) ||
        spot.municipality.toLowerCase().includes(qLower) ||
        spot.tags.some((t) => t.toLowerCase().includes(qLower));

      const matchCategory =
        selectedCategory === 'all' || spot.category === selectedCategory;

      const matchMunicipality =
        selectedMunicipality === 'All Municipalities' ||
        spot.municipality.toLowerCase().includes(selectedMunicipality.toLowerCase());

      let matchSpecial = true;
      if (selectedCrowdFilter === 'quiet') {
        matchSpecial = spot.crowdStatus === 'quiet';
      } else if (selectedCrowdFilter === 'quests') {
        matchSpecial = Boolean(spot.questId);
      }

      return matchQuery && matchCategory && matchMunicipality && matchSpecial;
    });
  }, [spots, query, selectedCategory, selectedMunicipality, selectedCrowdFilter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 top-16 z-40 bg-black/45 backdrop-blur-xs flex flex-col justify-start items-center p-3 sm:p-5 overflow-y-auto transition-opacity duration-200 ease-out"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-[#E3DFD5] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        
        {/* Filters & Controls Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-[#FAF9F5] to-white border-b border-[#E3DFD5] space-y-4">
          
          {/* Top Status & Clear Row */}
          <div className="flex items-center justify-between text-xs text-[#837560]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#582F0E] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#2D6A4F]" />
                Filter Destinations
              </span>
              <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-bold">
                {filteredSpots.length} {filteredSpots.length === 1 ? 'place' : 'places'} found
              </span>
            </div>

            {(selectedCategory !== 'all' || selectedMunicipality !== 'All Municipalities' || selectedCrowdFilter !== 'all' || query) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedMunicipality('All Municipalities');
                  setSelectedCrowdFilter('all');
                  setQuery('');
                }}
                className="text-[11px] font-bold text-[#BC4749] hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Category Chips Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categoryFilters.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#2D6A4F] text-white shadow-2xs'
                    : 'bg-white text-[#582F0E] border border-[#E3DFD5] hover:border-[#2D6A4F]/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Municipality Selector & Crowd Toggles Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            {/* Municipality Dropdown */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
              <select
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className="bg-white border border-[#E3DFD5] rounded-lg px-2.5 py-1 text-xs text-[#582F0E] font-bold focus:outline-none focus:border-[#2D6A4F] transition"
              >
                {municipalities.map((muni) => (
                  <option key={muni} value={muni}>
                    {muni}
                  </option>
                ))}
              </select>
            </div>

            {/* Special Crowd / Quest Toggles */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCrowdFilter((prev) => (prev === 'quiet' ? 'all' : 'quiet'))}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  selectedCrowdFilter === 'quiet'
                    ? 'bg-emerald-100 text-[#2D6A4F] border border-emerald-300'
                    : 'bg-stone-50 text-[#837560] border border-[#E3DFD5] hover:bg-stone-100'
                }`}
              >
                <span>🌿 Quiet Spots</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCrowdFilter((prev) => (prev === 'quests' ? 'all' : 'quests'))}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  selectedCrowdFilter === 'quests'
                    ? 'bg-amber-100 text-[#935610] border border-amber-300'
                    : 'bg-stone-50 text-[#837560] border border-[#E3DFD5] hover:bg-stone-100'
                }`}
              >
                <span>🏆 Quests Available</span>
              </button>
            </div>
          </div>

          {/* Popular Tag Suggestions (When query is empty) */}
          {!query && (
            <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#837560]">
              <span className="font-semibold text-stone-400">Popular:</span>
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-emerald-50 hover:text-[#2D6A4F] transition cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results List Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5 divide-y divide-[#E3DFD5]">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#837560] space-y-2">
              <div className="w-6 h-6 border-2 border-[#2D6A4F] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Searching destinations...</p>
            </div>
          ) : filteredSpots.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Compass className="w-8 h-8 text-[#D5C4AC] mx-auto" />
              <h4 className="font-bold text-sm text-[#582F0E]">No places found</h4>
              <p className="text-xs text-[#837560]">
                Try adjusting your search terms, municipality, or category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {filteredSpots.map((spot) => (
                <Link
                  key={spot.id}
                  href={`/spots/${spot.slug}`}
                  onClick={onClose}
                  className="flex gap-3 p-2.5 rounded-xl bg-[#FAF9F5] hover:bg-emerald-50/70 border border-[#E3DFD5] hover:border-[#2D6A4F]/60 transition group cursor-pointer"
                >
                  {spot.imageUrl ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-200 shrink-0">
                      <img
                        src={spot.imageUrl}
                        alt={spot.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-stone-100 border border-[#E3DFD5] flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-[#2D6A4F]" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#2D6A4F] bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                          {spot.municipality}
                        </span>
                        {spot.questId && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Trophy className="w-2.5 h-2.5" />
                            Quest
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-[#582F0E] group-hover:text-[#2D6A4F] transition truncate mt-1">
                        {spot.name}
                      </h4>
                    </div>

                    <p className="text-[11px] text-[#837560] line-clamp-1">
                      {spot.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-stone-50 border-t border-[#E3DFD5] flex items-center justify-between text-[11px] text-[#837560]">
          <span>
            Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E3DFD5] font-mono text-[10px]">ESC</kbd> to close
          </span>
          <Link
            href="/search"
            onClick={onClose}
            className="font-bold text-[#2D6A4F] hover:underline flex items-center gap-1"
          >
            <span>Open Dedicated Search Page</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </div>
  );
};
