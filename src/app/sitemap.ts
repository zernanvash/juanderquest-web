import type { MetadataRoute } from 'next';
import { appRoutes, isResourceId } from '@/lib/routes';
import { getServerApiBaseUrl } from '@/lib/search';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const isPresentation = process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE === 'true' ||
    process.env.NEXT_DIST_DIR === '.next-presentation';
  if (isPresentation) {
    return [];
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://juanderquest.app';
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
    { url: `${base}/choice`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/vote`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // The public API is the source of truth; QA and unpublished records are omitted there.
  let spotRoutes: MetadataRoute.Sitemap = [];
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/spots`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (response.ok) {
      const body = await response.json();
      if (body?.success && Array.isArray(body.data)) {
        spotRoutes = body.data.filter((spot: { id?: string; is_test?: boolean }) =>
          typeof spot.id === 'string' && isResourceId(spot.id) && !spot.is_test
        ).map((spot: { id: string; updated_at?: string }) => ({
          url: `${base}${appRoutes.spot(spot.id)}`,
          lastModified: spot.updated_at ? new Date(spot.updated_at) : now,
          changeFrequency: 'weekly' as const,
          priority: 0.85,
        }));
      }
    }
  } catch {
    // Keep the static sitemap available during a backend outage.
  }

  return [...staticRoutes, ...spotRoutes];
}
