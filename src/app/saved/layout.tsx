import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Saved Places and Quests', 'View your private collection of saved Pangasinan destinations and quest trails.', '/saved');

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
