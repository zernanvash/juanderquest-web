import React from 'react';
import { CheckCircle2, XCircle, RotateCcw, Lightbulb } from 'lucide-react';
import { QuizSubmissionResult } from '@/lib/quizzes';

interface ResultsScreenProps {
  quizTitle?: string;
  destinationName: string;
  municipality?: string;
  result: QuizSubmissionResult;
  hostLine: string;
  onPlayAgain: () => void;
  onDone?: () => void;
}

export function ResultsScreen({
  destinationName,
  result,
  hostLine,
  onPlayAgain,
  onDone,
}: ResultsScreenProps) {
  const passed = result.passed;

  return (
    <div className="space-y-5">
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
          passed ? 'bg-emerald-50/70 border-emerald-200 text-[#2D6A4F]' : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}
      >
        <div className="min-w-0">
          <h3 className="text-base font-black">{passed ? 'You passed!' : 'Nice try!'}</h3>
          <p className="text-xs opacity-90 mt-0.5">
            {passed
              ? `You got ${result.score} of ${result.total_questions} right about ${destinationName}.`
              : `You got ${result.score} of ${result.total_questions}. Get 4 right to pass.`}
          </p>
        </div>
        {passed && (
          <div className="px-3 py-1.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-black shrink-0 shadow-xs">
            +{result.xp_awarded} XP
          </div>
        )}
      </div>

      {hostLine && (
        <p className="text-xs text-[#5C4F3F] italic px-1">
          <span className="not-italic font-black text-[#2C221E]">Apo Lakay:</span> &ldquo;{hostLine}&rdquo;
        </p>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-black text-[#582F0E]">Did you know?</h4>
        <div className="space-y-2">
          {result.breakdown.map((item, idx) => (
            <div
              key={item.question_id || idx}
              className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]/60 text-xs space-y-1.5"
            >
              <div className="flex items-start gap-1.5 font-bold text-[#2C221E]">
                {item.is_correct ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-label="Correct" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" aria-label="Wrong" />
                )}
                <span>
                  {idx + 1}. {item.question_text}
                </span>
              </div>
              {item.explanation && (
                <p className="pl-5 text-[11px] text-[#582F0E] flex items-start gap-1.5">
                  <Lightbulb className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item.explanation}</span>
                </p>
              )}
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pl-5 text-[11px] font-bold text-[#2D6A4F] hover:underline inline-block"
                >
                  Source &rarr;
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-[#F2EFE9]">
        <button
          type="button"
          onClick={onPlayAgain}
          className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#582F0E] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Play again
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
