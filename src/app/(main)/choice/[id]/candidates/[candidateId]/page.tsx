import type { Metadata } from 'next';
import { JuanChoiceExperience } from '@/components/JuanChoiceExperience';
import { publicJuanChoiceMetadata } from '@/lib/juanchoice-metadata';
import { notFound } from 'next/navigation';
import { isResourceId } from '@/lib/routes';

export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string;candidateId:string}>}):Promise<Metadata>{
  const {id,candidateId}=await params;
  return publicJuanChoiceMetadata(id,candidateId);
}
export default async function CandidatePage({params}:{params:Promise<{id:string;candidateId:string}>}){
  const {id,candidateId}=await params;
  if (!isResourceId(candidateId)) notFound();
  if (!isResourceId(id)) notFound();
  return <JuanChoiceExperience campaignId={id} focusCandidateId={candidateId}/>;
}
