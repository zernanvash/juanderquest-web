import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Map & Audio · Settings',
  'Configure your navigation raster layer and auditory feedback.',
  '/settings/map-audio'
);

export default function MapAudioSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
