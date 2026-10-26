import React from 'react';
import { CheckCircle2, XCircle, Award, Sparkles, RotateCcw, BookOpen } from 'lucide-react';
import { QuizSubmissionResult } from '@/lib/quizzes';
import Link from 'next/link';

interface ResultsScreenProps {
  quizTitle?: string;
  destinationName: string;
  municipality?: string;
  result: QuizSubmissionResult;
  hostLine: string;
  onPlayAgain: () => void;
}

export function ResultsScreen({
  destinationName,
  result,
  hostLine,
  onPlayAgain,
}: ResultsScreenProps) {
  const passed = result.passed;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Arcade Header Banner */}
      <div
        className={`rounded-2xl border-2 p-6 sm:p-8 text-center relative overflow-hidden backdrop-blur-md shadow-2xl ${
          passed
            ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/60 via-zinc-900/90 to-zinc-950/90 shadow-emerald-950/40'
            : 'border-rose-500/50 bg-gradient-to-b from-rose-950/60 via-zinc-900/90 to-zinc-950/90 shadow-rose-950/40'
        }`}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-4 border-2 shadow-inner bg-zinc-950">
          {passed ? (
            <Award className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-400 animate-bounce" />
          ) : (
            <XCircle className="w-9 h-9 sm:w-11 sm:h-11 text-rose-400" />
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-serif tracking-tight mb-2">
          {passed ? 'Cultural Milestone Achieved!' : 'Checkpoint Attempt Concluded'}
        </h1>

        <p className="text-sm sm:text-base text-zinc-300 max-w-md mx-auto mb-6">
          {passed
            ? `Magnificent! You scored ${result.score}/${result.total_questions} and unlocked local honors for ${destinationName}.`
            : `You scored ${result.score}/${result.total_questions}. A score of at least 4/5 is required to pass.`}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm mx-auto mb-6">
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center font-mono">
            <span className="block text-xs uppercase text-zinc-400 mb-1">Final Score</span>
            <span className={`text-2xl font-bold ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>
              {result.score} / {result.total_questions}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center font-mono">
            <span className="block text-xs uppercase text-zinc-400 mb-1">XP Awarded</span>
            <span className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              +{result.xp_awarded}
            </span>
          </div>
        </div>

        {/* Host quip */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-amber-500/30 text-amber-200 text-sm font-medium font-sans max-w-lg mx-auto">
          <span className="font-mono text-xs text-amber-400 uppercase tracking-wider block mb-1">
            Apo Lakay&apos;s Review
          </span>
          &ldquo;{hostLine}&rdquo;
        </div>
      </div>

      {/* Did You Know? Cards (explanations) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-wider text-amber-400">
          <BookOpen className="w-4 h-4 text-amber-500" />
          Did You Know? Heritage Briefing
        </div>

        <div className="space-y-3">
          {result.breakdown.map((item, idx) => (
            <div
              key={item.question_id || idx}
              className={`p-4 rounded-xl border bg-zinc-900/80 backdrop-blur-sm ${
                item.is_correct ? 'border-emerald-500/30' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {item.is_correct ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-200 mb-1">
                    {idx + 1}. {item.question_text}
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans mb-1.5">
                    {item.explanation}
                  </p>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-amber-400 hover:underline inline-block"
                    >
                      Source Reference &rarr;
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share-free Summary Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
        <Link
          href="/quiz"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 text-sm font-medium text-center transition-colors"
        >
          Return to Arcade Lobby
        </Link>

        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Play Another Round
        </button>
      </div>
    </div>
  );
}
