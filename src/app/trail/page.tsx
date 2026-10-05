import { Route } from 'lucide-react';
import { ComingSoonFeature } from '@/components/ComingSoonFeature';
import { Navigation } from '@/components/Navigation';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = {
  ...pageMetadata(
    'The Trail — Coming Soon',
    'The Trail is a planned route-aware trip planner with personalized stops and local discoveries, beginning with a Pangasinan pilot. Route planning is not available yet.',
    '/trail',
  ),
  robots: { index: false, follow: false },
};

const highlights = [
  {
    title: 'Make the journey yours',
    description: 'Choose a starting point and destination, then explore planned route-aware stops that fit your interests.',
  },
  {
    title: 'Discover what’s along the way',
    description: 'Find local places, regional specialties, and merchants along your route without losing sight of travel time.',
  },
  {
    title: 'Find another great path',
    description: 'See alternative trail ideas when a popular stop is crowded. Trail-wide trends will follow real traveler feedback.',
  },
] as const;

export default function TrailPage() {
  return (
    <Navigation>
      <ComingSoonFeature
        eyebrow="A better way to explore"
        title="The Trail"
        description="From where you are—or a starting point you choose—to where you want to go. We’re shaping an AI-assisted trip planner that suggests worthwhile stops along real routes, with room for your interests and local finds."
        icon={Route}
        highlights={highlights}
        availabilityNote="The Trail is in development. No route suggestions, AI itinerary, merchant availability, or trail ratings are live on this page yet."
        primaryLink={{ href: '/', label: 'Back to home' }}
      />
    </Navigation>
  );
}
