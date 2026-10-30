'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Check, HelpCircle, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  QotdResponse,
  answerQotd,
  fetchQotd,
  notifyStampsUpdated,
} from '@/lib/stamps-api';
import { useMissionHighlight } from '@/lib/mission-guidance';
import { MissionPill } from '@/components/MissionPill';

export function QotdCard() {
  const { user } = useAuth();
  const [data, setData] = useState<QotdResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Plan 71: the QOTD Daily Mission scrolls here and highlights the options for a moment.
  const { isHighlighted, dismiss } = useMissionHighlight('qotd', { scrollElementId: 'qotd-card' });

  const load = useCallback(async () => {
    try {
      const next = await fetchQotd();
      setData(next);
      setSelected(next.answer?.option_id ?? null);
      setError('');
    } catch {
      setError('Question of the Day is unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleAnswer = async (optionId: string) => {
    if (!user || !data?.question || data.answered || submitting) return;
    dismiss();
    setSubmitting(true);
    setError('');
    setSelected(optionId);
    try {
      const result = await answerQotd(optionId);
      setData((current) => current ? {
        ...current,
        answered: true,
        answer: {
          correct: result.correct,
          option_id: optionId,
          explanation: result.explanation,
          source_url: result.source_url,
        },
      } : current);
      notifyStampsUpdated();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        await load();
      } else {
        setError(err?.response?.data?.error?.message || 'Could not submit your answer.');
        setSelected(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section id="qotd-card" className="bg-white rounded-3xl border border-[#E3DFD5] p-5 shadow-xs space-y-3" aria-busy="true">
        <div className="h-4 w-36 rounded bg-stone-100 animate-pulse" />
        <div className="h-10 rounded-xl bg-stone-50 animate-pulse" />
      </section>
    );
  }

  if (!data?.question) return null;

  const answered = data.answered;
  const answer = data.answer;
  const guiding = isHighlighted && !answered;

  return (
    <section
      id="qotd-card"
      aria-labelledby="qotd-title"
      className={`bg-white rounded-3xl border border-[#E3DFD5] p-5 shadow-xs space-y-3 scroll-mt-24 ${guiding ? 'mission-guidance-highlight' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-700 flex items-center justify-center">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 id="qotd-title" className="text-sm font-black text-[#2C221E]">Question of the Day</h3>
          <p className="text-[10px] text-[#837560] truncate">{data.question.quiz_title}</p>
        </div>
        <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
          +5 stamps
        </span>
      </div>

      {guiding && <MissionPill>Daily Mission · Pick an answer below</MissionPill>}

      <p className="text-xs font-semibold text-[#2C221E] leading-relaxed">{data.question.text}</p>

      <div className="grid grid-cols-1 gap-1.5">
        {data.question.options.map((option) => {
          const isSelected = (answered ? answer?.option_id : selected) === option.id;
          const isCorrect = answered && answer?.correct && isSelected;
          const isWrong = answered && answer && !answer.correct && isSelected;
          return (
            <button
              key={option.id}
              type="button"
              disabled={answered || submitting || !user}
              onClick={() => handleAnswer(option.id)}
              className={`w-full text-left px-3 py-2 rounded-xl border text-[11px] font-semibold transition flex items-center gap-2 min-h-[36px] ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : isWrong
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : answered
                  ? 'bg-[#FAF9F5] border-[#E3DFD5] text-[#837560]'
                  : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#2C221E] hover:bg-amber-50 hover:border-amber-300'
              }`}
            >
              <span className="w-5 h-5 rounded-md bg-white border border-[#E3DFD5] flex items-center justify-center text-[9px] font-black shrink-0">
                {String.fromCharCode(64 + option.ordinal)}
              </span>
              <span className="flex-1">{option.text}</span>
              {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
              {isWrong && <X className="w-3.5 h-3.5 text-red-700 shrink-0" />}
            </button>
          );
        })}
      </div>

      {answered && answer ? (
        <div className={`min-h-[52px] rounded-xl border px-3 py-2 text-[10px] leading-relaxed ${
          answer.correct
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <span className="font-black">{answer.correct ? 'Correct!' : 'Not quite.'}</span>{' '}
          {answer.explanation}
        </div>
      ) : (
        <div aria-hidden="true" className="min-h-[52px] rounded-xl border border-dashed border-[#E3DFD5] px-3 py-2 text-[10px] text-[#837560] flex items-center">
          Answer to see the explanation.
        </div>
      )}

      {!user && (
        <Link href="/login" className="text-[10px] font-bold text-[#2D6A4F] hover:underline">
          Sign in to answer and earn stamps
        </Link>
      )}

      <div className="flex items-center justify-between text-[9px] text-[#837560] pt-1 border-t border-[#F2EFE9]">
        <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> One answer per Manila day</span>
        <Link href="/stamps" className="font-bold text-[#2D6A4F] hover:underline inline-flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> Stamp history
        </Link>
      </div>

      {error && <p role="alert" className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">{error}</p>}
    </section>
  );
}
