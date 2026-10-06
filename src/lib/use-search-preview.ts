'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  isProcessableQuery,
  normalizeSearchQuery,
  fetchSearchPreview,
  SearchGroup,
  PlaceResultItem,
  PersonResultItem,
  QuestResultItem,
} from '@/lib/search';
import { appRoutes } from '@/lib/routes';
import { travelerProfileHref } from '@/lib/preview';
import { FlatItem } from '@/components/SearchSuggestionsDropdown';
import { findMatchingAreas, AreaDefinition, areaToHref } from '@/lib/areas';
import { fetchOsmAreas } from '@/lib/osm';

export function useSearchPreview(query: string, isOpen: boolean) {
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [osmAreas, setOsmAreas] = useState<AreaDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const matchedAreas: AreaDefinition[] = useMemo(() => {
    if (!isOpen) return [];
    const normalized = normalizeSearchQuery(query);
    if (!isProcessableQuery(normalized)) return [];

    const local = findMatchingAreas(normalized).slice(0, 3);
    const localNames = new Set(local.map((a) => a.name.toLowerCase()));

    // Merge live OpenStreetMap territories not already matched by local catalog
    const additionalOsm = osmAreas
      .filter((osm) => !localNames.has(osm.name.toLowerCase()) && !localNames.has(osm.id.toLowerCase()))
      .slice(0, 3);

    return [...local, ...additionalOsm];
  }, [query, isOpen, osmAreas]);

  const executeSearch = useCallback(async (rawTerm: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const normalized = normalizeSearchQuery(rawTerm);
    if (!isProcessableQuery(normalized)) {
      setGroups([]);
      setOsmAreas([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const [searchRes, liveOsm] = await Promise.all([
        fetchSearchPreview(normalized, 'all', controller.signal),
        normalized.length >= 3
          ? fetchOsmAreas(normalized, controller.signal)
          : Promise.resolve([]),
      ]);
      if (!controller.signal.aborted) {
        setGroups(searchRes.data.groups || []);
        setOsmAreas(liveOsm);
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Could not complete search.';
      setError(msg);
      setGroups([]);
      setOsmAreas([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setGroups([]);
      setOsmAreas([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const normalized = normalizeSearchQuery(query);
    if (!isProcessableQuery(normalized)) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setGroups([]);
      setOsmAreas([]);
      setLoading(false);
      setError(null);
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
  }, [query, isOpen, executeSearch]);

  const flatItems: FlatItem[] = useMemo(() => {
    const list: FlatItem[] = [];
    for (const area of matchedAreas) {
      list.push({ groupType: 'areas', item: area, href: areaToHref(area) });
    }
    for (const group of groups) {
      for (const item of group.items) {
        if (group.type === 'places') {
          const place = item as PlaceResultItem;
          list.push({ groupType: 'places', item: place, href: appRoutes.spot(place.id) });
        } else if (group.type === 'people') {
          const person = item as PersonResultItem;
          list.push({ groupType: 'people', item: person, href: travelerProfileHref(person.id) });
        } else if (group.type === 'quests') {
          const quest = item as QuestResultItem;
          list.push({ groupType: 'quests', item: quest, href: appRoutes.quest(quest.id) });
        }
      }
    }
    return list;
  }, [matchedAreas, groups]);

  return {
    groups,
    matchedAreas,
    loading,
    error,
    flatItems,
    executeSearch,
  };
}
