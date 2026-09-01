import type { Metadata } from 'next';
export function pageMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: { canonical: path }, openGraph: { title, description, url: path, images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${title} on JuanDerQuest` }] }, twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image'] } };
}
