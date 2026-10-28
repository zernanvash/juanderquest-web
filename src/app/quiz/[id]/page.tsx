import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Cultural quiz' };
}

// Old quiz links open the quiz dialog on the Dashboard.
export default async function QuizDeepLinkRoute({ params }: QuizPageProps) {
  const { id } = await params;
  redirect(`/dashboard?quiz=${encodeURIComponent(id)}`);
}
