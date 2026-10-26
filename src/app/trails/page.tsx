import { TrailsClient } from './TrailsClient';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = {
  ...pageMetadata('Discover Trails', 'Explore curated Pangasinan routes, unlock trails, and check in at real destinations.', '/trails'),
  robots: { index: false, follow: false },
};

export default function TrailsPage() { return <TrailsClient />; }
