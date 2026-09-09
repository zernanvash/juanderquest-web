'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Users,
  Trophy,
  X,
  Compass,
  ArrowRight,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import {
  isProcessableQuery,
  normalizeSearchQuery,
  fetchSearchResults,
  SearchGroup,
  PlaceResultItem,
  PersonResultItem,
  QuestResultItem,
} from '@/lib/search';

type SearchTab = 'all' | 'places' | 'people' | 'quests';

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawQuery = searchParams.get('q') || '';
  const rawType = (searchParams.get('type') || 'all').toLowerCase() as SearchTab;
  const currentTab: SearchTab = ['all', 'places', 'people', 'quests'].includes(rawType)
    ? rawType
    : 'all';

  const [inputQuery, setInputQuery] = useState(rawQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>(currentTab);

  // Results state
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [tabItems, setTabItems] = useState<Array<PlaceResultItem | PersonResultItem | QuestResultItem>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalMatches, setTotalMatches] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with URL params
  useEffect(() => {
    setInputQuery(rawQuery);
    setActiveTab(currentTab);
  }, [rawQuery, currentTab]);

  const normalized = normalizeSearchQuery(rawQuery);
  const isProcessable = isProcessableQuery(normalized);

  // Fetch results when query or activeTab changes
  const loadResults = useCallback(
    async (q: string, tab: SearchTab) => {
      const norm = normalizeSearchQuery(q);
      if (!isProcessableQuery(norm)) {
        setGroups([]);
        setTabItems([]);
        setCursor(null);
        setHasMore(false);
        setTotalMatches(undefined);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetchSearchResults(norm, tab, undefined, 20);
        if (tab === 'all') {
          setGroups(res.data.groups || []);
          setTabItems([]);
        } else {
          setTabItems(res.data.items || []);
          setGroups([]);
          setCursor(res.data.cursor || null);
          setHasMore(Boolean(res.data.has_more));
          setTotalMatches(res.data.total_matches);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to retrieve search results.';
        setError(msg);
        setGroups([]);
        setTabItems([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadResults(rawQuery, currentTab);
  }, [rawQuery, currentTab, loadResults]);

  // Load more pagination for single-type mode
  const handleLoadMore = async () => {
    if (!cursor || loadingMore || activeTab === 'all') return;
    setLoadingMore(true);

    try {
      const res = await fetchSearchResults(normalized, activeTab, cursor, 20);
      const newItems = res.data.items || [];
      setTabItems((prev) => [...prev, ...newItems]);
      setCursor(res.data.cursor || null);
      setHasMore(Boolean(res.data.has_more));
    } catch {
      // Keep existing items if load more fails
    } finally {
      setLoadingMore(false);
    }
  };

  // Switch tab and update URL cleanly
  const handleTabChange = (newTab: SearchTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams();
    if (normalized) params.set('q', normalized);
    params.set('type', newTab);
    router.push(`/search?${params.toString()}`);
  };

  // Submit search from input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeSearchQuery(inputQuery);
    if (!clean) {
      router.push('/search');
      return;
    }
    const params = new URLSearchParams();
    params.set('q', clean);
    params.set('type', activeTab);
    router.push(`/search?${params.toString()}`);
  };

  const tabs: Array<{ id: SearchTab; label: string; icon: React.ElementType }> = [
    { id: 'all', label: 'All', icon: Sparkles },
    { id: 'places', label: 'Places', icon: MapPin },
    { id: 'people', label: 'People', icon: Users },
    { id: 'quests', label: 'Quests', icon: Trophy },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Search Header Bar */}
      <div className="rounded-3xl border border-[#E3DFD5] bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="h-5 w-5 text-[#2D6A4F] absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Search places, people or quests (e.g. Hundred Islands, @juan, Trek)..."
            aria-label="Search query"
            maxLength={100}
            className="w-full h-12 rounded-full border border-[#E3DFD5] bg-[#FAF9F5] pl-12 pr-12 text-sm sm:text-base font-semibold text-[#2C221E] placeholder:text-[#837560]/70 focus:border-[#2D6A4F] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2D6A4F]/10 transition-all"
          />
          {inputQuery && (
            <button
              type="button"
              onClick={() => {
                setInputQuery('');
                router.push('/search');
              }}
              className="absolute right-4 rounded-full p-1 text-[#837560] hover:bg-[#FAF9F5] hover:text-[#582F0E] transition cursor-pointer"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Category Tabs (visible after a query or on full results page) */}
        {isProcessable && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                    isSelected
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'bg-[#FAF9F5] text-[#582F0E] border border-[#E3DFD5] hover:border-[#2D6A4F]/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. Quiet Prompt State */}
      {!isProcessable && (
        <div className="rounded-3xl border border-[#E3DFD5] bg-white p-8 sm:p-12 text-center space-y-3 shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D8F3DC]/60 text-[#2D6A4F] shadow-2xs">
            <Search className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2C221E]">
              Discover Pangasinan
            </h2>
            <p className="text-xs sm:text-sm text-[#837560] max-w-md mx-auto">
              Type at least 2 characters to search tourist destinations, community travelers, and gamified quest bounties.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-[#7D5800]">
            <Sparkles className="h-4 w-4 text-[#FFB703]" />
            <span>Search tip: Use <strong>@handle</strong> to locate specific registered scouts</span>
          </div>
        </div>
      )}

      {/* 2. Loading State */}
      {isProcessable && loading && (
        <div className="rounded-3xl border border-[#E3DFD5] bg-white p-12 text-center space-y-3 shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#2D6A4F] mx-auto" />
          <p className="text-xs font-bold text-[#837560]">Searching directory for &ldquo;{normalized}&rdquo;...</p>
        </div>
      )}

      {/* 3. Error State */}
      {isProcessable && !loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center space-y-3 shadow-xs">
          <AlertCircle className="h-8 w-8 text-[#BC4749] mx-auto" />
          <div className="space-y-1">
            <h3 className="font-serif text-base font-bold text-[#BC4749]">Search Failed</h3>
            <p className="text-xs text-[#837560]">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadResults(rawQuery, activeTab)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-red-200 text-xs font-bold text-[#BC4749] hover:bg-red-50 transition cursor-pointer shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* 4. Results Mode: "All" Grouped View */}
      {isProcessable && !loading && !error && activeTab === 'all' && (
        <div className="space-y-6">
          {groups.length === 0 ? (
            <div className="rounded-3xl border border-[#E3DFD5] bg-white p-10 text-center space-y-2 shadow-xs">
              <Compass className="h-8 w-8 text-[#837560] mx-auto" />
              <h3 className="font-serif text-base font-bold text-[#2C221E]">
                No matches found for &ldquo;{normalized}&rdquo;
              </h3>
              <p className="text-xs text-[#837560] max-w-sm mx-auto">
                No places, people, or quests matched your query. Try a broader search term or different municipality.
              </p>
            </div>
          ) : (
            groups.map((group) => {
              const groupTitle =
                group.type === 'places'
                  ? 'Places'
                  : group.type === 'people'
                  ? 'People'
                  : 'Quests';
              const GroupIcon =
                group.type === 'places' ? MapPin : group.type === 'people' ? Users : Trophy;

              return (
                <section
                  key={group.type}
                  className="rounded-3xl border border-[#E3DFD5] bg-white p-5 sm:p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#E3DFD5] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF9F5] text-[#2D6A4F] border border-[#E3DFD5]">
                        <GroupIcon className="h-4 w-4" />
                      </div>
                      <h3 className="font-serif text-base font-bold text-[#2C221E]">{groupTitle}</h3>
                      <span className="rounded-full bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-extrabold text-[#837560] border border-[#E3DFD5]">
                        {group.items.length} preview{group.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTabChange(group.type)}
                      className="flex items-center gap-1 text-xs font-bold text-[#2D6A4F] hover:underline cursor-pointer"
                    >
                      <span>See all</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.items.map((rawItem) => {
                      if (group.type === 'places') {
                        const place = rawItem as PlaceResultItem;
                        return (
                          <Link
                            key={place.id}
                            href={`/explore/${place.slug}`}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-[#E3DFD5] bg-[#FAF9F5]/40 hover:bg-white hover:border-[#2D6A4F]/60 transition-all shadow-2xs group"
                          >
                            <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-[#E3DFD5] flex items-center justify-center">
                              {place.image_url ? (
                                <img
                                  src={place.image_url}
                                  alt={place.name}
                                  className="h-full w-full object-cover group-hover:scale-105 transition"
                                />
                              ) : (
                                <MapPin className="h-6 w-6 text-[#2D6A4F]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <h4 className="text-xs sm:text-sm font-bold text-[#2C221E] truncate group-hover:text-[#2D6A4F] transition">
                                {place.name}
                              </h4>
                              <p className="text-[11px] text-[#837560] truncate">{place.municipality}</p>
                              <span className="inline-block rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold text-[#582F0E] uppercase">
                                {place.category.replace('_', ' ')}
                              </span>
                            </div>
                          </Link>
                        );
                      }

                      if (group.type === 'people') {
                        const person = rawItem as PersonResultItem;
                        return (
                          <Link
                            key={person.id}
                            href={`/users/${person.id}`}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-[#E3DFD5] bg-[#FAF9F5]/40 hover:bg-white hover:border-[#2D6A4F]/60 transition-all shadow-2xs group"
                          >
                            <div className="h-14 w-14 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-[#582F0E] font-black flex items-center justify-center text-base border-2 border-white shadow-2xs">
                              {person.avatar_url ? (
                                <img
                                  src={person.avatar_url}
                                  alt={person.display_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span>{person.display_name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs sm:text-sm font-bold text-[#2C221E] truncate group-hover:text-[#2D6A4F] transition">
                                  {person.display_name}
                                </h4>
                                {person.handle && (
                                  <span className="text-[11px] font-medium text-[#2D6A4F]">
                                    @{person.handle}
                                  </span>
                                )}
                              </div>
                              {person.status_text && (
                                <p className="text-[11px] text-[#837560] truncate">{person.status_text}</p>
                              )}
                              {person.bio && !person.status_text && (
                                <p className="text-[11px] text-[#837560] truncate">{person.bio}</p>
                              )}
                            </div>
                          </Link>
                        );
                      }

                      if (group.type === 'quests') {
                        const quest = rawItem as QuestResultItem;
                        return (
                          <Link
                            key={quest.id}
                            href={`/quests/${quest.id}`}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-[#E3DFD5] bg-[#FAF9F5]/40 hover:bg-white hover:border-[#2D6A4F]/60 transition-all shadow-2xs group"
                          >
                            <div className="h-14 w-14 shrink-0 rounded-xl bg-amber-50 border border-amber-200 text-[#B45309] flex items-center justify-center">
                              <Trophy className="h-6 w-6 text-[#FFB703]" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <h4 className="text-xs sm:text-sm font-bold text-[#2C221E] truncate group-hover:text-[#2D6A4F] transition">
                                {quest.title}
                              </h4>
                              <p className="text-[11px] text-[#837560] truncate">{quest.location_name}</p>
                              <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-[#2D6A4F]">
                                +{quest.reward_points} pts
                              </span>
                            </div>
                          </Link>
                        );
                      }

                      return null;
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* 5. Results Mode: Single Type Paginated View */}
      {isProcessable && !loading && !error && activeTab !== 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 text-xs font-bold text-[#837560]">
            <span>
              {totalMatches !== undefined ? `${totalMatches} matches found` : 'Results'}
            </span>
          </div>

          {tabItems.length === 0 ? (
            <div className="rounded-3xl border border-[#E3DFD5] bg-white p-10 text-center space-y-2 shadow-xs">
              <Compass className="h-8 w-8 text-[#837560] mx-auto" />
              <h3 className="font-serif text-base font-bold text-[#2C221E]">
                No {activeTab} matched &ldquo;{normalized}&rdquo;
              </h3>
              <p className="text-xs text-[#837560] max-w-sm mx-auto">
                Try switching to the &ldquo;All&rdquo; tab or searching for another keyword.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tabItems.map((rawItem) => {
                if (activeTab === 'places') {
                  const place = rawItem as PlaceResultItem;
                  return (
                    <Link
                      key={place.id}
                      href={`/explore/${place.slug}`}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#E3DFD5] bg-white hover:border-[#2D6A4F]/60 transition-all shadow-xs group"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-[#E3DFD5] flex items-center justify-center">
                        {place.image_url ? (
                          <img
                            src={place.image_url}
                            alt={place.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <MapPin className="h-6 w-6 text-[#2D6A4F]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-sm font-bold text-[#2C221E] truncate group-hover:text-[#2D6A4F] transition">
                          {place.name}
                        </h4>
                        <p className="text-xs text-[#837560] truncate">{place.municipality}</p>
                        <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-[#582F0E] uppercase">
                          {place.category.replace('_', ' ')}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#837560]/70 shrink-0" />
                    </Link>
                  );
                }

                if (activeTab === 'people') {
                  const person = rawItem as PersonResultItem;
                  return (
                    <Link
                      key={person.id}
                      href={`/users/${person.id}`}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#E3DFD5] bg-white hover:border-[#2D6A4F]/60 transition-all shadow-xs group"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-[#582F0E] font-black flex items-center justify-center text-lg border-2 border-white shadow-2xs">
                        {person.avatar_url ? (
                          <img
                            src={person.avatar_url}
                            alt={person.display_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{person.display_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-[#2C221E] truncate group-hover:text-[#2D6A4F] transition">
                            {person.display_name}
                          </h4>
                          {person.handle && (
                            <span className="text-xs font-semibold text-[#2D6A4F]">
                              @{person.handle}
                            </span>
                          )}
                        </div>
                        {person.status_text && (
                          <p className="text-xs text-[#837560] truncate">{person.status_text}</p>
                        )}
                        {person.bio && !person.status_text && (
                          <p className="text-xs text-[#837560] truncate">{person.bio}</p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#837560]/70 shrink-0" />
                    </Link>
                  );
                }

                if (activeTab === 'quests') {
                  const quest = rawItem as QuestResultItem;
                  return (
                    <Link
                      key={quest.id}
                      href={`/quests/${quest.id}`}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#E3DFD5] bg-white hover:border-[#2D6A4F]/60 transition-all shadow-xs group"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-xl bg-amber-50 border border-amber-200 text-[#B45309] flex items-center justify-center">
                        <Trophy className="h-7 w-7 text-[#FFB703]" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-sm font-bold text-[#2C221E] truncate group-hover:text-[#2D6A4F] transition">
                          {quest.title}
                        </h4>
                        <p className="text-xs text-[#837560] truncate">{quest.location_name}</p>
                        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-[#2D6A4F]">
                          +{quest.reward_points} pts
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#837560]/70 shrink-0" />
                    </Link>
                  );
                }

                return null;
              })}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-[#E3DFD5] hover:border-[#2D6A4F] text-xs font-bold text-[#582F0E] hover:text-[#2D6A4F] transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#2D6A4F]" />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <span>Load more results</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Navigation>
      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl p-12 text-center text-xs font-bold text-[#837560]">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[#2D6A4F]" />
            <span>Loading search...</span>
          </div>
        }
      >
        <SearchResultsContent />
      </Suspense>
    </Navigation>
  );
}
