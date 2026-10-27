import React from 'react';
import { Check, Flame } from 'lucide-react';

interface QuizProgressLadderProps {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, string>;
  questionIds: string[];
}

export function QuizProgressLadder({
  totalQuestions,
  currentIndex,
  answers,
  questionIds,
}: QuizProgressLadderProps) {
  const checkpoints = Array.from({ length: totalQuestions }, (_, i) => i + 1);

  return (
    <aside
      className="bg-zinc-950/80 border border-amber-500/20 rounded-xl p-3 sm:p-4 backdrop-blur-md flex flex-col justify-between"
      aria-label="Progress ladder"
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-500/20 text-xs font-mono uppercase tracking-wider text-amber-400">
        <span className="flex items-center gap-1.5 font-bold">
          <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          Checkpoints
        </span>
        <span className="text-zinc-500">5 Required</span>
      </div>

      {/* Ladder levels descending (top = Final checkpoint 5, bottom = Checkpoint 1) */}
      <ol className="flex flex-row sm:flex-col-reverse justify-between gap-1.5 my-2.5">
        {checkpoints.map((stepNum, idx) => {
          const qId = questionIds[idx];
          const hasAnswer = Boolean(qId && answers[qId]);
          const isCurrent = idx === currentIndex;
          const isFinal = idx === totalQuestions - 1;

          let statusClass = 'border-zinc-800 bg-zinc-900/60 text-zinc-400';
          if (isCurrent) {
            statusClass =
              'border-amber-400 bg-amber-500/20 text-amber-300 font-bold ring-2 ring-amber-400/30 scale-[1.02] shadow-lg shadow-amber-500/10';
          } else if (hasAnswer) {
            statusClass = 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300';
          }

          return (
            <li
              key={stepNum}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all duration-200 ${statusClass}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isCurrent ? 'bg-amber-400 text-zinc-950 font-bold' : hasAnswer ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {hasAnswer && !isCurrent ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : stepNum}
                </span>
                <span className="hidden sm:inline">
                  {isFinal ? 'Summit Stamp' : `Checkpoint ${stepNum}`}
                </span>
              </div>

              {isFinal && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-sans font-semibold">
                  Goal
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="pt-2 border-t border-amber-500/10 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
        <span>Target: 4/5 Pass</span>
        <span className="text-amber-400 font-bold">
          {Object.keys(answers).length}/{totalQuestions}
        </span>
      </div>
    </aside>
  );
}
