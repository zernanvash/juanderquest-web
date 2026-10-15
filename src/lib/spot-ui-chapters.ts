/**
 * Spot UI Chapters
 *
 * Provides chapter navigation anchors and scroll-spy utilities for the destination story:
 * - Overview (#spot-info)
 * - About (#spot-about)
 * - Comments (#spot-comments)
 * - Venue & Map (#spot-venue)
 * - Nearby (#spot-alternatives, optional)
 */

export interface SpotChapter {
  id: string;
  label: string;
}

export const BASE_SPOT_CHAPTERS: SpotChapter[] = [
  { id: 'spot-info', label: 'Overview' },
  { id: 'spot-about', label: 'About' },
  { id: 'spot-comments', label: 'Comments' },
  { id: 'spot-venue', label: 'Venue & Map' },
];

export const ALTERNATIVES_CHAPTER: SpotChapter = {
  id: 'spot-alternatives',
  label: 'Nearby',
};

export function getAvailableChapters(hasAlternatives: boolean): SpotChapter[] {
  if (hasAlternatives) {
    return [...BASE_SPOT_CHAPTERS, ALTERNATIVES_CHAPTER];
  }
  return [...BASE_SPOT_CHAPTERS];
}

export function scrollToChapter(chapterId: string): void {
  if (typeof document === 'undefined') return;
  const target = document.getElementById(chapterId);
  if (!target) return;

  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  target.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}
