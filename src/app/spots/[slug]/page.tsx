import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { SpotDetailClient } from './SpotDetailClient';
import { appRoutes, isResourceId } from '@/lib/routes';
import { getServerApiBaseUrl } from '@/lib/search';

interface Props {
  params: Promise<{ slug: string }>;
}

interface PublicSpot {
  id: string;
  slug: string;
  name: string;
  description: string;
  municipality: string;
  category?: string;
  gps_lat?: number;
  gps_lng?: number;
  image_url?: string | null;
  is_test?: boolean;
}

export const dynamic = 'force-dynamic';

const loadPublicSpot = cache(async (identifier: string): Promise<PublicSpot | null> => {
  if (!isResourceId(identifier)) return null;
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/spots/${encodeURIComponent(identifier)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const body = await response.json();
    const spot = body?.data as PublicSpot | undefined;
    if (!body?.success || !spot?.id || !spot?.slug || !isResourceId(spot.id)) {
      return null;
    }
    return spot;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isResourceId(slug)) notFound();
  const spot = await loadPublicSpot(slug);
  if (!spot) return {
    title: { absolute: 'Destination preview | JuanDerQuest' },
    description: 'Open this destination in JuanDerQuest.',
    robots: { index: false, follow: false },
  };
  const url = appRoutes.spot(spot.id);
  const title = `${spot.name} | JuanDerQuest`;
  const description = spot.description || `Explore ${spot.name} in ${spot.municipality}.`;
  return {
    // The root layout's title template would append the brand a second time.
    title: { absolute: title },
    description,
    robots: spot.is_test ? { index: false, follow: false } : undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'JuanDerQuest',
      images: spot.image_url ? [{ url: spot.image_url, alt: spot.name }] : undefined,
    },
  };
}

export default async function SpotDetailPage({ params }: Props) {
  const { slug } = await params;
  if (!isResourceId(slug)) notFound();
  const spot = await loadPublicSpot(slug);
  if (spot && slug !== spot.id) permanentRedirect(appRoutes.spot(spot.id));

  const jsonLd = spot
    ? {
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        name: spot.name,
        description: spot.description,
        address: {
          '@type': 'PostalAddress',
          addressLocality: spot.municipality,
          addressRegion: 'Pangasinan',
          addressCountry: 'PH',
        },
        geo:
          typeof spot.gps_lat === 'number' && typeof spot.gps_lng === 'number'
            ? {
                '@type': 'GeoCoordinates',
                latitude: spot.gps_lat,
                longitude: spot.gps_lng,
              }
            : undefined,
        image: spot.image_url || undefined,
      }
    : null;

  // The API session cookie is host-scoped to api.juanderquest.app. Browser lookup
  // must remain possible for wallet-only alpha records invisible to this server.
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <SpotDetailClient slug={spot?.id ?? slug} />
    </>
  );
}
