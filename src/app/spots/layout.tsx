import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Pangasinan Destinations | JuanDerQuest',
    template: '%s | JuanDerQuest',
  },
  description: 'Discover and contribute community-reviewed tourism destinations across Pangasinan.',
};

export default function SpotsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
