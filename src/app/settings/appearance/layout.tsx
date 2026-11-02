import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Appearance · Settings',
  'Preview and equip cosmetics you own.',
  '/settings/appearance'
);

export default function AppearanceSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
