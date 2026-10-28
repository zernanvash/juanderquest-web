import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Personalize your discoveries',
  'Choose the Pangasinan travel interests that shape your JuanDerQuest recommendations.',
  '/onboarding/interests'
);

export default function OnboardingInterestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
