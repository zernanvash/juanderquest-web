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
  image_url?: string | null;
  is_test?: boolean;
}

export const dynamic = 'force-dynamic';

const loadPublicSpot = cache(async (identifier: string): Promise<PublicSpot | null> => {
  if (!isResourceId(identifier)) return null;
  const response = await fetch(`${getServerApiBaseUrl()}/spots/${encodeURIComponent(identifier)}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Destination lookup failed (HTTP ${response.status})`);
  const body = await response.json();
  const spot = body?.data as PublicSpot | undefined;
  if (!body?.success || !spot?.id || !spot?.slug || !isResourceId(spot.id)) {
    throw new Error('Destination lookup returned an invalid response');
  }
  return spot;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isResourceId(slug)) notFound();
  const spot = await loadPublicSpot(slug);
  if (!spot) return {
    title: 'Destination preview | JuanDerQuest',
    description: 'Open this destination in JuanDerQuest.',
    robots: { index: false, follow: false },
  };
  const url = appRoutes.spot(spot.id);
  const title = `${spot.name} | JuanDerQuest`;
  const description = spot.description || `Explore ${spot.name} in ${spot.municipality}.`;
  return {
    title,
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
  // The API session cookie is host-scoped to api.juanderquest.app. Browser lookup
  // must remain possible for wallet-only alpha records invisible to this server.
  return <SpotDetailClient slug={spot?.id ?? slug} />;
}
