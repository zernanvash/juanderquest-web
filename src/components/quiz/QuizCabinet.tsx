'use client';

import React, { useReducer, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Volume2,
  VolumeX,
  Play,
  ChevronRight,
  ChevronLeft,
  Send,
  AlertTriangle,
  ArrowLeft,
  Trophy,
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
}

export function QuizCabinet({
  quiz,
  initialQuestions = [],
  initialAttemptId = null,
}: QuizCabinetProps) {
  const [activeAttemptId, setActiveAttemptId] = React.useState<string | null>(
    initialAttemptId
  );
  const [questions, setQuestions] = React.useState<QuizQuestion[]>(initialQuestions);
  const [starting, setStarting] = React.useState(false);

  const [state, dispatch] = useReducer(
    (s: QuizArcadeState, a: QuizArcadeAction) => quizArcadeReducer(s, a, questions),
    initialQuizArcadeState
  );

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    const nextVal = !state.soundEnabled;
    quizAudio.setEnabled(nextVal);
    dispatch({ type: 'TOGGLE_SOUND' });
  }, [state.soundEnabled]);

  // Start attempt from title screen
  const handleStartGame = useCallback(async () => {
    if (questions.length === 5 && activeAttemptId) {
      // If we already have questions and attempt id
      dispatch({
        type: 'START_EPISODE',
        initialHostLine: APO_LAKAY_HOST.questionLeadIn[0],
      });
      if (state.soundEnabled) quizAudio.playCheckpointAdvance();
      return;
    }

    setStarting(true);
    try {
      // Use destination GPS to satisfy server geofence
      const lat = quiz.gps_lat || 16.2085;
      const lng = quiz.gps_lng || 119.972;

      const res = await startQuizAttempt({
        quizId: quiz.id,
        lat,
        lng,
      });

      setActiveAttemptId(res.attempt.id);
      setQuestions(res.questions);

      dispatch({
        type: 'START_EPISODE',
        initialHostLine: APO_LAKAY_HOST.questionLeadIn[0],
      });
      if (state.soundEnabled) quizAudio.playCheckpointAdvance();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not initiate game attempt with server.';
      dispatch({
        type: 'SUBMIT_FAILURE',
        error: msg,
      });
    } finally {
      setStarting(false);
    }
  }, [activeAttemptId, questions.length, quiz.gps_lat, quiz.gps_lng, quiz.id, state.soundEnabled]);

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
        error: 'Please answer all 5 questions before finalizing your run.',
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit quiz attempt to the server.';
      dispatch({
        type: 'SUBMIT_FAILURE',
        error: msg,
      });
    }
  }, [activeAttemptId, questions, state.answers, state.soundEnabled]);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500 selection:text-zinc-950 font-sans">
      {/* Top Arcade Marquee Bar */}
      <header className="border-b border-amber-500/20 bg-zinc-900/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/quiz"
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 transition-colors"
              aria-label="Back to Arcade Lobby"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 block">
                JuanDerQuest Heritage Arcade
              </span>
              <h1 className="text-sm sm:text-base font-bold text-zinc-100 truncate max-w-[200px] sm:max-w-md font-serif">
                {quiz.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                state.soundEnabled
                  ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
              }`}
              aria-label={state.soundEnabled ? 'Mute arcade sounds' : 'Enable arcade sounds'}
            >
              {state.soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Audio ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                  <span className="hidden sm:inline">Audio OFF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Arcade Frame */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center">
        {state.stage === 'title' && (
          <div className="max-w-xl mx-auto text-center space-y-6 py-6 sm:py-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono font-bold tracking-widest uppercase">
              <Trophy className="w-4 h-4" />
              Heritage Arcade Cabinet
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-100 font-serif tracking-tight">
              {quiz.title}
            </h2>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-md mx-auto font-sans">
              {quiz.description}
            </p>

            <div className="flex items-center justify-center gap-4 text-xs font-mono text-zinc-400">
              <span>{quiz.municipality}</span>
              <span>•</span>
              <span className="text-amber-400">+{quiz.xp_reward} XP Reward</span>
              <span>•</span>
              <span>5 Checkpoints</span>
            </div>

            <HostLineBar
              hostName="Apo Lakay"
              line={getRandomHostLine(APO_LAKAY_HOST.welcome)}
            />

            {state.error && (
              <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center justify-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={starting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-base transition-transform active:scale-95 shadow-xl shadow-amber-500/20 inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-current" />
                {starting ? 'Booting Cabinet...' : 'Insert Token & Start (Enter)'}
              </button>
            </div>
          </div>
        )}

        {state.stage === 'question' && currentQuestion && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left 8 cols: Host line + Question Card + Bottom Controls */}
            <div className="md:col-span-8 space-y-4">
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
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={state.currentIndex === 0}
                  className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs font-mono flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev Checkpoint
                </button>

                {state.currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!state.answers[currentQuestion.id]}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 text-xs font-mono flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-amber-500/10 transition-colors"
                  >
                    Next Checkpoint (Enter)
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 font-extrabold text-xs font-mono flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-amber-500/20 transition-all hover:brightness-105"
                  >
                    <Send className="w-4 h-4" />
                    Submit 5 Checkpoints
                  </button>
                )}
              </div>
            </div>

            {/* Right 4 cols: Progress Ladder */}
            <div className="md:col-span-4">
              <QuizProgressLadder
                totalQuestions={questions.length || 5}
                currentIndex={state.currentIndex}
                answers={state.answers}
                questionIds={questions.map((q) => q.id)}
              />
            </div>
          </div>
        )}

        {state.stage === 'submitting' && (
          <div className="max-w-md mx-auto text-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mx-auto" />
            <h3 className="text-xl font-bold font-serif text-zinc-200">
              Consulting the Records of Pangasinan...
            </h3>
            <p className="text-sm text-zinc-400 font-mono">
              Apo Lakay is calculating your official score and XP reward.
            </p>
          </div>
        )}

        {state.stage === 'results' && state.submissionResult && (
          <ResultsScreen
            quizTitle={quiz.title}
            destinationName={quiz.destination_name}
            municipality={quiz.municipality}
            result={state.submissionResult}
            hostLine={state.hostLine}
            onPlayAgain={() => dispatch({ type: 'RESTART' })}
          />
        )}
      </main>

      {/* Retro Arcade Footer info */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 px-4 py-2.5 text-center text-[11px] font-mono text-zinc-600">
        <span>Juander Quiz Show Arcade • Cabinet 1995 • 100% Client Sovereign</span>
      </footer>
    </div>
  );
}
