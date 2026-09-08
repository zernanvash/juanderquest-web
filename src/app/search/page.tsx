'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  X,
  Compass,
  ArrowLeft,
  ChevronRight,
  Trophy,
  RotateCcw,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { DestinationMedia } from '@/components/DestinationMedia';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  'Cape Bolinao Lighthouse',
  'Patar White Beach',
  'Hundred Islands',
  'Dasol Salt Beds',
  'Bangus Grill',
  'Manaoag Minor Basilica',
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('cat') || 'all';
  const initialMunicipality = searchParams.get('muni') || 'All Municipalities';

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedMunicipality, setSelectedMunicipality] = useState(initialMunicipality);
  const [selectedCrowdFilter, setSelectedCrowdFilter] = useState<'all' | 'quiet' | 'quests'>('all');

  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSpots = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: rawSpots } = await fetchWithCache(
        'spots_search_feed',
        async () => {
          const res = await api.get('/spots');
          if (!res.data?.success) throw new Error('Could not retrieve destinations from server.');
          return (res.data.data as Parameters<typeof normalizeSpot>[0][]).map(normalizeSpot);
        },
        { ttlMs: 120_000, forceRefresh: force }
      );
      setSpots(rawSpots);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load search directory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpots();
  }, []);

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      const qLower = query.toLowerCase().trim();
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedCategory !== 'all') params.set('cat', selectedCategory);
    if (selectedMunicipality !== 'All Municipalities') params.set('muni', selectedMunicipality);
    router.replace(`/search?${params.toString()}`);
  };

  const resetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
    setSelectedMunicipality('All Municipalities');
    setSelectedCrowdFilter('all');
    router.replace('/search');
  };

  return (
    <Navigation>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {/* Search Header Bar */}
        <div className="bg-white rounded-2xl border border-[#E3DFD5] p-4 sm:p-6 shadow-xs space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2 sm:gap-3">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => router.back()}
              title="Go Back"
              className="w-11 h-11 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] hover:bg-white hover:border-[#2D6A4F] text-[#582F0E] flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer shadow-2xs group min-h-[44px] min-w-[44px]"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="relative flex-1">
              <label htmlFor="search-directory-input" className="sr-only">
                Search Pangasinan destinations
              </label>
              <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="search-directory-input"
                name="q"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Pangasinan spots, beaches, food trails, festivals, towns..."
                className="w-full bg-[#FAF9F5] border border-[#E3DFD5] focus:border-[#2D6A4F] rounded-xl pl-11 pr-10 py-3 text-xs sm:text-sm text-[#2C221E] font-medium focus:outline-none transition min-h-[44px]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search input"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="py-3 px-5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs sm:text-sm font-bold transition active:scale-98 cursor-pointer shrink-0 min-h-[44px]"
            >
              Search
            </button>
          </form>

          {/* Popular Search Suggestions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-gray-400 font-semibold">Popular:</span>
            {popularSearches.map((term, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuery(term)}
                className="text-[11px] font-medium text-[#582F0E] bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] px-2.5 py-1 rounded-lg transition cursor-pointer active:scale-98 min-h-[32px]"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Category Chips */}
          <div
            role="group"
            aria-label="Category filters"
            className="flex flex-wrap gap-2 pt-2 border-t border-[#E8E5DE]"
          >
            {categoryFilters.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                aria-pressed={selectedCategory === cat.id}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-98 min-h-[36px] ${
                  selectedCategory === cat.id
                    ? 'bg-[#2D6A4F] text-white shadow-xs'
                    : 'bg-[#FAF9F5] border border-[#E3DFD5] text-[#582F0E] hover:bg-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Secondary Filter Dropdowns & Special Flairs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="search-directory-muni" className="sr-only">
                Filter by Municipality
              </label>
              <select
                id="search-directory-muni"
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className="bg-[#FAF9F5] border border-[#E3DFD5] rounded-xl px-3 py-2 text-xs text-[#2C221E] font-bold focus:outline-none focus:border-[#2D6A4F] min-h-[36px] cursor-pointer"
              >
                {municipalities.map((muni) => (
                  <option key={muni} value={muni}>
                    {muni}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setSelectedCrowdFilter(selectedCrowdFilter === 'quiet' ? 'all' : 'quiet')}
                aria-pressed={selectedCrowdFilter === 'quiet'}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[36px] ${
                  selectedCrowdFilter === 'quiet'
                    ? 'bg-[#2D6A4F] text-white'
                    : 'bg-[#FAF9F5] border border-[#E3DFD5] text-[#274E3C] hover:bg-white'
                }`}
              >
                🌿 Low Crowd
              </button>

              <button
                type="button"
                onClick={() => setSelectedCrowdFilter(selectedCrowdFilter === 'quests' ? 'all' : 'quests')}
                aria-pressed={selectedCrowdFilter === 'quests'}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[36px] ${
                  selectedCrowdFilter === 'quests'
                    ? 'bg-amber-100 text-[#935610] border border-amber-300'
                    : 'bg-[#FAF9F5] border border-[#E3DFD5] text-[#935610] hover:bg-white'
                }`}
              >
                🏆 Has Quest
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-[#837560]">
                {loading ? 'Searching...' : `${filteredSpots.length} matching destinations`}
              </span>
              {(query || selectedCategory !== 'all' || selectedMunicipality !== 'All Municipalities' || selectedCrowdFilter !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#BC4749] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Stream */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-full py-12 text-center text-xs text-[#837560]">
              Searching destinations...
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#BC4749] mx-auto" />
            <h3 className="font-bold text-sm text-[#582F0E]">Failed to load directory</h3>
            <p className="text-xs text-[#837560] max-w-sm mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => loadSpots(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#1B4332] transition shadow-xs cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredSpots.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E3DFD5] p-12 text-center space-y-3">
            <Compass className="w-10 h-10 text-[#D5C4AC] mx-auto" />
            <h3 className="font-bold text-sm text-[#582F0E]">No destinations found</h3>
            <p className="text-xs text-[#837560] max-w-sm mx-auto">
              We couldn&apos;t find any spots matching your criteria. Try resetting filters or using a broader search term.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#1B4332] transition shadow-xs cursor-pointer active:scale-95"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpots.map((spot) => (
              <div
                key={spot.id}
                className="bg-white rounded-2xl border border-[#E3DFD5] overflow-hidden flex flex-col justify-between hover:border-[#2D6A4F]/60 transition-all duration-300 ease-out shadow-xs hover:shadow-md group"
              >
                <div>
                  {/* Photo Container */}
                  <Link href={`/spots/${spot.slug}`} className="block relative aspect-[16/10] bg-gray-100 overflow-hidden">
                    <DestinationMedia
                      src={spot.imageUrl}
                      alt={spot.name}
                      destinationName={spot.name}
                      municipality={spot.municipality}
                      aspectRatio="card"
                    />
                    {/* Category Chip */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider">
                        {spot.subcategory || spot.category.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Crowd Badge */}
                    {spot.crowdStatus === 'quiet' && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                          🌿 Low Crowd
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-[#837560]">
                      <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                      <span className="font-bold text-[#2D6A4F]">{spot.municipality}</span>
                    </div>

                    <Link href={`/spots/${spot.slug}`} className="block">
                      <h3 className="text-base font-bold font-serif text-[#2C221E] group-hover:text-[#2D6A4F] transition leading-snug line-clamp-1">
                        {spot.name}
                      </h3>
                    </Link>

                    <p className="text-xs text-[#514532] line-clamp-2 leading-relaxed">
                      {spot.description}
                    </p>

                    {/* Tags */}
                    {spot.tags && spot.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {spot.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium text-gray-500 bg-[#FAF9F5] border border-[#E3DFD5] px-2 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-[#FAF9F5] border-t border-[#E8E5DE] flex items-center justify-between">
                  {spot.questId ? (
                    <span className="text-[11px] font-bold text-[#935610] flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-[#FFB703]" />
                      <span>Quest available</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-medium">Verified Landmark</span>
                  )}

                  <Link
                    href={`/spots/${spot.slug}`}
                    className="text-xs font-bold text-[#2D6A4F] hover:underline flex items-center gap-1 min-h-[32px]"
                  >
                    <span>View Spot</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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

export default function SearchPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <Navigation>
            <div className="p-12 text-center text-xs text-gray-500">Loading Search Discovery...</div>
          </Navigation>
        }
      >
        <SearchContent />
      </Suspense>
    </ErrorBoundary>
  );
}
