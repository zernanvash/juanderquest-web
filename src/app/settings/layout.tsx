import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Explorer Settings',
  'Manage your traveler profile, notification preferences, and application settings.',
  '/settings'
);

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
