'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Filter,
  X,
  Sparkles,
  ShieldCheck,
  Compass,
  ArrowRight,
  ArrowLeft,
  Heart,
  Flame,
  AlertTriangle,
  Clock,
  Camera,
  Award,
  Zap,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { SpotCardSkeleton } from '@/components/Skeleton';
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

  useEffect(() => {
    async function loadSpots() {
      setLoading(true);
      setError(null);
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
        setSpots(rawSpots);
      } catch (err: any) {
        setError(err.message || 'Failed to load search directory.');
      } finally {
        setLoading(false);
      }
    }
    loadSpots();
  }, []);

  const popularSearches = [
    'Cape Bolinao Lighthouse',
    'Patar White Beach',
    'Hundred Islands',
    'Dasol Salt Beds',
    'Bangus Grill',
    'Manaoag Minor Basilica',
    'Timmaw Cave',
  ];

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      // Query filter
      const qLower = query.toLowerCase().trim();
      const matchQuery =
        !qLower ||
        spot.name.toLowerCase().includes(qLower) ||
        spot.description.toLowerCase().includes(qLower) ||
        spot.municipality.toLowerCase().includes(qLower) ||
        spot.tags.some((t) => t.toLowerCase().includes(qLower));

      // Category filter
      const matchCategory =
        selectedCategory === 'all' || spot.category === selectedCategory;

      // Municipality filter
      const matchMunicipality =
        selectedMunicipality === 'All Municipalities' ||
        spot.municipality.toLowerCase().includes(selectedMunicipality.toLowerCase());

      // Crowd / Special filter
      let matchSpecial = true;
      if (selectedCrowdFilter === 'quiet') {
        matchSpecial = spot.crowdStatus === 'quiet';
      } else if (selectedCrowdFilter === 'quests') {
        matchSpecial = !!spot.questId;
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

  return (
    <Navigation>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {/* Search Header Bar */}
        <div className="bg-white rounded-xl border border-[#E3DFD5] p-4 sm:p-6 shadow-xs space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2 sm:gap-3">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => router.back()}
              title="Go Back"
              className="w-11 h-11 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] hover:bg-white hover:border-[#2D6A4F] text-[#582F0E] flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer shadow-2xs group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Pangasinan spots, beaches, food trails, festivals, towns..."
                className="w-full bg-[#FAF9F5] border border-[#E3DFD5] focus:border-[#2D6A4F] rounded-lg pl-11 pr-10 py-3 text-xs sm:text-sm text-[#2C221E] font-medium focus:outline-none transition"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="py-3 px-5 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs sm:text-sm font-bold transition active:scale-98 cursor-pointer shrink-0"
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
                onClick={() => setQuery(term)}
                className="text-[11px] font-medium text-[#582F0E] bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] px-2.5 py-1 rounded-md transition cursor-pointer active:scale-98"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E8E5DE]">
            {categoryFilters.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98 ${
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
              <select
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className="bg-[#FAF9F5] border border-[#E3DFD5] rounded-lg px-3 py-1.5 text-xs text-[#2C221E] font-medium focus:outline-none focus:border-[#2D6A4F]"
              >
                {municipalities.map((muni) => (
                  <option key={muni} value={muni}>{muni}</option>
                ))}
              </select>

              <button
                onClick={() => setSelectedCrowdFilter(selectedCrowdFilter === 'quiet' ? 'all' : 'quiet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedCrowdFilter === 'quiet'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[#FAF9F5] border border-[#E3DFD5] text-[#274E3C] hover:bg-white'
                }`}
              >
                🌿 Low Crowd Only
              </button>

              <button
                onClick={() => setSelectedCrowdFilter(selectedCrowdFilter === 'quests' ? 'all' : 'quests')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedCrowdFilter === 'quests'
                    ? 'bg-[#FFB703] text-[#582F0E] font-bold'
                    : 'bg-[#FAF9F5] border border-[#E3DFD5] text-[#582F0E] hover:bg-white'
                }`}
              >
                🏆 With Quest Bounties
              </button>
            </div>

            <span className="text-xs text-gray-500 font-medium">
              Found <strong>{filteredSpots.length}</strong> matching destinations
            </span>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SpotCardSkeleton />
            <SpotCardSkeleton />
            <SpotCardSkeleton />
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl p-8 border border-red-200 text-center space-y-3">
            <p className="text-xs text-red-600 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2D6A4F] text-white rounded-lg text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : filteredSpots.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-[#E3DFD5] text-center space-y-3 shadow-xs">
            <Compass className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-[#582F0E]">No Destinations Match Your Search</h3>
            <p className="text-xs text-gray-500">Try changing keywords, selecting another municipality, or clearing filters.</p>
            <button
              onClick={() => {
                setQuery('');
                setSelectedCategory('all');
                setSelectedMunicipality('All Municipalities');
                setSelectedCrowdFilter('all');
              }}
              className="px-4 py-2 bg-[#2D6A4F] text-white rounded-lg text-xs font-bold transition active:scale-98 cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpots.map((spot) => (
              <div
                key={spot.id}
                className="bg-white rounded-xl border border-[#E3DFD5] overflow-hidden flex flex-col justify-between hover:border-[#2D6A4F]/60 transition shadow-xs group"
              >
                <div>
                  {/* Photo Container */}
                  <Link href={`/spots/${spot.slug}`} className="block relative h-48 bg-gray-100 overflow-hidden">
                    <img
                      src={spot.imageUrl}
                      alt={spot.name}
                      className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Category Chip */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider">
                        {spot.subcategory || spot.category.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Crowd Badge */}
                    {spot.crowdStatus === 'quiet' && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                          🌿 Low Crowd
                        </span>
                      </div>
                    )}

                    {/* Location */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#FFB703] shrink-0" />
                        <span className="truncate">{spot.municipality}</span>
                      </div>
                    </div>
                  </Link>

                  {/* Body Content */}
                  <div className="p-5 space-y-2.5">
                    <Link href={`/spots/${spot.slug}`} className="block">
                      <h3 className="text-base font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition leading-snug line-clamp-1">
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
                    <span className="text-[11px] font-bold text-[#2D6A4F] flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-[#FFB703]" />
                      <span>Quest Bounty Available</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-medium">Verified Landmark</span>
                  )}

                  <Link
                    href={`/spots/${spot.slug}`}
                    className="text-xs font-bold text-[#2D6A4F] hover:underline flex items-center gap-1"
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
      <Suspense fallback={<Navigation><div className="p-12 text-center text-xs text-gray-500">Loading Search Discovery...</div></Navigation>}>
        <SearchContent />
      </Suspense>
    </ErrorBoundary>
  );
}
