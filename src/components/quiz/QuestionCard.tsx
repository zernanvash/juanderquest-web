import React, { useRef } from 'react';
import { QuizOption } from '@/lib/quizzes';
import { useGSAP, gsap, prefersReducedMotion } from '@/lib/animations/gsap';

interface QuestionCardProps {
  ordinal: number;
  questionText: string;
  options: QuizOption[];
  selectedOptionId?: string;
  onSelectOption: (optionId: string) => void;
  focusedOptionIndex: number;
  onFocusOption: (index: number) => void;
}

export function QuestionCard({
  ordinal,
  questionText,
  options,
  selectedOptionId,
  onSelectOption,
  focusedOptionIndex,
  onFocusOption,
}: QuestionCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      if (!cardRef.current) return;

      if (reduced) {
        gsap.fromTo(
          cardRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.15, ease: 'power1.out' }
        );
      } else {
        // Short slide-in for each new question
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, x: 24 },
          { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
        );
      }
    },
    { dependencies: [ordinal], scope: containerRef }
  );

  return (
    <div ref={containerRef} className="w-full">
      <div ref={cardRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-emerald-800">Question {ordinal} of 5</span>
          <span className="hidden sm:inline text-[11px] text-[#837560]">Keys 1–4 to choose, Enter to continue</span>
        </div>

        <h2 className="text-base sm:text-lg font-bold text-[#2C221E] leading-snug">{questionText}</h2>

        <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label={`Options for Question ${ordinal}`}>
          {options.map((opt, idx) => {
            const isSelected = selectedOptionId === opt.id;
            const isFocused = focusedOptionIndex === idx;

            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isFocused || (focusedOptionIndex === 0 && idx === 0) ? 0 : -1}
                onClick={() => onSelectOption(opt.id)}
                onFocus={() => onFocusOption(idx)}
                className={`group min-h-12 w-full flex items-center gap-3 p-3 rounded-2xl border text-left text-sm font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]/50 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/80 border-[#2D6A4F] text-[#1B4332] shadow-2xs'
                    : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#3D332A] hover:bg-white hover:border-[#2D6A4F]/40'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-[#2D6A4F] text-white' : 'bg-white border border-[#E3DFD5] text-[#837560]'
                  }`}
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>
                <span className="leading-snug">{opt.option_text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
