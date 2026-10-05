import { notFound } from 'next/navigation';
import CampaignDetailClient from '@/components/CampaignDetailClient';
import { isResourceId } from '@/lib/routes';
import { getServerApiBaseUrl } from '@/lib/search';

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isResourceId(id)) notFound();
  const response = await fetch(`${getServerApiBaseUrl()}/campaigns/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`Campaign lookup failed (HTTP ${response.status})`);
  return <CampaignDetailClient params={Promise.resolve({ id })} />;
}
