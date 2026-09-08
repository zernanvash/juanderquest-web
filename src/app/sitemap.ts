import type { MetadataRoute } from 'next';
import { PUBLISHED_DESTINATIONS } from '@/lib/destinations';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://jdq.zernanvash.dev';
  const now = new Date();

  // Core public discovery routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/map`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/quests`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/saved`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/campaigns`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/community-choice/leaderboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/vote`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Dynamic destination routes: enumerate published verified spots, excluding QA synthetic records
  const spotRoutes: MetadataRoute.Sitemap = PUBLISHED_DESTINATIONS.map((spot) => ({
    url: `${base}/spots/${spot.slug}`,
    lastModified: spot.updatedAt ? new Date(spot.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  return [...staticRoutes, ...spotRoutes];
}
