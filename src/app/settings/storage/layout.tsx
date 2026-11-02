import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Storage & Session · Settings',
  'Manage client-side cache and authentication session.',
  '/settings/storage'
);

export default function StorageSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
