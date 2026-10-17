'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapPin, Compass, Trophy, X, Sparkles, Navigation as NavIcon } from 'lucide-react';
import { PixelSearchIcon } from '@/components/PixelIcons';
import { AreaDefinition, findMatchingAreas, findAreaByIdOrName, KNOWN_AREAS } from '@/lib/areas';
import { QuestModel, SpotModel } from '@/lib/api';

export interface MapOmniboxProps {
  onSelectArea: (area: AreaDefinition) => void;
  onSelectDestination: (type: 'quest' | 'spot', data: QuestModel | SpotModel) => void;
  activeArea: AreaDefinition | null;
  onClearActiveArea: () => void;
  spots: SpotModel[];
  quests: QuestModel[];
  placeholder?: string;
  className?: string;
}

export function MapOmnibox({
  onSelectArea,
  onSelectDestination,
  activeArea,
  onClearActiveArea,
  spots,
  quests,
  placeholder = 'Search area, town, spot, or quest…',
  className = '',
}: MapOmniboxProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const cleanQuery = query.trim().toLowerCase();

  // 1. Matching Geographic Areas (e.g. Pangasinan, Bolinao, Alaminos)
  const matchedAreas = useMemo(() => {
    if (!cleanQuery) return [];
    return findMatchingAreas(cleanQuery);
  }, [cleanQuery]);

  // 2. Matching Destination Spots
  const matchedSpots = useMemo(() => {
    if (!cleanQuery) return [];
    return spots
      .filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(cleanQuery);
        const muniMatch = s.municipality.toLowerCase().includes(cleanQuery);
        const tagMatch = s.tags?.some((t) => t.toLowerCase().includes(cleanQuery));
        return nameMatch || muniMatch || tagMatch;
      })
      .slice(0, 4);
  }, [spots, cleanQuery]);

  // 3. Matching Quests
  const matchedQuests = useMemo(() => {
    if (!cleanQuery) return [];
    return quests
      .filter((q) => {
        const titleMatch = q.title.toLowerCase().includes(cleanQuery);
        const locMatch = q.locationName.toLowerCase().includes(cleanQuery);
        return titleMatch || locMatch;
      })
      .slice(0, 3);
  }, [quests, cleanQuery]);

  // Suggested popular areas shown when focused but empty
  const popularAreas = useMemo(() => {
    return KNOWN_AREAS.filter((a) =>
      ['pangasinan', 'bolinao', 'alaminos', 'dagupan', 'lingayen'].includes(a.id)
    );
  }, []);

  // Flattened items for unified keyboard navigation
  const flatItems = useMemo(() => {
    if (cleanQuery.length >= 2) {
      return [
        ...matchedAreas.map((a) => ({ kind: 'area' as const, id: `area-${a.id}`, data: a })),
        ...matchedSpots.map((s) => ({ kind: 'spot' as const, id: `spot-${s.id}`, data: s })),
        ...matchedQuests.map((q) => ({ kind: 'quest' as const, id: `quest-${q.id}`, data: q })),
      ];
    }
    return popularAreas.map((a) => ({ kind: 'area' as const, id: `pop-${a.id}`, data: a }));
  }, [cleanQuery, matchedAreas, matchedSpots, matchedQuests, popularAreas]);

  // Reset selectedIndex whenever query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  const hasResults =
    matchedAreas.length > 0 || matchedSpots.length > 0 || matchedQuests.length > 0;

  const showDropdown = isFocused && (cleanQuery.length >= 2 || cleanQuery.length === 0);

  const handleSelectAreaItem = useCallback(
    (area: AreaDefinition) => {
      setQuery('');
      setIsFocused(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      onSelectArea(area);
    },
    [onSelectArea]
  );

  const handleSelectSpotItem = useCallback(
    (spot: SpotModel) => {
      setQuery('');
      setIsFocused(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      onSelectDestination('spot', spot);
    },
    [onSelectDestination]
  );

  const handleSelectQuestItem = useCallback(
    (quest: QuestModel) => {
      setQuery('');
      setIsFocused(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      onSelectDestination('quest', quest);
    },
    [onSelectDestination]
  );

  const handleSelectFlatItem = useCallback(
    (item: (typeof flatItems)[number]) => {
      if (item.kind === 'area') handleSelectAreaItem(item.data as AreaDefinition);
      else if (item.kind === 'spot') handleSelectSpotItem(item.data as SpotModel);
      else if (item.kind === 'quest') handleSelectQuestItem(item.data as QuestModel);
    },
    [handleSelectAreaItem, handleSelectSpotItem, handleSelectQuestItem]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanQuery) return;

    if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
      handleSelectFlatItem(flatItems[selectedIndex]);
      return;
    }

    // Check if exact or partial match to a known area first (e.g. "Bolinao")
    const areaMatch = findAreaByIdOrName(cleanQuery) || matchedAreas[0];
    if (areaMatch) {
      handleSelectAreaItem(areaMatch);
      return;
    }

    // Check if matched spot or quest
    if (matchedSpots.length > 0) {
      handleSelectSpotItem(matchedSpots[0]);
      return;
    }
    if (matchedQuests.length > 0) {
      handleSelectQuestItem(matchedQuests[0]);
      return;
    }

    // If no match, do NOT invent or force Pangasinan province: leave query in place for honest feedback
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!flatItems.length) return;
      setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!flatItems.length) return;
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`}>
      {/* Omnibox Input Bar */}
      <form
        onSubmit={handleFormSubmit}
        className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl border border-[#E3DFD5] shadow-lg hover:shadow-xl focus-within:shadow-xl focus-within:border-[#2D6A4F] transition-all overflow-hidden"
      >
        <div className="pl-3.5 pr-2 py-2 flex items-center pointer-events-none">
          <PixelSearchIcon className="w-4 h-4" size={18} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={activeArea ? `Viewing ${activeArea.name}…` : placeholder}
          aria-label="Search map area or destination"
          className="w-full py-2.5 pr-2 text-xs font-semibold text-[#582F0E] placeholder:text-[#837560]/70 bg-transparent focus:outline-none min-h-[42px]"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-2 text-[#837560] hover:text-[#582F0E] transition mr-1 cursor-pointer"
            title="Clear search input"
            aria-label="Clear search input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : activeArea ? (
          <div className="flex items-center gap-1 mr-2 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[#2D6A4F] text-[10px] font-bold shrink-0">
            <span className="truncate max-w-[90px]">{activeArea.name}</span>
            <button
              type="button"
              onClick={onClearActiveArea}
              className="text-[#2D6A4F]/70 hover:text-[#2D6A4F] transition p-0.5 cursor-pointer"
              title="Reset area filter"
              aria-label="Reset area filter"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : null}
      </form>

      {/* Screen Reader Live Region for Result Counts */}
      <div aria-live="polite" className="sr-only">
        {showDropdown
          ? `${flatItems.length} map places and quests found`
          : ''}
      </div>

      {/* Autocomplete Dropdown List */}
      {showDropdown && (
        <div
          role="listbox"
          aria-label="Map search suggestions"
          className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white/98 backdrop-blur-md rounded-2xl border border-[#E3DFD5] shadow-2xl overflow-hidden divide-y divide-[#E3DFD5]/60 max-h-[380px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* A. If user typed a query */}
          {cleanQuery.length >= 2 ? (
            <>
              {/* Section 1: Geographic Area Matches (Wide Search like Bolinao, Alaminos) */}
              {matchedAreas.length > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1.5">
                    <Compass className="w-3 h-3 text-[#FFB703]" />
                    <span>Areas &amp; Municipalities (Wide View)</span>
                  </div>
                  {matchedAreas.map((area) => {
                    const idx = flatItems.findIndex((fi) => fi.id === `area-${area.id}`);
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={area.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectAreaItem(area);
                        }}
                        className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 text-xs group cursor-pointer ${
                          isSelected ? 'bg-emerald-50 ring-1 ring-[#2D6A4F]/40' : 'hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                            isSelected ? 'bg-[#2D6A4F] text-white' : 'bg-[#2D6A4F]/10 text-[#2D6A4F] group-hover:bg-[#2D6A4F] group-hover:text-white'
                          }`}>
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-[#582F0E] truncate group-hover:text-[#2D6A4F] transition">
                              {area.name}
                            </p>
                            <p className="text-[10px] text-[#837560] truncate">{area.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#2D6A4F] shrink-0">
                          {area.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Section 2: Destination Spot Matches */}
              {matchedSpots.length > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#582F0E] flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#2D6A4F]" />
                    <span>Destination Spots</span>
                  </div>
                  {matchedSpots.map((spot) => {
                    const idx = flatItems.findIndex((fi) => fi.id === `spot-${spot.id}`);
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSpotItem(spot);
                        }}
                        className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 text-xs group cursor-pointer ${
                          isSelected ? 'bg-emerald-50 ring-1 ring-[#2D6A4F]/40' : 'hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                            isSelected ? 'bg-[#2D6A4F] text-white' : 'bg-emerald-50 text-[#2D6A4F] group-hover:bg-[#2D6A4F] group-hover:text-white'
                          }`}>
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-[#582F0E] truncate group-hover:text-[#2D6A4F] transition">
                              {spot.name}
                            </p>
                            <p className="text-[10px] text-[#837560] truncate">
                              {spot.municipality} • {spot.category.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-[#582F0E] shrink-0">
                          Spot
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Section 3: Quest Matches */}
              {matchedQuests.length > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#7D5800] flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-[#FFB703]" />
                    <span>Quest Trails</span>
                  </div>
                  {matchedQuests.map((quest) => {
                    const idx = flatItems.findIndex((fi) => fi.id === `quest-${quest.id}`);
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={quest.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectQuestItem(quest);
                        }}
                        className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 text-xs group cursor-pointer ${
                          isSelected ? 'bg-amber-50 ring-1 ring-amber-400' : 'hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                            isSelected ? 'bg-[#FFB703] text-stone-900' : 'bg-amber-50 text-[#7D5800] group-hover:bg-[#FFB703] group-hover:text-stone-900'
                          }`}>
                            <Trophy className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-[#582F0E] truncate group-hover:text-[#2D6A4F] transition">
                              {quest.title}
                            </p>
                            <p className="text-[10px] text-[#837560] truncate">{quest.locationName}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#7D5800] shrink-0">
                          +{quest.rewardPoints} mJDQ
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No matches fallback */}
              {!hasResults && (
                <div className="p-4 text-center space-y-1.5" role="status">
                  <p className="text-xs font-bold text-[#582F0E]">No places or quests found for &ldquo;{query}&rdquo;</p>
                  <p className="text-[11px] text-[#837560]">
                    Try searching for an area (e.g. Bolinao, Alaminos), destination spot, or quest trail.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* B. Quick popular areas when input is empty & focused */
            <div className="p-2.5 space-y-1.5">
              <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#837560] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#FFB703]" />
                <span>Explore Wide Geographic Areas</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {popularAreas.map((area, areaIdx) => {
                  const isSelected = selectedIndex === areaIdx;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectAreaItem(area);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between gap-2 text-xs group cursor-pointer ${
                        isSelected ? 'bg-emerald-50 ring-1 ring-[#2D6A4F]/40' : 'hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#2D6A4F] text-white' : 'bg-[#2D6A4F]/10 text-[#2D6A4F]'
                        }`}>
                          <MapPin className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#582F0E] truncate group-hover:text-[#2D6A4F] transition">
                            {area.name}
                          </p>
                          <p className="text-[10px] text-[#837560] truncate">{area.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-[#837560] group-hover:text-[#2D6A4F] shrink-0">
                        View Area &rarr;
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
