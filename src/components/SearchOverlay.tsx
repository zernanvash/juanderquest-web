'use client';

import React from 'react';
import {
  SearchSuggestionsDropdown,
  SearchSuggestionsDropdownProps,
  FlatItem,
} from './SearchSuggestionsDropdown';
import { useSearchPreview } from '@/lib/use-search-preview';

export { SearchSuggestionsDropdown };
export type { SearchSuggestionsDropdownProps, FlatItem };

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  className?: string;
}

/**
 * SearchOverlay compatibility component.
 * Renders the anchored suggestions dropdown without the intrusive modal dialog.
 */
export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  query,
  setQuery,
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
  const { groups, loading, error, flatItems, executeSearch } = useSearchPreview(query, isOpen);

  return (
    <SearchSuggestionsDropdown
      isOpen={isOpen}
      onClose={onClose}
      query={query}
      setQuery={setQuery}
      selectedIndex={selectedIndex}
      setSelectedIndex={setSelectedIndex}
      flatItems={flatItems}
      groups={groups}
      loading={loading}
      error={error}
      onRetry={() => executeSearch(query)}
      className={className}
    />
  );
};
