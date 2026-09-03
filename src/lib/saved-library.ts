'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type SavedKind = 'spots' | 'quests';

export interface SavedLibrarySnapshot {
  spots: string[];
  quests: string[];
}

const STORAGE_KEY = 'jdq_saved_library_v1';
const CHANGE_EVENT = 'jdq:saved-library-change';
const EMPTY_LIBRARY: SavedLibrarySnapshot = { spots: [], quests: [] };

export function normalizeSavedLibrary(value: unknown): SavedLibrarySnapshot {
  if (!value || typeof value !== 'object') return EMPTY_LIBRARY;
  const candidate = value as Partial<SavedLibrarySnapshot>;
  return {
    spots: Array.isArray(candidate.spots) ? candidate.spots.filter((id): id is string => typeof id === 'string') : [],
    quests: Array.isArray(candidate.quests) ? candidate.quests.filter((id): id is string => typeof id === 'string') : [],
  };
}

export function readSavedLibrary(): SavedLibrarySnapshot {
  if (typeof window === 'undefined') return EMPTY_LIBRARY;
  try {
    return normalizeSavedLibrary(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return EMPTY_LIBRARY;
  }
}

function writeSavedLibrary(next: SavedLibrarySnapshot) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
}

export function toggleSavedSnapshot(current: SavedLibrarySnapshot, kind: SavedKind, id: string): SavedLibrarySnapshot {
  const ids = new Set(current[kind]);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  return { ...current, [kind]: [...ids] };
}

export function useSavedLibrary() {
  const [library, setLibrary] = useState<SavedLibrarySnapshot>(EMPTY_LIBRARY);

  useEffect(() => {
    const sync = () => setLibrary(readSavedLibrary());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const toggle = useCallback((kind: SavedKind, id: string) => {
    const current = readSavedLibrary();
    const next = toggleSavedSnapshot(current, kind, id);
    writeSavedLibrary(next);
    return next[kind].includes(id);
  }, []);

  const isSaved = useCallback((kind: SavedKind, id: string) => library[kind].includes(id), [library]);

  return useMemo(() => ({ library, toggle, isSaved }), [library, toggle, isSaved]);
}
