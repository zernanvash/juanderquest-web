import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Traveler Passport',
  description: 'View a JuanDerQuest traveler’s public, privacy-safe tourism passport and community achievements.',
  robots: { index: false, follow: true },
};

export default function PublicTravelerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
