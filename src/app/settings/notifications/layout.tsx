import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Notifications · Settings',
  'Control which events trigger in-app updates and alert badges.',
  '/settings/notifications'
);

export default function NotificationsSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
