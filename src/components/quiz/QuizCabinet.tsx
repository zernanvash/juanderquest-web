'use client';

import React, { useReducer, useEffect, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  Send,
  AlertTriangle,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import {
  QuizDetail,
  QuizQuestion,
  startQuizAttempt,
  submitQuizAttempt,
} from '@/lib/quizzes';
import {
  quizArcadeReducer,
  initialQuizArcadeState,
  QuizArcadeState,
  QuizArcadeAction,
} from './quizArcadeReducer';
import { QuestionCard } from './QuestionCard';
import { QuizProgressLadder } from './QuizProgressLadder';
import { HostLineBar } from './HostLineBar';
import { ResultsScreen } from './ResultsScreen';
import { APO_LAKAY_HOST, getRandomHostLine } from '@/lib/quiz-host';
import { quizAudio } from '@/lib/quiz-audio';

interface QuizCabinetProps {
  quiz: QuizDetail;
  initialQuestions?: QuizQuestion[];
  initialAttemptId?: string | null;
  /** Called with the awarded XP when the server grades a pass. */
  onPassed?: (xp: number) => void;
  /** Closes the surrounding dialog ("Done" on the results screen). */
  onClose?: () => void;
  /** True while a run is underway (questions shown or grading). */
  onProgressChange?: (inProgress: boolean) => void;
}

export function QuizCabinet({
  quiz,
  initialQuestions = [],
  initialAttemptId = null,
  onPassed,
  onClose,
  onProgressChange,
}: QuizCabinetProps) {
  const [activeAttemptId, setActiveAttemptId] = React.useState<string | null>(
    initialAttemptId
  );
  const [questions, setQuestions] = React.useState<QuizQuestion[]>(initialQuestions);
  const [starting, setStarting] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [welcomeLine] = React.useState(() => getRandomHostLine(APO_LAKAY_HOST.welcome));

  const [state, dispatch] = useReducer(
    (s: QuizArcadeState, a: QuizArcadeAction) => quizArcadeReducer(s, a, questions),
    initialQuizArcadeState
  );

  useEffect(() => {
    onProgressChange?.(state.stage === 'question' || state.stage === 'submitting');
  }, [state.stage, onProgressChange]);

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    const nextVal = !state.soundEnabled;
    quizAudio.setEnabled(nextVal);
    dispatch({ type: 'TOGGLE_SOUND' });
  }, [state.soundEnabled]);

  // Request browser geolocation and start attempt from title screen
  const handleStartGame = useCallback(async () => {
    setLocationError(null);

    // If pre-seeded questions and attempt id are already provided (e.g. initial props)
    if (questions.length === 5 && activeAttemptId) {
      dispatch({
        type: 'START_EPISODE',
        initialHostLine: APO_LAKAY_HOST.questionLeadIn[0],
      });
      if (state.soundEnabled) quizAudio.playCheckpointAdvance();
      return;
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError(
        `Your browser can't share your location. You need to be at ${quiz.destination_name} to play.`
      );
      return;
    }

    setStarting(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await startQuizAttempt({
            quizId: quiz.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });

          setActiveAttemptId(res.attempt.id);
          setQuestions(res.questions);

          dispatch({
            type: 'START_EPISODE',
            initialHostLine: APO_LAKAY_HOST.questionLeadIn[0],
          });
          if (state.soundEnabled) quizAudio.playCheckpointAdvance();
        } catch (err: unknown) {
          const msg =
            err instanceof Error
              ? err.message
              : `You need to be at ${quiz.destination_name} to play this quiz.`;
          setLocationError(msg);
        } finally {
          setStarting(false);
        }
      },
      (geoErr) => {
        setStarting(false);
        const reason =
          geoErr.code === geoErr.PERMISSION_DENIED
            ? 'Location is blocked. Allow location for this site in your browser settings, then try again.'
            : "We couldn't get your location. Check that GPS is on, then try again.";
        setLocationError(reason);
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  }, [activeAttemptId, questions.length, quiz.destination_name, quiz.id, state.soundEnabled]);

  // Select Option
  const handleSelectOption = useCallback((optId: string) => {
    const currentQ = questions[state.currentIndex];
    if (!currentQ) return;

    if (state.soundEnabled) quizAudio.playSelect();
    const quip = getRandomHostLine(APO_LAKAY_HOST.optionSelected, state.currentIndex);
    dispatch({
      type: 'SELECT_OPTION',
      questionId: currentQ.id,
      optionId: optId,
      hostQuip: quip,
    });
  }, [questions, state.currentIndex, state.soundEnabled]);

  // Advance
  const handleNext = useCallback(() => {
    const nextIndex = state.currentIndex + 1;
    if (nextIndex < questions.length) {
      if (state.soundEnabled) quizAudio.playCheckpointAdvance();
      const nextLine = APO_LAKAY_HOST.questionLeadIn[nextIndex] || 'Moving ahead!';
      dispatch({ type: 'NEXT_QUESTION', nextHostLine: nextLine });
    }
  }, [questions.length, state.currentIndex, state.soundEnabled]);

  // Back
  const handlePrev = useCallback(() => {
    dispatch({ type: 'PREV_QUESTION' });
  }, []);

  // Submit episode
  const handleSubmit = useCallback(async () => {
    if (!activeAttemptId) return;

    const answersList = questions.map((q) => ({
      question_id: q.id,
      selected_option_id: state.answers[q.id] || '',
    }));

    if (answersList.some((a) => !a.selected_option_id)) {
      dispatch({
        type: 'SUBMIT_FAILURE',
        error: 'Answer all 5 questions first.',
      });
      return;
    }

    dispatch({
      type: 'SET_SUBMITTING',
      hostLine: getRandomHostLine(APO_LAKAY_HOST.submissionCheer),
    });

    try {
      const res = await submitQuizAttempt(activeAttemptId, answersList);
      const hostReview = res.passed
        ? getRandomHostLine(APO_LAKAY_HOST.passLines)
        : getRandomHostLine(APO_LAKAY_HOST.failLines);

      if (state.soundEnabled) {
        if (res.passed) quizAudio.playPassFanfare();
        else quizAudio.playFailChime();
      }

      dispatch({
        type: 'SUBMIT_SUCCESS',
        result: res,
        hostLine: hostReview,
      });
      if (res.passed) onPassed?.(res.xp_awarded);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "We couldn't submit your answers. Try again.";
      dispatch({
        type: 'SUBMIT_FAILURE',
        error: msg,
      });
    }
  }, [activeAttemptId, questions, state.answers, state.soundEnabled, onPassed]);

  // Restart handler - clears attempt ID and questions so a fresh attempt is required
  const handlePlayAgain = useCallback(() => {
    setActiveAttemptId(null);
    setQuestions([]);
    setLocationError(null);
    dispatch({ type: 'RESTART' });
  }, []);

  // Keyboard navigation [1-4], Enter
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (state.stage === 'question') {
        const currentQ = questions[state.currentIndex];
        if (!currentQ) return;

        // Number keys 1-4
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const opt = currentQ.options[idx];
          if (opt) {
            handleSelectOption(opt.id);
            dispatch({ type: 'SET_FOCUS_OPTION', index: idx });
          }
          return;
        }

        // Enter key
        if (e.key === 'Enter') {
          const isAnswered = Boolean(state.answers[currentQ.id]);
          const isLast = state.currentIndex === questions.length - 1;

          if (isAnswered) {
            if (isLast) {
              void handleSubmit();
            } else {
              handleNext();
            }
          }
        }
      } else if (state.stage === 'title' && e.key === 'Enter') {
        void handleStartGame();
      }
    },
    [state.stage, state.currentIndex, state.answers, questions, handleSelectOption, handleSubmit, handleNext, handleStartGame]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentQuestion = questions[state.currentIndex];
  const allAnswered =
    questions.length === 5 &&
    questions.every((q) => Boolean(state.answers[q.id]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#837560] truncate">
          {quiz.destination_name}
          {quiz.municipality ? ` · ${quiz.municipality}` : ''}
        </span>
        <button
          type="button"
          onClick={handleToggleSound}
          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
          aria-label={state.soundEnabled ? 'Turn sound off' : 'Turn sound on'}
          aria-pressed={state.soundEnabled}
        >
          {state.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {state.stage === 'title' && (
        <div className="space-y-4">
          {quiz.description && <p className="text-sm text-[#5C4F3F] leading-relaxed">{quiz.description}</p>}

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-black">+{quiz.xp_reward} XP</span>
            <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-[#5C4F3F] font-bold">5 questions</span>
            <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-[#5C4F3F] font-bold">Pass with 4</span>
          </div>

          <HostLineBar hostName="Apo Lakay" line={welcomeLine} />

          <p className="text-[11px] text-[#837560] flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0 mt-px" aria-hidden="true" />
            You need to be at {quiz.destination_name}. We check your location when you start.
          </p>

          {locationError && (
            <div role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-px" />
                <span className="leading-relaxed">{locationError}</span>
              </div>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={starting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold transition cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Try again
              </button>
            </div>
          )}

          {state.error && (
            <div role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleStartGame}
            disabled={starting}
            className="w-full min-h-12 px-5 py-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-sm font-bold shadow-2xs transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {starting ? 'Checking your location…' : 'Start quiz'}
            {!starting && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      )}

      {state.stage === 'question' && currentQuestion && (
        <div className="space-y-4">
          <QuizProgressLadder
            totalQuestions={questions.length || 5}
            currentIndex={state.currentIndex}
            answers={state.answers}
            questionIds={questions.map((q) => q.id)}
          />

          <HostLineBar
            hostName="Apo Lakay"
            line={state.hostLine || APO_LAKAY_HOST.questionLeadIn[state.currentIndex]}
          />

          <QuestionCard
            ordinal={currentQuestion.ordinal || state.currentIndex + 1}
            questionText={currentQuestion.question_text}
            options={currentQuestion.options}
            selectedOptionId={state.answers[currentQuestion.id]}
            onSelectOption={handleSelectOption}
            focusedOptionIndex={state.focusedOptionIndex}
            onFocusOption={(idx) => dispatch({ type: 'SET_FOCUS_OPTION', index: idx })}
          />

          {state.error && (
            <div role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[#F2EFE9]">
            <button
              type="button"
              onClick={handlePrev}
              disabled={state.currentIndex === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            {state.currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!state.answers[currentQuestion.id]}
                className="px-4 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold shadow-2xs transition disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="px-5 py-2.5 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs font-black shadow-sm transition disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                See results
              </button>
            )}
          </div>
        </div>
      )}

      {state.stage === 'submitting' && (
        <div className="text-center py-10 space-y-3" role="status">
          <div className="w-8 h-8 border-2 border-[#2D6A4F]/20 border-t-[#2D6A4F] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#2C221E]">Checking your answers…</p>
        </div>
      )}

      {state.stage === 'results' && state.submissionResult && (
        <ResultsScreen
          quizTitle={quiz.title}
          destinationName={quiz.destination_name}
          municipality={quiz.municipality}
          result={state.submissionResult}
          hostLine={state.hostLine}
          onPlayAgain={handlePlayAgain}
          onDone={onClose}
        />
      )}
    </div>
  );
}
