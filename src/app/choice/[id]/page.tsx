import type { Metadata } from 'next';
import { JuanChoiceExperience } from '@/components/JuanChoiceExperience';
import { publicJuanChoiceMetadata } from '@/lib/juanchoice-metadata';
import { notFound } from 'next/navigation';
import { isResourceId } from '@/lib/routes';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return publicJuanChoiceMetadata(id);
}
export default async function ChoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isResourceId(id)) notFound();
  return <JuanChoiceExperience campaignId={id} />;
}
