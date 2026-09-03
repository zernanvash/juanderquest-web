import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Community Choice Leaderboard', 'See the destinations recognized by JuanDerQuest community participation each month.', '/community-choice/leaderboard');

export default function CommunityChoiceLeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
