const CATEGORY_LABELS: Record<string, string> = {
  eat_drink: 'Food & drink',
  nature_outdoors: 'Nature',
  culture_heritage: 'Culture & heritage',
  activities_wellness: 'Activities',
  shopping_local: 'Local shops',
  stay: 'Places to stay',
};

/** Human label for a destination/quest category id (e.g. "nature_outdoors" → "Nature"). */
export function categoryLabel(category: string | null | undefined): string {
  if (!category) return 'Destination';
  const known = CATEGORY_LABELS[category];
  if (known) return known;
  const words = category.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
