'use client';

import React, { useState, useEffect } from 'react';
import { QuizCabinet } from '@/components/quiz/QuizCabinet';
import { fetchQuizDetail, QuizDetail } from '@/lib/quizzes';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface QuizCabinetClientPageProps {
  quizId: string;
}

export function QuizCabinetClientPage({ quizId }: QuizCabinetClientPageProps) {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadQuiz() {
      try {
        const detail = await fetchQuizDetail(quizId);
        if (mounted) {
          if (detail) {
            setQuiz(detail);
          } else {
            setError(`Could not find or load cultural quiz "${quizId}".`);
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Failed to query quiz cabinet.';
          setError(msg);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadQuiz();
    return () => {
      mounted = false;
    };
  }, [quizId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono text-zinc-400">Loading Arcade Cabinet...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h1 className="text-xl font-bold font-serif">Arcade Cabinet Offline</h1>
          <p className="text-sm text-zinc-400">
            {error || `Could not find or load cultural quiz "${quizId}". It may be unpublished or inaccessible.`}
          </p>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Lobby
          </Link>
        </div>
      </div>
    );
  }

  return <QuizCabinet quiz={quiz} />;
}
