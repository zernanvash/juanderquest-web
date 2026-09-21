import { pageMetadata } from '@/lib/page-metadata';

export const metadata = { ...pageMetadata('JuanChoice', 'Explore live JuanChoice community rounds.', '/choice'), robots: { index: false, follow: false } };

export default function CommunityChoiceLeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
