import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/page-metadata';
import { DashboardClient } from './DashboardClient';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ quiz?: string | string[] }> }): Promise<Metadata> {
  const params = await searchParams;
  if (params.quiz) return { title: 'Cultural quiz' };
  return pageMetadata(
    'Explorer Dashboard',
    'Your personal Pangasinan adventure hub: personalized recommendations, gamified explorer progression, voting rounds, cultural quizzes, and recent activities.',
    '/dashboard'
  );
}

export default function DashboardPage() {
  return <DashboardClient />;
}
