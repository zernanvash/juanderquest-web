import { TrailClient } from './TrailClient';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = {
  ...pageMetadata(
    'The Trail — Sovereign Route & Stop Planner',
    'Plan sovereign travel routes across Pangasinan and discover curated cultural & eco-tourism checkpoints along your corridor.',
    '/trail',
  ),
  robots: { index: false, follow: false },
};

export default function TrailPage() {
  return <TrailClient />;
}
