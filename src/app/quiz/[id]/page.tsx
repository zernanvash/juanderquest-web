import { redirect } from 'next/navigation';

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

// Old quiz links open the quiz dialog on the Dashboard.
export default async function QuizDeepLinkRoute({ params }: QuizPageProps) {
  const { id } = await params;
  redirect(`/dashboard?quiz=${encodeURIComponent(id)}`);
}
