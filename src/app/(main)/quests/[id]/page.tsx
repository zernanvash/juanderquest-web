import { notFound } from 'next/navigation';
import QuestDetailClient from '@/components/QuestDetailClient';
import { isResourceId } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export default async function QuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isResourceId(id)) notFound();
  // The API-host session cookie is not visible to the web server; wallet-only
  // alpha quests must be resolved in the browser by the authenticated API.
  return <QuestDetailClient />;
}
