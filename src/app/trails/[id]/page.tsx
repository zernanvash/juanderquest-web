import { TrailDetailClient } from './TrailDetailClient';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = {
  ...pageMetadata('Trail details', 'Unlock a route to reveal destination stops, local narration, and verified check-in progress.', '/trails'),
  robots: { index: false, follow: false },
};

export default function TrailDetailPage() { return <TrailDetailClient />; }
