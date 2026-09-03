'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Award
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeQuest, normalizeSpot, QuestModel, SpotModel } from '@/lib/api';
import { useSavedLibrary } from '@/lib/saved-library';

export default function SavedLibraryPage() {
  const { library, toggle } = useSavedLibrary();
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'spots' | 'quests'>('spots');

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

  const savedSpots = useMemo(() => spots.filter((spot) => library.spots.includes(spot.id)), [spots, library.spots]);
  const savedQuests = useMemo(() => quests.filter((quest) => library.quests.includes(quest.id)), [quests, library.quests]);
  const currentItems = tab === 'spots' ? savedSpots : savedQuests;
  const totalSaved = savedSpots.length + savedQuests.length;

  return (
    <Navigation>
      <div className="mx-auto max-w-5xl space-y-6">
        
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
              <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#2C221E] tracking-tight">
                Saved Places &amp; Quests
              </h1>
              <p className="text-xs sm:text-sm text-[#514532] leading-relaxed">
                Curate your personalized Pangasinan expedition. All saved destinations and active quest trails are preserved here for seamless turn-by-turn navigation and itinerary planning.
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
                  {savedSpots.length} places · {savedQuests.length} quests
                </p>
              </div>
            </div>
          </div>

          {/* Decorative Corner Watermark */}
          <Compass className="pointer-events-none absolute -bottom-8 -right-8 h-44 w-44 text-[#D5C4AC]/20 rotate-12 select-none" />
        </header>

        {/* Navigation & Segmented Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 rounded-2xl border border-[#E3DFD5] bg-white p-1.5 shadow-2xs">
            <button
              onClick={() => setTab('spots')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
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
              onClick={() => setTab('quests')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
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
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-amber-100/60 px-4 py-2.5 text-xs font-bold text-[#7D5800] shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95 group"
          >
            <MapPin className="h-4 w-4 text-[#B45309] group-hover:scale-110 transition-transform" />
            <span>View Saved on Map</span>
            <span className="rounded-full bg-[#FFB703]/30 px-1.5 py-0.2 text-[10px] font-black text-[#582F0E]">Gold Pins</span>
          </Link>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
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
              <h2 className="font-serif text-lg font-black text-[#582F0E]">
                No saved {tab === 'spots' ? 'destinations' : 'quests'} yet
              </h2>
              <p className="text-xs text-[#837560] leading-relaxed">
                As you explore Pangasinan, tap the bookmark icon on any destination card or quest trail to pin it here for offline itinerary access.
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
          <div className="grid gap-5 sm:grid-cols-2">
            {tab === 'spots' ? (
              savedSpots.map((spot) => (
                <article
                  key={spot.id}
                  className="group overflow-hidden rounded-2xl border border-[#E3DFD5] bg-white shadow-xs hover:shadow-md hover:border-[#2D6A4F]/40 transition-all duration-300 ease-out flex flex-col justify-between"
                >
                  <div>
                    {spot.imageUrl ? (
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
                        <img
                          src={spot.imageUrl}
                          alt={spot.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                          <h2 className="font-serif text-base sm:text-lg font-black leading-snug drop-shadow-xs">
                            {spot.name}
                          </h2>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 pb-3">
                        <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-[#2D6A4F]">
                          {spot.municipality}
                        </span>
                        <h2 className="font-serif text-lg font-black text-[#582F0E] mt-2">
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
                      href={`/spots/${spot.slug}`}
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
              savedQuests.map((quest) => (
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
                        <h2 className="font-serif text-base sm:text-lg font-black text-[#582F0E] mt-2 leading-snug">
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
                      href={`/quests/${quest.id}`}
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

      </div>
    </Navigation>
  );
}
