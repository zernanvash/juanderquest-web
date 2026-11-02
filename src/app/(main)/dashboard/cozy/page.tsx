import { pageMetadata } from '@/lib/page-metadata';
import { CozyDashboardClient } from './CozyDashboardClient';

export const metadata = pageMetadata(
  'JuanDer Without Limits - Island Explorer Hub',
  'An Animal Crossing-inspired cozy expedition hub for JuanDer explorers: live location mini map, pre-registered events calendar, quest progress, user badges, and daily eco-tips.',
  '/dashboard/cozy'
);

export default function CozyDashboardPage() {
  return <CozyDashboardClient />;
}
