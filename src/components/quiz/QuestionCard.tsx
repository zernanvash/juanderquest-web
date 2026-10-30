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
  eliminatedOptionIds?: string[];
  mediaUrl?: string | null;
  round?: string;
  revealedHint?: string;
}

export function QuestionCard({
  ordinal,
  questionText,
  options,
  selectedOptionId,
  onSelectOption,
  focusedOptionIndex,
  onFocusOption,
  eliminatedOptionIds = [],
  mediaUrl,
  round,
  revealedHint,
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
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-emerald-800">Question {ordinal} of 5</span>
            {round === 'special' && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Special Round
              </span>
            )}
            {round === 'lightning' && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                ⚡ Lightning Round
              </span>
            )}
          </div>
          <span className="hidden sm:inline text-[11px] text-[#837560]">Keys 1–4 to choose, Enter to continue</span>
        </div>

        {mediaUrl && (
          <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-[#E3DFD5] bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl}
              alt={`Clue for Question ${ordinal}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <h2 className="text-base sm:text-lg font-bold text-[#2C221E] leading-snug">{questionText}</h2>

        {revealedHint && (
          <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-[#7D5800] leading-relaxed flex items-start gap-2 shadow-2xs">
            <span className="text-base leading-none">💡</span>
            <div>
              <span className="font-bold block text-[#582F0E]">Elder Clue:</span>
              <span>{revealedHint}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label={`Options for Question ${ordinal}`}>
          {options.map((opt, idx) => {
            const isSelected = selectedOptionId === opt.id;
            const isFocused = focusedOptionIndex === idx;
            const isEliminated = eliminatedOptionIds.includes(opt.id);

            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                disabled={isEliminated}
                aria-checked={isSelected}
                tabIndex={isEliminated ? -1 : (isFocused || (focusedOptionIndex === 0 && idx === 0) ? 0 : -1)}
                onClick={() => !isEliminated && onSelectOption(opt.id)}
                onFocus={() => !isEliminated && onFocusOption(idx)}
                className={`group min-h-12 w-full flex items-center gap-3 p-3 rounded-2xl border text-left text-sm font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]/50 ${
                  isEliminated
                    ? 'opacity-30 pointer-events-none line-through bg-stone-100 border-stone-200 text-stone-400'
                    : isSelected
                    ? 'bg-emerald-50/80 border-[#2D6A4F] text-[#1B4332] shadow-2xs cursor-pointer'
                    : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#3D332A] hover:bg-white hover:border-[#2D6A4F]/40 cursor-pointer'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                    isEliminated
                      ? 'bg-stone-200 text-stone-400'
                      : isSelected
                      ? 'bg-[#2D6A4F] text-white'
                      : 'bg-white border border-[#E3DFD5] text-[#837560]'
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
