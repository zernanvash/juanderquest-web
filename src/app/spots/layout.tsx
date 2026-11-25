import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Destinations | JuanDerQuest',
    template: '%s | JuanDerQuest',
  },
  description: 'Discover and contribute community destinations. Current submissions cover the Ilocos Region.',
};

export default function SpotsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
