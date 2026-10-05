import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Destinations | JuanDerQuest',
    template: '%s | JuanDerQuest',
  },
  description: 'Discover and contribute community-reviewed destinations. Current pilot submissions focus on Pangasinan.',
};

export default function SpotsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
