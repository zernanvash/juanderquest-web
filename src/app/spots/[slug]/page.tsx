import type { Metadata } from 'next';
import { SpotDetailClient } from './SpotDetailClient';
import { getPublishedDestination, isSyntheticSpot, getPublishedSlugs } from '@/lib/destinations';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getPublishedSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const destination = getPublishedDestination(slug);

  // If this is a synthetic or QA test fixture, mark as noindex/nofollow
  if (isSyntheticSpot(slug)) {
    return {
      title: `${slug.replace(/[-_]/g, ' ')} (QA Test Preview)`,
      description: 'Development and QA test preview on JuanDerQuest. This record is not an indexed destination.',
      robots: {
        index: false,
        follow: false,
      },
      alternates: {
        canonical: `/spots/${slug}`,
      },
    };
  }

  if (destination) {
    const title = `${destination.name} — ${destination.municipality}, Pangasinan`;
    const description = destination.description;
    const url = `/spots/${slug}`;

    return {
      title,
      description,
      alternates: {
        canonical: url,
      },
      openGraph: {
        title: `${destination.name} | JuanDerQuest`,
        description,
        url,
        siteName: 'JuanDerQuest',
        images: destination.imageUrl
          ? [
              {
                url: destination.imageUrl,
                alt: `${destination.name} in ${destination.municipality}, Pangasinan`,
              },
            ]
          : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${destination.name} | JuanDerQuest`,
        description,
        images: destination.imageUrl ? [destination.imageUrl] : undefined,
      },
    };
  }

  // Graceful fallback for any newly added community destination
  const formattedTitle = slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    title: `${formattedTitle} — Pangasinan Destination`,
    description: `Discover ${formattedTitle} on JuanDerQuest — community destinations, verified landmarks, and turn-by-turn navigation across Pangasinan.`,
    alternates: {
      canonical: `/spots/${slug}`,
    },
  };
}

export default async function SpotDetailPage({ params }: Props) {
  const { slug } = await params;
  return <SpotDetailClient slug={slug} />;
}
