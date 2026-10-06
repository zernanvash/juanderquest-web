'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, MapPin, Compass, Trophy, X, Sparkles, Navigation as NavIcon } from 'lucide-react';
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
  placeholder = 'Search Pangasinan, town, or spot…',
  className = '',
}: MapOmniboxProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
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

  const hasResults =
    matchedAreas.length > 0 || matchedSpots.length > 0 || matchedQuests.length > 0;

  const showDropdown = isFocused && (cleanQuery.length >= 2 || cleanQuery.length === 0);

  const handleSelectAreaItem = useCallback(
    (area: AreaDefinition) => {
      setQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
      onSelectArea(area);
    },
    [onSelectArea]
  );

  const handleSelectSpotItem = useCallback(
    (spot: SpotModel) => {
      setQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
      onSelectDestination('spot', spot);
    },
    [onSelectDestination]
  );

  const handleSelectQuestItem = useCallback(
    (quest: QuestModel) => {
      setQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
      onSelectDestination('quest', quest);
    },
    [onSelectDestination]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanQuery) return;

    // Check if exact or partial match to a known area first (e.g. "Pangasinan")
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

    // Default fallback: search whole Pangasinan province
    const pangasinan = findAreaByIdOrName('pangasinan');
    if (pangasinan) {
      handleSelectAreaItem(pangasinan);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsFocused(false);
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
        <div className="pl-3.5 pr-2 py-2 flex items-center text-[#2D6A4F] pointer-events-none">
          <Search className="w-4 h-4 text-[#2D6A4F]" />
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

      {/* Autocomplete Dropdown List */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white/98 backdrop-blur-md rounded-2xl border border-[#E3DFD5] shadow-2xl overflow-hidden divide-y divide-[#E3DFD5]/60 max-h-[380px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {/* A. If user typed a query */}
          {cleanQuery.length >= 2 ? (
            <>
              {/* Section 1: Geographic Area Matches (Wide Search like Pangasinan, Bolinao) */}
              {matchedAreas.length > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1.5">
                    <Compass className="w-3 h-3 text-[#FFB703]" />
                    <span>Areas &amp; Municipalities (Wide View)</span>
                  </div>
                  {matchedAreas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectAreaItem(area);
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-[#FAF9F5] transition flex items-center justify-between gap-2 text-xs group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center shrink-0 group-hover:bg-[#2D6A4F] group-hover:text-white transition">
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
                  ))}
                </div>
              )}

              {/* Section 2: Destination Spot Matches */}
              {matchedSpots.length > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#582F0E] flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#2D6A4F]" />
                    <span>Destination Spots</span>
                  </div>
                  {matchedSpots.map((spot) => (
                    <button
                      key={spot.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSpotItem(spot);
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-[#FAF9F5] transition flex items-center justify-between gap-2 text-xs group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#2D6A4F] flex items-center justify-center shrink-0 group-hover:bg-[#2D6A4F] group-hover:text-white transition">
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
                  ))}
                </div>
              )}

              {/* Section 3: Quest Matches */}
              {matchedQuests.length > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#7D5800] flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-[#FFB703]" />
                    <span>Quest Trails</span>
                  </div>
                  {matchedQuests.map((quest) => (
                    <button
                      key={quest.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectQuestItem(quest);
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-[#FAF9F5] transition flex items-center justify-between gap-2 text-xs group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-[#7D5800] flex items-center justify-center shrink-0 group-hover:bg-[#FFB703] group-hover:text-stone-900 transition">
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
                  ))}
                </div>
              )}

              {/* No matches fallback */}
              {!hasResults && (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs font-bold text-[#582F0E]">No places found for &ldquo;{query}&rdquo;</p>
                  <p className="text-[11px] text-[#837560]">
                    Press Enter to view the broader Pangasinan province map.
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
                {popularAreas.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectAreaItem(area);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-[#FAF9F5] transition flex items-center justify-between gap-2 text-xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center shrink-0">
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
