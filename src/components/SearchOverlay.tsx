'use client';
import { travelerProfileHref } from '@/lib/preview';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Users,
  Trophy,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Compass,
} from 'lucide-react';
import {
  isProcessableQuery,
  normalizeSearchQuery,
  fetchSearchPreview,
  SearchGroup,
  PlaceResultItem,
  PersonResultItem,
  QuestResultItem,
} from '@/lib/search';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
}

type FlatItem =
  | { groupType: 'places'; item: PlaceResultItem; href: string }
  | { groupType: 'people'; item: PersonResultItem; href: string }
  | { groupType: 'quests'; item: QuestResultItem; href: string };

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  query,
  setQuery,
}) => {
  const router = useRouter();
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isComposing, setIsComposing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten items for unified keyboard navigation
  const flatItems: FlatItem[] = useMemo(() => {
    const list: FlatItem[] = [];
    for (const group of groups) {
      for (const item of group.items) {
        if (group.type === 'places') {
          const place = item as PlaceResultItem;
          list.push({ groupType: 'places', item: place, href: `/explore/${place.slug}` });
        } else if (group.type === 'people') {
          const person = item as PersonResultItem;
          list.push({ groupType: 'people', item: person, href: travelerProfileHref(person.id) });
        } else if (group.type === 'quests') {
          const quest = item as QuestResultItem;
          list.push({ groupType: 'quests', item: quest, href: `/quests/${quest.id}` });
        }
      }
    }
    return list;
  }, [groups]);

  // Execute search request
  const executeSearch = useCallback(
    async (rawTerm: string) => {
      // Abort previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const normalized = normalizeSearchQuery(rawTerm);
      if (!isProcessableQuery(normalized)) {
        setGroups([]);
        setLoading(false);
        setError(null);
        setSelectedIndex(-1);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const response = await fetchSearchPreview(normalized, 'all', controller.signal);
        // Only update if not aborted and matches current normalized query
        if (!controller.signal.aborted) {
          setGroups(response.data.groups || []);
          setSelectedIndex(-1);
        }
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Could not complete search.';
        setError(msg);
        setGroups([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Handle input changes with 250ms debounce
  useEffect(() => {
    if (isComposing) return; // Do not search during IME composition

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const normalized = normalizeSearchQuery(query);
    if (!isProcessableQuery(normalized)) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setGroups([]);
      setLoading(false);
      setError(null);
      setSelectedIndex(-1);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(normalized);
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, isComposing, executeSearch]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 60);
      const normalized = normalizeSearchQuery(query);
      if (isProcessableQuery(normalized)) {
        executeSearch(normalized);
      }
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setGroups([]);
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  // Global escape and backdrop click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const max = flatItems.length; // max index is flatItems.length ("See all" option)
          if (max === 0) return -1;
          return prev < max ? prev + 1 : 0;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const max = flatItems.length;
          if (max === 0) return -1;
          return prev > 0 ? prev - 1 : max;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const normalized = normalizeSearchQuery(query);
        if (!isProcessableQuery(normalized)) return;

        if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
          const target = flatItems[selectedIndex];
          onClose();
          router.push(target.href);
        } else {
          // Explicit Enter with no selected row or on "See all" goes to /search?q=...&type=all
          onClose();
          router.push(`/search?q=${encodeURIComponent(normalized)}&type=all`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, flatItems, query, onClose, router]);

  if (!isOpen) return null;

  const normalized = normalizeSearchQuery(query);
  const hasProcessableQuery = isProcessableQuery(normalized);
  const totalMatches = flatItems.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search places, people and quests"
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-2xl transition-all"
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-[#E3DFD5] px-4 py-3.5 sm:px-6">
          <Search className="h-5 w-5 text-[#2D6A4F] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => {
              setIsComposing(false);
              const val = normalizeSearchQuery(query);
              if (isProcessableQuery(val)) executeSearch(val);
            }}
            placeholder="Search places, people or quests (e.g. Hundred Islands, @juan, Trek)..."
            aria-label="Search places, people or quests"
            maxLength={100}
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-[#2C221E] placeholder:text-[#837560]/70 outline-none"
          />

          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[#2D6A4F]" />}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setGroups([]);
                  setSelectedIndex(-1);
                  inputRef.current?.focus();
                }}
                className="rounded-full p-1 text-[#837560] hover:bg-[#FAF9F5] hover:text-[#582F0E] transition cursor-pointer"
                title="Clear query"
                aria-label="Clear query"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block rounded-md border border-[#E3DFD5] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-bold text-[#837560]">
              ESC
            </kbd>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-h-[70vh] overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
          {/* 1. Quiet Prompt State (Empty input or < 2 processable characters) */}
          {!hasProcessableQuery && (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D8F3DC]/60 text-[#2D6A4F] shadow-2xs">
                <Search className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#2C221E]">
                  Search places, people or quests
                </h3>
                <p className="text-xs text-[#837560] max-w-sm mx-auto">
                  Type at least 2 characters to explore Pangasinan destinations, verified community scouts, and active bounties.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#7D5800]">
                <Sparkles className="h-3.5 w-3.5 text-[#FFB703]" />
                <span>Tip: Prefix with <strong>@handle</strong> to find fellow travelers</span>
              </div>
            </div>
          )}

          {/* 2. Error State */}
          {hasProcessableQuery && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#BC4749] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => executeSearch(query)}
                className="flex items-center gap-1 font-bold underline cursor-pointer hover:text-red-800"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* 3. No Results State */}
          {hasProcessableQuery && !loading && !error && groups.length === 0 && (
            <div className="py-8 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] text-[#837560]">
                <Compass className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-[#2C221E]">
                No matches found for &ldquo;{normalized}&rdquo;
              </p>
              <p className="text-xs text-[#837560] max-w-xs mx-auto">
                Try searching a different municipality, landmark, activity keyword, or scout handle.
              </p>
            </div>
          )}

          {/* 4. Results Grouping (Maximum 8 items total, capped at 4 per group) */}
          {hasProcessableQuery && groups.length > 0 && (
            <div className="space-y-5">
              {groups.map((group) => {
                const groupTitle =
                  group.type === 'places'
                    ? 'Places'
                    : group.type === 'people'
                    ? 'People'
                    : 'Quests';
                const GroupIcon =
                  group.type === 'places' ? MapPin : group.type === 'people' ? Users : Trophy;

                return (
                  <div key={group.type} className="space-y-2">
                    <div className="flex items-center justify-between px-1 text-xs font-bold text-[#837560] uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <GroupIcon className="h-3.5 w-3.5 text-[#2D6A4F]" />
                        <span>{groupTitle}</span>
                      </div>
                      {group.has_more && (
                        <Link
                          href={`/search?q=${encodeURIComponent(normalized)}&type=${group.type}`}
                          onClick={onClose}
                          className="text-[11px] text-[#2D6A4F] hover:underline normal-case font-bold"
                        >
                          See all {group.total_matches ?? ''}
                        </Link>
                      )}
                    </div>

                    <div className="space-y-1">
                      {group.items.map((rawItem) => {
                        // Find index in flatItems for keyboard active state
                        const itemIdx = flatItems.findIndex(
                          (f) => f.groupType === group.type && f.item.id === rawItem.id
                        );
                        const isSelected = itemIdx === selectedIndex;

                        if (group.type === 'places') {
                          const place = rawItem as PlaceResultItem;
                          return (
                            <Link
                              key={place.id}
                              href={`/explore/${place.slug}`}
                              onClick={onClose}
                              className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all duration-150 ${
                                isSelected
                                  ? 'bg-[#FAF9F5] border-[#2D6A4F] shadow-xs'
                                  : 'border-transparent hover:border-[#E3DFD5] hover:bg-[#FAF9F5]/70'
                              }`}
                            >
                              <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-[#FAF9F5] border border-[#E3DFD5] flex items-center justify-center">
                                {place.image_url ? (
                                  <img
                                    src={place.image_url}
                                    alt={place.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <MapPin className="h-5 w-5 text-[#2D6A4F]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-[#2C221E] truncate">
                                  {place.name}
                                </h4>
                                <p className="text-[11px] text-[#837560] truncate flex items-center gap-1">
                                  <span>{place.municipality}</span>
                                  <span>·</span>
                                  <span className="capitalize">{place.category.replace('_', ' ')}</span>
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-[#837560]/70 shrink-0" />
                            </Link>
                          );
                        }

                        if (group.type === 'people') {
                          const person = rawItem as PersonResultItem;
                          return (
                            <Link
                              key={person.id}
                              href={travelerProfileHref(person.id)}
                              onClick={onClose}
                              className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all duration-150 ${
                                isSelected
                                  ? 'bg-[#FAF9F5] border-[#2D6A4F] shadow-xs'
                                  : 'border-transparent hover:border-[#E3DFD5] hover:bg-[#FAF9F5]/70'
                              }`}
                            >
                              <div className="h-11 w-11 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-[#582F0E] font-black flex items-center justify-center text-sm shadow-2xs border border-white">
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
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs sm:text-sm font-bold text-[#2C221E] truncate">
                                    {person.display_name}
                                  </h4>
                                  {person.handle && (
                                    <span className="text-[11px] font-medium text-[#2D6A4F]">
                                      @{person.handle}
                                    </span>
                                  )}
                                </div>
                                {person.status_text ? (
                                  <p className="text-[11px] text-[#837560] truncate">
                                    {person.status_text}
                                  </p>
                                ) : person.bio ? (
                                  <p className="text-[11px] text-[#837560] truncate">{person.bio}</p>
                                ) : null}
                              </div>
                              <ArrowRight className="h-4 w-4 text-[#837560]/70 shrink-0" />
                            </Link>
                          );
                        }

                        if (group.type === 'quests') {
                          const quest = rawItem as QuestResultItem;
                          return (
                            <Link
                              key={quest.id}
                              href={`/quests/${quest.id}`}
                              onClick={onClose}
                              className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all duration-150 ${
                                isSelected
                                  ? 'bg-[#FAF9F5] border-[#2D6A4F] shadow-xs'
                                  : 'border-transparent hover:border-[#E3DFD5] hover:bg-[#FAF9F5]/70'
                              }`}
                            >
                              <div className="h-11 w-11 shrink-0 rounded-xl bg-amber-50 border border-amber-200 text-[#B45309] flex items-center justify-center">
                                <Trophy className="h-5 w-5 text-[#FFB703]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-[#2C221E] truncate">
                                  {quest.title}
                                </h4>
                                <p className="text-[11px] text-[#837560] truncate">
                                  {quest.location_name}
                                </p>
                              </div>
                              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-black text-[#2D6A4F] shrink-0">
                                +{quest.reward_points} pts
                              </span>
                            </Link>
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Full Results Action Link */}
              <div className="pt-2 border-t border-[#E3DFD5]">
                <Link
                  href={`/search?q=${encodeURIComponent(normalized)}&type=all`}
                  onClick={onClose}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                    selectedIndex === flatItems.length
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'bg-[#FAF9F5] text-[#582F0E] hover:bg-[#2D6A4F] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5" />
                    <span>See all results for &ldquo;{normalized}&rdquo;</span>
                  </div>
                  <kbd
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      selectedIndex === flatItems.length
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    Enter ↵
                  </kbd>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
