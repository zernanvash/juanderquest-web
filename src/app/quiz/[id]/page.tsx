import React from 'react';
import { QuizCabinetClientPage } from './QuizCabinetClientPage';

export const dynamic = 'force-dynamic';

interface QuizPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuizCabinetRoute({ params }: QuizPageProps) {
  const { id } = await params;
  return <QuizCabinetClientPage quizId={id} />;
}
