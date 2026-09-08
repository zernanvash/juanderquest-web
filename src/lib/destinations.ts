/**
 * JuanDerQuest — Published Pangasinan Destinations Registry
 * 
 * Authoritative registry of verified, published destinations across Pangasinan.
 * Used for dynamic Server Component metadata generation, canonical URL verification,
 * and sitemap enumeration while cleanly excluding synthetic/QA test records.
 */

export interface PublishedDestination {
  slug: string;
  name: string;
  municipality: string;
  category: string;
  subcategory: string;
  description: string;
  imageUrl: string;
  address: string;
  updatedAt: string;
}

export const PUBLISHED_DESTINATIONS: PublishedDestination[] = [
  {
    slug: 'hundred-islands-national-park',
    name: 'Hundred Islands National Park',
    municipality: 'Alaminos City',
    category: 'nature_outdoors',
    subcategory: 'park',
    description: 'Island-hopping, panoramic viewpoints, swimming, and family adventures across the iconic Alaminos archipelago.',
    imageUrl: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
    address: 'Lucap, Alaminos City, Pangasinan',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    slug: 'patar-white-beach',
    name: 'Patar White Beach',
    municipality: 'Bolinao',
    category: 'nature_outdoors',
    subcategory: 'beach',
    description: 'A broad public beach renowned for golden sunset vistas, natural limestone rock formations, and clear coastal waters.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    address: 'Patar, Bolinao, Pangasinan',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    slug: 'bolinao-falls-1',
    name: 'Bolinao Falls 1',
    municipality: 'Bolinao',
    category: 'nature_outdoors',
    subcategory: 'waterfall',
    description: 'A serene forest waterfall and natural freshwater swimming destination popular with adventurous travelers.',
    imageUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
    address: 'Samang Norte, Bolinao, Pangasinan',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    slug: 'minor-basilica-of-manaoag',
    name: 'Minor Basilica of Our Lady of Manaoag',
    municipality: 'Manaoag',
    category: 'culture_heritage',
    subcategory: 'church',
    description: 'A historic pilgrimage landmark and heritage sanctuary in central Pangasinan visited by pilgrims nationwide.',
    imageUrl: 'https://images.unsplash.com/photo-1548625361-16a9a087192a?auto=format&fit=crop&w=1200&q=80',
    address: 'Milo St, Manaoag, Pangasinan',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    slug: 'dagupan-bangus-market',
    name: 'Dagupan Bangus Market',
    municipality: 'Dagupan City',
    category: 'eat_drink',
    subcategory: 'street_food',
    description: 'Discover fresh milkfish (bangus), local seafood culinary stalls, and vibrant market culture in downtown Dagupan.',
    imageUrl: '',
    address: 'Downtown Dagupan City, Pangasinan',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    slug: 'lingayen-baywalk',
    name: 'Lingayen Baywalk',
    municipality: 'Lingayen',
    category: 'activities_wellness',
    subcategory: 'running_spot',
    description: 'An open beachfront promenade for sunset walks, cycling, running, and peaceful family recreation along Lingayen Gulf.',
    imageUrl: '',
    address: 'Capitol Beachfront, Lingayen, Pangasinan',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    slug: 'third-wave-cafe-dagupan',
    name: 'Third Wave Café Dagupan',
    municipality: 'Dagupan City',
    category: 'eat_drink',
    subcategory: 'cafe',
    description: 'A cozy artisan coffee shop suited for meetups, remote work, and local specialty brews in Dagupan City.',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    address: 'Arellano Street, Dagupan City, Pangasinan',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    slug: 'pangasinan-provincial-capitol',
    name: 'Pangasinan Provincial Capitol',
    municipality: 'Lingayen',
    category: 'culture_heritage',
    subcategory: 'heritage_site',
    description: 'A landmark neoclassical capitol building surrounded by manicured historical park grounds and immediate gulf access.',
    imageUrl: '',
    address: 'Capitol Complex, Lingayen, Pangasinan',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

/**
 * Identify QA synthetic, mock, or test spot slugs that should NOT be indexed by search engines.
 */
export function isSyntheticSpot(slug: string): boolean {
  const normalized = slug.toLowerCase();
  return (
    normalized.startsWith('test-') ||
    normalized.startsWith('qa-') ||
    normalized.startsWith('mock-') ||
    normalized.startsWith('fixture-') ||
    normalized.startsWith('demo-') ||
    normalized.includes('synthetic') ||
    normalized.includes('-test') ||
    normalized === 'test'
  );
}

/**
 * Lookup published destination by slug.
 */
export function getPublishedDestination(slug: string): PublishedDestination | undefined {
  return PUBLISHED_DESTINATIONS.find((d) => d.slug === slug);
}

/**
 * Return all published slugs for SSG / sitemap.
 */
export function getPublishedSlugs(): string[] {
  return PUBLISHED_DESTINATIONS.map((d) => d.slug);
}
