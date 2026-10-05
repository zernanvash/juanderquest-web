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

export function useSearchPreview(query: string, isOpen: boolean) {
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = useCallback(async (rawTerm: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const normalized = normalizeSearchQuery(rawTerm);
    if (!isProcessableQuery(normalized)) {
      setGroups([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSearchPreview(normalized, 'all', controller.signal);
      if (!controller.signal.aborted) {
        setGroups(response.data.groups || []);
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
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setGroups([]);
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
  }, [groups]);

  return {
    groups,
    loading,
    error,
    flatItems,
    executeSearch,
  };
}
