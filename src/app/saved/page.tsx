'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Compass,
  MapPin,
  Trash2,
  Trophy,
  Navigation as NavIcon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Search,
  ArrowUp,
  Loader2,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeQuest, normalizeSpot, QuestModel, SpotModel } from '@/lib/api';
import { useSavedLibrary } from '@/lib/saved-library';
import { appRoutes } from '@/lib/routes';

export default function SavedLibraryPage() {
  const { library, toggle } = useSavedLibrary();
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'spots' | 'quests'>('spots');
  const [searchQuery, setSearchQuery] = useState('');

  // Progressive batch rendering / Infinite scroll adaptation
  const [visibleCount, setVisibleCount] = useState<number>(16);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [spotResponse, questResponse] = await Promise.all([api.get('/spots'), api.get('/quests')]);
      setSpots((spotResponse.data.data as Parameters<typeof normalizeSpot>[0][]).map(normalizeSpot));
      setQuests((questResponse.data.data as Parameters<typeof normalizeQuest>[0][]).map(normalizeQuest));
    } catch {
      setError('Could not load your saved library right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const savedSpots = useMemo(() => {
    return spots
      .filter((spot) => library.spots.includes(spot.id))
      .filter((spot) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          spot.name.toLowerCase().includes(q) ||
          spot.municipality.toLowerCase().includes(q) ||
          spot.category.toLowerCase().includes(q) ||
          spot.description.toLowerCase().includes(q)
        );
      });
  }, [spots, library.spots, searchQuery]);

  const savedQuests = useMemo(() => {
    return quests
      .filter((quest) => library.quests.includes(quest.id))
      .filter((quest) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          quest.title.toLowerCase().includes(q) ||
          quest.locationName.toLowerCase().includes(q) ||
          quest.category.toLowerCase().includes(q) ||
          quest.description.toLowerCase().includes(q)
        );
      });
  }, [quests, library.quests, searchQuery]);

  // Reset pagination on tab or search change
  useEffect(() => {
    setVisibleCount(16);
  }, [tab, searchQuery]);

  // Infinite scroll sentinel observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tab, savedSpots.length, savedQuests.length]);

  const currentItems = tab === 'spots' ? savedSpots : savedQuests;
  const paginatedSpots = useMemo(() => savedSpots.slice(0, visibleCount), [savedSpots, visibleCount]);
  const paginatedQuests = useMemo(() => savedQuests.slice(0, visibleCount), [savedQuests, visibleCount]);
  const totalSaved = library.spots.length + library.quests.length;
  const currentTotal = currentItems.length;
  const hasMoreToLoad = visibleCount < currentTotal;

  return (
    <Navigation>
      <div className="w-full space-y-6">
        
        {/* Editorial Header with Expedition Aesthetic */}
        <header className="relative overflow-hidden rounded-3xl border border-[#E3DFD5] bg-gradient-to-br from-white via-[#FAF9F5] to-amber-50/50 p-6 sm:p-8 shadow-xs">
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#7D5800] border border-amber-200">
                  <Bookmark className="h-3.5 w-3.5 fill-current text-[#B45309]" />
                  Traveler Logbook
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2.5 py-0.5 text-[10px] font-bold text-[#2D6A4F] border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" />
                  Private Browser Storage
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2C221E] tracking-tight">
                Saved Places &amp; Quests
              </h1>
              <p className="text-xs sm:text-sm text-[#514532] leading-relaxed max-w-xl">
                Curate your personal travel collection. Saved destinations and quest trails are gathered here for easier navigation and itinerary planning.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-amber-200/90 bg-white/90 p-4 shadow-2xs backdrop-blur-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-[#7D5800]">
                <Bookmark className="h-6 w-6 fill-current text-[#B45309]" />
              </div>
              <div>
                <p className="text-xl font-black text-[#2C221E] leading-none">{totalSaved}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#837560] mt-0.5">Bookmarked</p>
                <p className="text-[10px] text-[#2D6A4F] font-semibold mt-0.5">
                  {library.spots.length} places · {library.quests.length} quests
                </p>
              </div>
            </div>
          </div>

          {/* Decorative Corner Watermark */}
          <Compass className="pointer-events-none absolute -bottom-8 -right-8 h-44 w-44 text-[#D5C4AC]/20 rotate-12 select-none" />
        </header>

        {/* Navigation & Segmented Tabs Bar (Sticky Controls) */}
        <div className="sticky top-16 z-20 bg-[#FAF9F5]/90 backdrop-blur-md py-3 -mx-3 px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-y border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#E3DFD5] bg-white p-1.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setTab('spots')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                  tab === 'spots'
                    ? 'bg-[#2D6A4F] text-white shadow-xs'
                    : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                }`}
              >
                <MapPin className={`h-3.5 w-3.5 ${tab === 'spots' ? 'text-white' : 'text-[#2D6A4F]'}`} />
                <span>Places</span>
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                  tab === 'spots' ? 'bg-white/20 text-white' : 'bg-stone-100 text-[#582F0E]'
                }`}>
                  {savedSpots.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTab('quests')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                  tab === 'quests'
                    ? 'bg-[#2D6A4F] text-white shadow-xs'
                    : 'text-[#582F0E] hover:bg-[#FAF9F5]'
                }`}
              >
                <Trophy className={`h-3.5 w-3.5 ${tab === 'quests' ? 'text-[#FFB703]' : 'text-[#7D5800]'}`} />
                <span>Quests</span>
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                  tab === 'quests' ? 'bg-white/20 text-white' : 'bg-stone-100 text-[#582F0E]'
                }`}>
                  {savedQuests.length}
                </span>
              </button>
            </div>

            <Link
              href="/map?filter=saved"
              className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-amber-100/60 px-4 py-2 text-xs font-bold text-[#7D5800] shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95 group"
            >
              <MapPin className="h-4 w-4 text-[#B45309] group-hover:scale-110 transition-transform" />
              <span>Map View</span>
            </Link>
          </div>

          {/* Search bar inside Saved Library */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={tab === 'spots' ? 'Search saved places...' : 'Search saved quests...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E3DFD5] rounded-xl pl-8 pr-3 py-2 text-xs text-[#2C221E] focus:outline-none focus:border-[#2D6A4F] shadow-2xs"
            />
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse space-y-3 rounded-2xl border border-[#E3DFD5] bg-white p-5 shadow-xs">
                <div className="h-44 w-full rounded-xl bg-stone-200" />
                <div className="h-5 w-2/3 rounded bg-stone-200" />
                <div className="h-3 w-1/3 rounded bg-stone-200" />
                <div className="h-10 w-full rounded-xl bg-stone-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center space-y-3 shadow-xs">
            <p className="text-xs font-bold text-red-700">{error}</p>
            <button
              onClick={load}
              className="rounded-xl bg-[#2D6A4F] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1B4332] transition active:scale-95 cursor-pointer shadow-xs"
            >
              Retry Loading Library
            </button>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D5C4AC] bg-white p-12 text-center space-y-4 shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-[#B45309] border border-amber-200 shadow-2xs">
              <Bookmark className="h-8 w-8 text-[#B45309]" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h2 className="text-lg font-black text-[#582F0E]">
                No saved {tab === 'spots' ? 'destinations' : 'quests'} yet
              </h2>
              <p className="text-xs text-[#837560] leading-relaxed">
                As you explore, tap the bookmark icon on a destination card or quest trail to keep it in your saved collection.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2D6A4F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1B4332] transition shadow-xs active:scale-95"
              >
                <span>Browse Destinations</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/quests"
                className="inline-flex items-center gap-2 rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-4 py-2.5 text-xs font-bold text-[#582F0E] hover:bg-white transition active:scale-95"
              >
                <span>Explore Quests</span>
                <Trophy className="h-3.5 w-3.5 text-[#FFB703]" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
            {tab === 'spots' ? (
              paginatedSpots.map((spot) => (
                <article
                  key={spot.id}
                  className="group overflow-hidden rounded-2xl border border-[#E3DFD5] bg-white shadow-xs hover:shadow-md hover:border-[#2D6A4F]/40 transition-all duration-300 ease-out flex flex-col justify-between"
                >
                  <div>
                    {spot.imageUrl ? (
                      <Link
                        href={appRoutes.spot(spot.id)}
                        className="block relative aspect-[16/10] w-full overflow-hidden bg-stone-100 cursor-pointer group/img"
                        aria-label={`View details for ${spot.name}`}
                      >
                        <img
                          src={spot.imageUrl}
                          alt={spot.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-black text-[#2D6A4F] shadow-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {spot.municipality}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            {spot.category.replace('_', ' ')}
                          </p>
                          <h2 className="text-base sm:text-lg font-black leading-snug drop-shadow-xs">
                            {spot.name}
                          </h2>
                        </div>
                      </Link>
                    ) : (
                      <div className="p-5 pb-3">
                        <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-[#2D6A4F]">
                          {spot.municipality}
                        </span>
                        <h2 className="text-lg font-black text-[#582F0E] mt-2">
                          {spot.name}
                        </h2>
                      </div>
                    )}

                    <div className="p-4 space-y-2.5">
                      <p className="line-clamp-2 text-xs text-[#514532] leading-relaxed">
                        {spot.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {spot.trustLevel === 'lgu_verified' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                            <ShieldCheck className="h-3 w-3" />
                            LGU Verified
                          </span>
                        )}
                        {spot.crowdStatus === 'quiet' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[#274E3C] text-[10px] font-bold">
                            🌿 Serene &amp; Quiet
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="p-4 pt-2 border-t border-[#F2EFE9] flex items-center gap-2">
                    <Link
                      href={appRoutes.spot(spot.id)}
                      className="flex-1 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] px-3 py-2 text-center text-xs font-bold text-white transition active:scale-95 shadow-xs"
                    >
                      Explore Place
                    </Link>
                    <Link
                      href={`/navigate?name=${encodeURIComponent(spot.name)}&lat=${spot.gpsLat}&lng=${spot.gpsLng}&address=${encodeURIComponent(spot.address)}`}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] hover:bg-white px-3 py-2 text-xs font-bold text-[#582F0E] transition active:scale-95"
                      title="Navigate with Valhalla GPS"
                    >
                      <NavIcon className="h-3.5 w-3.5 text-blue-600" />
                      <span>GPS</span>
                    </Link>
                    <button
                      onClick={() => toggle('spots', spot.id)}
                      title="Remove from saved places"
                      className="inline-flex items-center justify-center rounded-xl border border-[#E3DFD5] bg-white hover:bg-red-50 hover:border-red-200 p-2 text-[#837560] hover:text-red-600 transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              paginatedQuests.map((quest) => (
                <article
                  key={quest.id}
                  className="overflow-hidden rounded-2xl border border-[#E3DFD5] bg-white shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-300 ease-out flex flex-col justify-between p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#2D6A4F] border border-emerald-200/80">
                          {quest.category.replace('_', ' ')}
                        </span>
                        <h2 className="text-base sm:text-lg font-black text-[#582F0E] mt-2 leading-snug">
                          {quest.title}
                        </h2>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-xl bg-[#FFB703] px-2.5 py-1 text-xs font-black text-[#582F0E] shadow-2xs">
                        <Award className="h-3.5 w-3.5" />
                        <span>+{quest.rewardPoints} PTS</span>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-xs text-[#514532] leading-relaxed">
                      {quest.description}
                    </p>

                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#837560] pt-1">
                      <Compass className="h-3.5 w-3.5 text-[#2D6A4F]" />
                      <span>{quest.locationName}</span>
                    </p>
                  </div>

                  {/* Quest Action Buttons */}
                  <div className="mt-5 pt-3 border-t border-[#F2EFE9] flex items-center gap-2">
                    <Link
                      href={appRoutes.quest(quest.id)}
                      className="flex-1 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] px-3 py-2 text-center text-xs font-bold text-white transition active:scale-95 shadow-xs"
                    >
                      View Quest Trail
                    </Link>
                    <button
                      onClick={() => toggle('quests', quest.id)}
                      title="Remove from saved quests"
                      className="inline-flex items-center justify-center rounded-xl border border-[#E3DFD5] bg-white hover:bg-red-50 hover:border-red-200 p-2 text-[#837560] hover:text-red-600 transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {/* Infinite Scroll Sentinel & Batch Capacity Indicator */}
        {currentItems.length > 0 && (
          <div
            ref={sentinelRef}
            className="mt-8 py-6 border-t border-[#E3DFD5]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#837560]"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2D6A4F] animate-pulse" />
              <span>
                Showing <strong className="text-[#2C221E]">{Math.min(visibleCount, currentItems.length)}</strong> of{' '}
                <strong className="text-[#2C221E]">{currentItems.length}</strong> saved {tab === 'spots' ? 'places' : 'quests'}
              </span>
              {hasMoreToLoad && (
                <span className="text-[11px] text-[#B45309] font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Scroll down to stream more
                </span>
              )}
            </div>

            {visibleCount > 16 && (
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-3.5 py-1.5 rounded-lg border border-[#E3DFD5] bg-white hover:bg-stone-50 font-bold text-[#582F0E] transition text-[11px] shadow-2xs cursor-pointer active:scale-95"
              >
                ↑ Back to top
              </button>
            )}
          </div>
        )}

      </div>
    </Navigation>
  );
}
