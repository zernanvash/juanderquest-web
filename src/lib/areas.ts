/**
 * Geographic Area Catalog for JuanDerQuest
 * Supports Google Maps-style area/region queries (e.g. "Pangasinan", "Bolinao", "Philippines")
 * to display whole geographic zones on the map without pinning an individual spot.
 */

export interface AreaDefinition {
  id: string;
  name: string;
  type: 'country' | 'region' | 'province' | 'city' | 'municipality';
  subtitle: string;
  center: [number, number];
  zoom: number;
  keywords: string[];
}

export const KNOWN_AREAS: AreaDefinition[] = [
  {
    id: 'pangasinan',
    name: 'Pangasinan',
    type: 'province',
    subtitle: 'Province in Ilocos Region (Region I), Philippines',
    center: [16.03, 120.33],
    zoom: 10,
    keywords: ['pangasinan', 'pangasinan province', 'pang', 'pangasinan tourism'],
  },
  {
    id: 'philippines',
    name: 'Philippines',
    type: 'country',
    subtitle: 'Country in Southeast Asia • Philippine Archipelago',
    center: [15.89, 120.30],
    zoom: 7,
    keywords: ['philippines', 'pilipinas', 'ph', 'philippine', 'archipelago'],
  },
  {
    id: 'luzon',
    name: 'Luzon',
    type: 'region',
    subtitle: 'Main island group of the Philippines',
    center: [16.20, 120.50],
    zoom: 8,
    keywords: ['luzon', 'northern luzon', 'central luzon'],
  },
  {
    id: 'alaminos',
    name: 'Alaminos City',
    type: 'city',
    subtitle: 'City in Western Pangasinan • Home of Hundred Islands',
    center: [16.155, 119.980],
    zoom: 12,
    keywords: ['alaminos', 'alaminos city'],
  },
  {
    id: 'bolinao',
    name: 'Bolinao',
    type: 'municipality',
    subtitle: 'Coastal municipality in Western Pangasinan • Beaches & Waterfalls',
    center: [16.330, 119.850],
    zoom: 12,
    keywords: ['bolinao'],
  },
  {
    id: 'dagupan',
    name: 'Dagupan City',
    type: 'city',
    subtitle: 'Independent commercial city in Central Pangasinan • Bangus Capital',
    center: [16.043, 120.335],
    zoom: 13,
    keywords: ['dagupan', 'dagupan city'],
  },
  {
    id: 'lingayen',
    name: 'Lingayen',
    type: 'municipality',
    subtitle: 'Provincial Capital of Pangasinan • Capitol Complex & Baywalk',
    center: [16.022, 120.232],
    zoom: 13,
    keywords: ['lingayen'],
  },
  {
    id: 'manaoag',
    name: 'Manaoag',
    type: 'municipality',
    subtitle: 'Heritage pilgrimage municipality in Eastern Pangasinan',
    center: [16.044, 120.485],
    zoom: 13,
    keywords: ['manaoag'],
  },
  {
    id: 'dasol',
    name: 'Dasol',
    type: 'municipality',
    subtitle: 'Coastal municipality in Western Pangasinan • Tambobong & Salt Fields',
    center: [15.908, 119.789],
    zoom: 12,
    keywords: ['dasol'],
  },
  {
    id: 'san-fabian',
    name: 'San Fabian',
    type: 'municipality',
    subtitle: 'Coastal municipality in Pangasinan • Lingayen Gulf Beachfront',
    center: [16.120, 120.402],
    zoom: 13,
    keywords: ['san fabian', 'sanfabian'],
  },
  {
    id: 'bani',
    name: 'Bani',
    type: 'municipality',
    subtitle: 'Municipality in Western Pangasinan • Ecotourism & Watermelons',
    center: [16.185, 119.865],
    zoom: 12,
    keywords: ['bani'],
  },
  {
    id: 'sual',
    name: 'Sual',
    type: 'municipality',
    subtitle: 'Port municipality in Western Pangasinan • Coves & Deep Harbors',
    center: [16.115, 120.090],
    zoom: 13,
    keywords: ['sual'],
  },
  {
    id: 'urdaneta',
    name: 'Urdaneta City',
    type: 'city',
    subtitle: 'Commercial & Transport crossroads in Eastern Pangasinan',
    center: [15.976, 120.571],
    zoom: 13,
    keywords: ['urdaneta', 'urdaneta city'],
  },
  {
    id: 'rosales',
    name: 'Rosales',
    type: 'municipality',
    subtitle: 'Gateway municipality in Southeastern Pangasinan',
    center: [15.892, 120.633],
    zoom: 13,
    keywords: ['rosales'],
  },
  {
    id: 'tayug',
    name: 'Tayug',
    type: 'municipality',
    subtitle: 'Municipality in Eastern Pangasinan • Sunflower Ecofarm',
    center: [16.027, 120.745],
    zoom: 13,
    keywords: ['tayug'],
  },
];

/**
 * Searches areas matching a given string query.
 */
export function findMatchingAreas(query: string): AreaDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  return KNOWN_AREAS.filter((area) => {
    if (area.name.toLowerCase().includes(q)) return true;
    if (area.keywords.some((kw) => kw.includes(q) || q.includes(kw))) return true;
    return false;
  });
}

/**
 * Finds a single area definition matching by ID, exact name, or primary keyword.
 */
export function findAreaByIdOrName(query: string): AreaDefinition | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  return (
    KNOWN_AREAS.find((area) => area.id.toLowerCase() === q) ||
    KNOWN_AREAS.find((area) => area.name.toLowerCase() === q) ||
    KNOWN_AREAS.find((area) => area.keywords.some((kw) => kw === q)) ||
    KNOWN_AREAS.find(
      (area) =>
        area.name.toLowerCase().includes(q) ||
        area.keywords.some((kw) => kw.includes(q) || q.includes(kw))
    )
  );
}
