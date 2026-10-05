'use client';

import React from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Users,
  Trophy,
  ArrowRight,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Compass,
} from 'lucide-react';
import {
  SearchGroup,
  PlaceResultItem,
  PersonResultItem,
  QuestResultItem,
  normalizeSearchQuery,
  isProcessableQuery,
} from '@/lib/search';

export type FlatItem =
  | { groupType: 'places'; item: PlaceResultItem; href: string }
  | { groupType: 'people'; item: PersonResultItem; href: string }
  | { groupType: 'quests'; item: QuestResultItem; href: string };

export interface SearchSuggestionsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  selectedIndex: number;
  setSelectedIndex: (idx: number | ((prev: number) => number)) => void;
  flatItems: FlatItem[];
  groups: SearchGroup[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectChip?: (chip: string) => void;
  className?: string;
}

const POPULAR_SEARCH_CHIPS = [
  'Hundred Islands',
  'Patar Beach',
  'Bolinao Falls',
  'Manaoag Church',
  'Lingayen Gulf',
  'Enchanted Cave',
  '@juan',
];

export const SearchSuggestionsDropdown: React.FC<SearchSuggestionsDropdownProps> = ({
  isOpen,
  onClose,
  query,
  setQuery,
  selectedIndex,
  setSelectedIndex,
  flatItems,
  groups,
  loading,
  error,
  onRetry,
  onSelectChip,
  className = '',
}) => {
  if (!isOpen) return null;

  const normalized = normalizeSearchQuery(query);
  const hasProcessableQuery = isProcessableQuery(normalized);

  const handleChipClick = (chip: string) => {
    if (onSelectChip) {
      onSelectChip(chip);
    } else {
      setQuery(chip);
    }
  };

  return (
    <div
      role="region"
      aria-label="Search suggestions"
      className={`bg-white rounded-2xl sm:rounded-3xl border border-[#E3DFD5] shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-4">
        {/* 1. Quiet Prompt & Popular Chips State (Empty input or < 2 processable characters) */}
        {!hasProcessableQuery && (
          <div className="py-2 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#837560] uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-[#FFB703]" />
              <span>Popular Searches</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="px-3 py-1.5 rounded-full bg-[#FAF9F5] hover:bg-[#D8F3DC] border border-[#E3DFD5] hover:border-[#2D6A4F] text-xs font-semibold text-[#582F0E] hover:text-[#2D6A4F] transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5 select-none"
                >
                  {chip.startsWith('@') ? (
                    <Users className="h-3 w-3 text-[#2D6A4F]" />
                  ) : (
                    <MapPin className="h-3 w-3 text-[#2D6A4F]" />
                  )}
                  <span>{chip}</span>
                </button>
              ))}
            </div>
            <div className="pt-3 border-t border-[#E3DFD5]/60 flex items-center justify-between text-[11px] text-[#837560]">
              <span>Tip: Prefix with <strong>@handle</strong> to search fellow travelers</span>
              <kbd className="hidden sm:inline-block rounded-md border border-[#E3DFD5] bg-[#FAF9F5] px-1.5 py-0.5 text-[9px] font-bold text-[#837560]">
                ESC to close
              </kbd>
            </div>
          </div>
        )}

        {/* 2. Loading State */}
        {hasProcessableQuery && loading && groups.length === 0 && (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#2D6A4F] mx-auto" />
            <p className="text-xs font-semibold text-[#837560]">
              Searching destinations, travelers & quests...
            </p>
          </div>
        )}

        {/* 3. Error State */}
        {hasProcessableQuery && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 sm:p-4 text-xs text-[#BC4749] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1 font-bold underline cursor-pointer hover:text-red-800"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* 4. No Results State */}
        {hasProcessableQuery && !loading && !error && groups.length === 0 && (
          <div className="py-6 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] text-[#837560]">
              <Compass className="h-5 w-5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-[#2C221E]">
              No matches found for &ldquo;{normalized}&rdquo;
            </p>
            <p className="text-[11px] text-[#837560] max-w-xs mx-auto">
              Try searching a different municipality, landmark, activity keyword, or scout handle.
            </p>
          </div>
        )}

        {/* 5. Results Grouping (Maximum 8 items total, capped at 4 per group) */}
        {hasProcessableQuery && groups.length > 0 && (
          <div className="space-y-4">
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
                <div key={group.type} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-[#837560] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <GroupIcon className="h-3 w-3 text-[#2D6A4F]" />
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
                      const itemIdx = flatItems.findIndex(
                        (f) => f.groupType === group.type && f.item.id === rawItem.id
                      );
                      const isSelected = itemIdx === selectedIndex;

                      if (group.type === 'places') {
                        const place = rawItem as PlaceResultItem;
                        return (
                          <Link
                            key={place.id}
                            href={`/spots/${place.id}`}
                            onClick={onClose}
                            onMouseEnter={() => setSelectedIndex(itemIdx)}
                            className={`flex items-center gap-3 p-2 rounded-xl sm:rounded-2xl border transition-all duration-150 ${
                              isSelected
                                ? 'bg-[#FAF9F5] border-[#2D6A4F] shadow-2xs'
                                : 'border-transparent hover:border-[#E3DFD5] hover:bg-[#FAF9F5]/70'
                            }`}
                          >
                            <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-[#FAF9F5] border border-[#E3DFD5] flex items-center justify-center">
                              {place.image_url ? (
                                <img
                                  src={place.image_url}
                                  alt={place.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <MapPin className="h-4 w-4 text-[#2D6A4F]" />
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
                            <ArrowRight className="h-3.5 w-3.5 text-[#837560]/70 shrink-0" />
                          </Link>
                        );
                      }

                      if (group.type === 'people') {
                        const person = rawItem as PersonResultItem;
                        return (
                          <Link
                            key={person.id}
                            href={person.handle ? `/profile/${person.handle.replace(/^@/, '')}` : `/profile/${person.id}`}
                            onClick={onClose}
                            onMouseEnter={() => setSelectedIndex(itemIdx)}
                            className={`flex items-center gap-3 p-2 rounded-xl sm:rounded-2xl border transition-all duration-150 ${
                              isSelected
                                ? 'bg-[#FAF9F5] border-[#2D6A4F] shadow-2xs'
                                : 'border-transparent hover:border-[#E3DFD5] hover:bg-[#FAF9F5]/70'
                            }`}
                          >
                            <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-[#582F0E] font-black flex items-center justify-center text-xs shadow-2xs border border-white">
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
                            <ArrowRight className="h-3.5 w-3.5 text-[#837560]/70 shrink-0" />
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
                            onMouseEnter={() => setSelectedIndex(itemIdx)}
                            className={`flex items-center gap-3 p-2 rounded-xl sm:rounded-2xl border transition-all duration-150 ${
                              isSelected
                                ? 'bg-[#FAF9F5] border-[#2D6A4F] shadow-2xs'
                                : 'border-transparent hover:border-[#E3DFD5] hover:bg-[#FAF9F5]/70'
                            }`}
                          >
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-50 border border-amber-200 text-[#B45309] flex items-center justify-center">
                              <Trophy className="h-4 w-4 text-[#FFB703]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-[#2C221E] truncate">
                                {quest.title}
                              </h4>
                              <p className="text-[11px] text-[#837560] truncate">
                                {quest.location_name}
                              </p>
                            </div>
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-[#2D6A4F] shrink-0">
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
                onMouseEnter={() => setSelectedIndex(flatItems.length)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all ${
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
  );
};
