import { pageMetadata } from '@/lib/page-metadata';
import { IslandAppLayout } from '@/components/IslandAppLayout';

export const metadata = pageMetadata('Traveler Profile', 'Manage your JuanDerQuest traveler profile, progress, and saved experiences.', '/profile');

export default function Layout({ children }: { children: React.ReactNode }) {
  return <IslandAppLayout>{children}</IslandAppLayout>;
}
