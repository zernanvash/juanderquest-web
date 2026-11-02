import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Nametag Badges · Settings',
  'Customize which badges appear on your explorer nametag.',
  '/settings/badges'
);

export default function BadgesSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
