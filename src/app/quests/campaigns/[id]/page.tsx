import { notFound, redirect } from 'next/navigation';
import { appRoutes, isResourceId } from '@/lib/routes';

export default async function LegacyCampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isResourceId(id)) notFound();
  // Unverified referral query strings are intentionally not preserved.
  redirect(appRoutes.campaign(id));
}
