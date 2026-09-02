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
  Check,
  ChevronDown,
  RotateCcw,
  Tag,
  Search
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
  { id: 'all', label: 'All Destinations' },
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
        // Fallback gracefully
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

  // Prevent background page scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  // Filtered spots calculation
  const hasTyped = query.trim().length > 0;

  const filteredSpots = useMemo(() => {
    if (!hasTyped) return [];
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

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedMunicipality !== 'All Municipalities' ||
    selectedCrowdFilter !== 'all' ||
    query.trim().length > 0;

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedMunicipality('All Municipalities');
    setSelectedCrowdFilter('all');
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 top-16 z-40 bg-stone-900/55 backdrop-blur-md flex flex-col justify-start items-center p-3 sm:p-5 sm:pt-6 overflow-y-auto transition-opacity duration-300 ease-out"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-3xl border border-[#E3DFD5] shadow-2xl overflow-hidden ring-1 ring-black/5 animate-in fade-in-0 zoom-in-98 duration-200 ease-out">
        
        {/* Controls & Filter Bar Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-[#FAF9F5] via-white to-white border-b border-[#E3DFD5] space-y-4">
          
          {/* Top Filter Status & Action Bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-serif font-black text-[#582F0E] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2D6A4F]" />
                Filter Destinations
              </span>
              {hasTyped ? (
                <span className="text-[10px] bg-emerald-50 text-[#2D6A4F] border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold">
                  {filteredSpots.length} {filteredSpots.length === 1 ? 'destination' : 'destinations'} found
                </span>
              ) : (
                <span className="text-[10px] bg-stone-100 text-stone-500 border border-stone-200 px-2 py-0.5 rounded-full font-medium">
                  Type above to search
                </span>
              )}
            </div>


            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#BC4749] hover:text-red-700 transition cursor-pointer hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset all</span>
              </button>
            )}
          </div>

          {/* Interactive Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categoryFilters.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 select-none ${
                    isSelected
                      ? 'bg-[#2D6A4F] text-white shadow-xs scale-102 ring-2 ring-[#2D6A4F]/20'
                      : 'bg-[#FAF9F5] text-[#582F0E] border border-[#E3DFD5] hover:bg-white hover:border-[#2D6A4F]/50 active:scale-95'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Secondary Controls: Municipality Selector & Crowd Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#E8E5DE]/80">
            
            {/* Municipality Dropdown */}
            <div className="relative flex items-center min-w-[210px]">
              <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] absolute left-3 pointer-events-none" />
              <select
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className="w-full appearance-none bg-white border border-[#E3DFD5] hover:border-[#2D6A4F]/60 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-[#582F0E] font-bold focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 transition cursor-pointer shadow-2xs"
              >
                {municipalities.map((muni) => (
                  <option key={muni} value={muni}>
                    {muni}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 pointer-events-none" />
            </div>

            {/* Quick Feature Toggles */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCrowdFilter((prev) => (prev === 'quiet' ? 'all' : 'quiet'))}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none ${
                  selectedCrowdFilter === 'quiet'
                    ? 'bg-emerald-100/90 text-[#2D6A4F] border border-emerald-300 shadow-2xs'
                    : 'bg-[#FAF9F5] text-[#837560] border border-[#E3DFD5] hover:bg-white hover:border-[#2D6A4F]/40'
                }`}
              >
                <span>🌿 Quiet &amp; Peaceful</span>
                {selectedCrowdFilter === 'quiet' && <Check className="w-3 h-3 text-[#2D6A4F]" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCrowdFilter((prev) => (prev === 'quests' ? 'all' : 'quests'))}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none ${
                  selectedCrowdFilter === 'quests'
                    ? 'bg-amber-100/90 text-[#935610] border border-amber-300 shadow-2xs'
                    : 'bg-[#FAF9F5] text-[#837560] border border-[#E3DFD5] hover:bg-white hover:border-amber-400/40'
                }`}
              >
                <span>🏆 Quests Available</span>
                {selectedCrowdFilter === 'quests' && <Check className="w-3 h-3 text-[#935610]" />}
              </button>
            </div>
          </div>

          {/* Popular Tag Shortcut Chips */}
          {!query && (
            <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#837560]">
              <span className="font-semibold text-stone-400 mr-0.5">Popular Pangasinan:</span>
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-50 text-[#6B5E4C] hover:text-[#2D6A4F] border border-transparent hover:border-emerald-200/70 transition cursor-pointer font-medium active:scale-95"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Matching Results Grid */}
        <div className="max-h-[58vh] overflow-y-auto p-4 sm:p-6 bg-[#FCFBF8]/60">
          {!hasTyped ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-2xs text-[#2D6A4F]">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#582F0E]">Type to search destinations</h4>
              <p className="text-xs text-[#837560] max-w-sm mx-auto leading-relaxed">
                Type a town (e.g. Bolinao, Alaminos), beach, landmark, or food in the search bar above to see instant results.
              </p>
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-xs text-[#837560] space-y-3">
              <div className="w-7 h-7 border-2 border-[#2D6A4F] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-semibold text-[#582F0E]">Discovering Pangasinan destinations...</p>
            </div>
          ) : filteredSpots.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-[#E3DFD5] flex items-center justify-center mx-auto text-[#D5C4AC]">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#582F0E]">No matching destinations</h4>
              <p className="text-xs text-[#837560] max-w-sm mx-auto leading-relaxed">
                We couldn&apos;t find any spots matching your current filters. Try relaxing the municipality, category, or search term.
              </p>

              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#1B4332] transition shadow-xs cursor-pointer active:scale-95"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredSpots.map((spot) => (
                <Link
                  key={spot.id}
                  href={`/spots/${spot.slug}`}
                  onClick={onClose}
                  className="group flex gap-3.5 p-3 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-emerald-50/50 hover:via-white hover:to-white border border-[#E3DFD5] hover:border-[#2D6A4F]/50 shadow-2xs hover:shadow-md transition-all duration-200 ease-out cursor-pointer relative overflow-hidden"
                >
                  {/* Photo Container */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#E3DFD5]/80 relative shadow-2xs">
                    {spot.imageUrl ? (
                      <img
                        src={spot.imageUrl}
                        alt={spot.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-100">
                        <MapPin className="w-6 h-6 text-[#2D6A4F]" />
                      </div>
                    )}
                    {spot.crowdStatus === 'quiet' && (
                      <span className="absolute bottom-1 left-1 bg-[#1B4332]/90 backdrop-blur-2xs text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                        🌿 Quiet
                      </span>
                    )}
                  </div>

                  {/* Destination Information */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-[#2D6A4F] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {spot.municipality}
                        </span>
                        {spot.questId && (
                          <span className="text-[10px] font-black text-[#935610] bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300/80 flex items-center gap-1">
                            <Trophy className="w-2.5 h-2.5" />
                            +250 mJDQ
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif font-bold text-sm text-[#2C221E] group-hover:text-[#2D6A4F] transition-colors leading-snug truncate">
                        {spot.name}
                      </h4>

                      <p className="text-[11px] text-[#6B5E4C] line-clamp-2 leading-relaxed">
                        {spot.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#837560] pt-1">
                      <span className="truncate max-w-[170px]">
                        {spot.address || spot.municipality}
                      </span>
                      <span className="font-bold text-[#2D6A4F] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Clean Footer Bar */}
        <div className="px-5 py-3.5 bg-stone-50/90 border-t border-[#E3DFD5] flex items-center justify-between text-[11px] text-[#837560]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E3DFD5] font-mono text-[10px] shadow-2xs font-bold text-stone-600">
                ESC
              </kbd>
              <span>to close</span>
            </span>
            <span className="text-stone-300">·</span>
            <span className="hidden sm:inline">
              {hasTyped ? 'Click any destination to explore immediately' : 'Search anywhere across JuanDerQuest'}
            </span>
          </div>


          <Link
            href="/search"
            onClick={onClose}
            className="font-bold text-[#2D6A4F] hover:text-[#1B4332] hover:underline flex items-center gap-1 transition"
          >
            <span>Full Directory Page</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </div>
  );
};
