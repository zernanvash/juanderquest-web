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
        // Retro arcade 3D perspective flip-in
        gsap.fromTo(
          cardRef.current,
          {
            opacity: 0,
            rotationX: 18,
            scale: 0.96,
            y: 16,
          },
          {
            opacity: 1,
            rotationX: 0,
            scale: 1,
            y: 0,
            duration: 0.45,
            ease: 'back.out(1.4)',
          }
        );
      }
    },
    { dependencies: [ordinal], scope: containerRef }
  );

  return (
    <div ref={containerRef} className="perspective-1000 w-full">
      <div
        ref={cardRef}
        className="bg-zinc-900/90 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-amber-950/40 relative overflow-hidden backdrop-blur-sm"
      >
        {/* Subtle scanline effect overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-500/20">
          <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Checkpoint {ordinal} of 5
          </span>
          <span className="text-xs font-mono text-zinc-400">
            Keys [1-4] or Click
          </span>
        </div>

        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-100 mb-6 font-serif leading-snug">
          {questionText}
        </h2>

        {/* Options grid */}
        <div
          className="grid grid-cols-1 gap-3"
          role="radiogroup"
          aria-label={`Options for Question ${ordinal}`}
        >
          {options.map((opt, idx) => {
            const isSelected = selectedOptionId === opt.id;
            const isFocused = focusedOptionIndex === idx;
            const keyLabel = idx + 1;

            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isFocused || (focusedOptionIndex === 0 && idx === 0) ? 0 : -1}
                onClick={() => onSelectOption(opt.id)}
                onFocus={() => onFocusOption(idx)}
                className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-left font-medium transition-all duration-150 outline-none ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/40 shadow-md shadow-amber-500/20'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-amber-500/40 hover:bg-zinc-800/60'
                } ${isFocused ? 'ring-2 ring-amber-400' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg border font-mono text-xs flex items-center justify-center font-bold transition-colors ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400 text-zinc-950'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400 group-hover:border-amber-500/40 group-hover:text-amber-400'
                    }`}
                  >
                    {keyLabel}
                  </span>
                  <span className="text-sm sm:text-base leading-snug text-zinc-100 font-sans">
                    {opt.option_text}
                  </span>
                </div>

                <div
                  className={`w-3 h-3 rounded-full border transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400 shadow-sm shadow-amber-400'
                      : 'border-zinc-700 bg-transparent group-hover:border-zinc-500'
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
