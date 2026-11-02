import { pageMetadata } from '@/lib/page-metadata';
import { CozyDashboardClient } from './cozy/CozyDashboardClient';

export const metadata = pageMetadata(
  'JuanDer Without Limits - Island Explorer Hub',
  'Your personal Pangasinan adventure hub: live GPS mini-map, pre-registered events calendar, quest progress, community spotlight, merchant perks, and daily eco-tips.',
  '/dashboard'
);

export default function DashboardPage() {
  return <CozyDashboardClient />;
}
