import { TrailsClient } from './TrailsClient';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = {
  ...pageMetadata('Discover Trails', 'Explore unlockable Pangasinan routes or build a personal trail around the places and pace you enjoy.', '/trails'),
  robots: { index: false, follow: false },
};

export default function TrailsPage() { return <TrailsClient />; }
