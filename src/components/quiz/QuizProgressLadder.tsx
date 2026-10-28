import React from 'react';
import { Check } from 'lucide-react';

interface QuizProgressLadderProps {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, string>;
  questionIds: string[];
}

/** Five checkpoints in one row; pass mark is 4 of 5. */
export function QuizProgressLadder({
  totalQuestions,
  currentIndex,
  answers,
  questionIds,
}: QuizProgressLadderProps) {
  const checkpoints = Array.from({ length: totalQuestions }, (_, i) => i + 1);
  const answered = questionIds.filter((id) => Boolean(answers[id])).length;

  return (
    <nav className="space-y-1.5" aria-label="Progress ladder">
      <ol className="flex items-center gap-1.5">
        {checkpoints.map((stepNum, idx) => {
          const qId = questionIds[idx];
          const hasAnswer = Boolean(qId && answers[qId]);
          const isCurrent = idx === currentIndex;

          let statusClass = 'bg-stone-100 text-[#837560] border-[#E3DFD5]';
          if (isCurrent) statusClass = 'bg-[#2D6A4F] text-white border-[#2D6A4F]';
          else if (hasAnswer) statusClass = 'bg-emerald-50 text-[#2D6A4F] border-emerald-200';

          return (
            <li
              key={stepNum}
              className={`flex-1 h-7 rounded-lg border text-[11px] font-black flex items-center justify-center transition-colors ${statusClass}`}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Checkpoint ${stepNum}${hasAnswer ? ', answered' : ''}`}
            >
              {hasAnswer && !isCurrent ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : stepNum}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between text-[11px] text-[#837560]">
        <span>Get 4 of 5 right to pass</span>
        <span className="font-bold text-[#2C221E]">
          {answered}/{totalQuestions} answered
        </span>
      </div>
    </nav>
  );
}
