import { redirect, notFound } from 'next/navigation';
import { isResourceId } from '@/lib/routes';

export default async function PublicTravelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isResourceId(id)) notFound();
  redirect(`/profile/${encodeURIComponent(id)}`);
}
