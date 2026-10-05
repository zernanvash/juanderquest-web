import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Saved Places and Quests', 'View your saved destinations and quest trails in your private travel collection.', '/saved');

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
