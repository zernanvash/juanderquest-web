'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, X } from 'lucide-react';
import { fetchQuizDetail, QuizDetail } from '@/lib/quizzes';
import { QuizCabinet } from './QuizCabinet';

interface QuizDialogProps {
  quizId: string;
  onClose: () => void;
  onPassed?: (xp: number) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Plays one cultural quiz over the page it was opened from: a centered dialog on
 * desktop, a full-height bottom sheet on phones. Focus stays inside while open
 * and returns to the opener on close.
 */
export function QuizDialog({ quizId, onClose, onPassed }: QuizDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchQuizDetail(quizId)
      .then((detail) => {
        if (!mounted) return;
        if (detail) setQuiz(detail);
        else setError('This quiz is not available right now.');
      })
      .catch((err: unknown) => {
        if (mounted) setError(err instanceof Error ? err.message : 'This quiz could not be loaded.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [quizId]);

  const requestClose = useCallback(() => {
    if (inProgress && !window.confirm('Leave this quiz? Your answers will not be saved.')) return;
    onClose();
  }, [inProgress, onClose]);

  // Lock page scroll, move focus in, and give it back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const title = quiz?.title ?? 'Cultural quiz';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-[#2C221E]/40" onClick={requestClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-dialog-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative w-full sm:max-w-xl h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl border border-[#E3DFD5] shadow-2xl flex flex-col outline-none animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F2EFE9] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 id="quiz-dialog-title" className="text-sm font-black text-[#2C221E] truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
            aria-label="Close quiz"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="py-12 text-center space-y-3" role="status">
              <div className="w-8 h-8 border-2 border-[#2D6A4F]/20 border-t-[#2D6A4F] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#837560]">Loading quiz…</p>
            </div>
          )}
          {!loading && (error || !quiz) && (
            <div className="py-10 text-center space-y-3" role="alert">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm text-[#5C4F3F]">{error ?? 'This quiz is not available right now.'}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
          {!loading && quiz && (
            <QuizCabinet quiz={quiz} onPassed={onPassed} onClose={onClose} onProgressChange={setInProgress} />
          )}
        </div>
      </div>
    </div>
  );
}
