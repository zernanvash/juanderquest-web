import { redirect } from 'next/navigation';

interface QuizzesPageProps {
  params: Promise<{ id: string }>;
}

// Plaza "aced the quiz" posts link to /quizzes/<id>; quizzes play on the Dashboard.
export default async function QuizzesDeepLinkRoute({ params }: QuizzesPageProps) {
  const { id } = await params;
  redirect(`/dashboard?quiz=${encodeURIComponent(id)}`);
}
