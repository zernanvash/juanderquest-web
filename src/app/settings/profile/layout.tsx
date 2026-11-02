import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Profile · Settings',
  'Manage your explorer profile, bio, handle, and social identity.',
  '/settings/profile'
);

export default function ProfileSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
