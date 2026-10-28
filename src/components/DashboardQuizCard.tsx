'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ChevronRight,
  X,
  RotateCcw,
  BookOpen,
  LocateFixed,
} from 'lucide-react';
import { fetchNearbyQuizzes, NearbyQuizInvitation } from '@/lib/quizzes';

// Curated starter quiz fallback when not physically present at Pangasinan geofences
const STARTER_PANGASINAN_QUIZ = {
  id: 'starter-lingayen-heritage',
  title: 'Pangasinan Provincial Heritage & History',
  description: 'Test your knowledge on the Lingayen Gulf historical liberation, Capitol architecture, and coastal traditions.',
  municipality: 'Lingayen & Coastal Pangasinan',
  xp_reward: 25,
  questions: [
    {
      id: 'q1',
      question_text: 'Which prominent American general landed at Lingayen Gulf on January 9, 1945 during World War II?',
      options: [
        { id: 'q1_o1', option_text: 'General Douglas MacArthur' },
        { id: 'q1_o2', option_text: 'General Dwight D. Eisenhower' },
        { id: 'q1_o3', option_text: 'General George Patton' },
        { id: 'q1_o4', option_text: 'General Omar Bradley' },
      ],
      correct_id: 'q1_o1',
      explanation: 'Gen. Douglas MacArthur and the Allied Sixth Army made their historic strategic landing along the Lingayen shores in January 1945.',
    },
    {
      id: 'q2',
      question_text: 'The iconic neoclassical Pangasinan Provincial Capitol building in Lingayen was designed by which renowned master architect in 1918?',
      options: [
        { id: 'q2_o1', option_text: 'William E. Parsons' },
        { id: 'q2_o2', option_text: 'Daniel Burnham' },
        { id: 'q2_o3', option_text: 'Juan Arellano' },
        { id: 'q2_o4', option_text: 'Antonio Toledo' },
      ],
      correct_id: 'q2_o1',
      explanation: 'Consulting architect William E. Parsons designed the Capitol building implementing Daniel Burnham’s civic town planning principles.',
    },
    {
      id: 'q3',
      question_text: 'Which world-renowned national marine park in Alaminos City consists of 124 islands at low tide (123 at high tide)?',
      options: [
        { id: 'q3_o1', option_text: 'Hundred Islands National Park' },
        { id: 'q3_o2', option_text: 'Caramoan Islands' },
        { id: 'q3_o3', option_text: 'Corregidor Island Reserve' },
        { id: 'q3_o4', option_text: 'Calauit Game Preserve' },
      ],
      correct_id: 'q3_o1',
      explanation: 'Hundred Islands National Park spans Lucap Bay in Alaminos City, protected as the country’s first national park.',
    },
    {
      id: 'q4',
      question_text: 'What traditional Pangasinense delicacy is Calasiao celebrated for throughout Northern Luzon?',
      options: [
        { id: 'q4_o1', option_text: 'Bite-sized sweet steamed Puto' },
        { id: 'q4_o2', option_text: 'Smoked Tinapa' },
        { id: 'q4_o3', option_text: 'Crispy Bagnet' },
        { id: 'q4_o4', option_text: 'Sweet Tupig' },
      ],
      correct_id: 'q4_o1',
      explanation: 'Calasiao is renowned for its tender, bite-sized white steamed rice cakes (Puto Calasiao).',
    },
    {
      id: 'q5',
      question_text: 'Minor Basilica of Our Lady of Manaoag is one of the most visited pilgrimage shrines in the Philippines. In what municipality is it located?',
      options: [
        { id: 'q5_o1', option_text: 'Manaoag' },
        { id: 'q5_o2', option_text: 'Urdaneta' },
        { id: 'q5_o3', option_text: 'Binalonan' },
        { id: 'q5_o4', option_text: 'Pozorrubio' },
      ],
      correct_id: 'q5_o1',
      explanation: 'The Minor Basilica of Our Lady of the Most Holy Rosary of Manaoag is situated in the municipality of Manaoag.',
    },
  ],
};

type LocationState = 'checking' | 'ok' | 'denied' | 'unavailable';

interface DashboardQuizCardProps {
  /** Opens a nearby (server-graded) quiz in the quiz dialog. */
  onOpenQuiz?: (quizId: string) => void;
}

export function DashboardQuizCard({ onOpenQuiz }: DashboardQuizCardProps) {
  const [nearbyQuizzes, setNearbyQuizzes] = useState<NearbyQuizInvitation[]>([]);
  const [locationState, setLocationState] = useState<LocationState>('checking');

  // Active Interactive Quiz Session State
  const [activeSession, setActiveSession] = useState<{
    title: string;
    description: string;
    xp_reward: number;
    questions: Array<{
      id: string;
      question_text: string;
      options: Array<{ id: string; option_text: string }>;
      correct_id?: string;
      explanation?: string;
    }>;
  } | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{
    passed: boolean;
    score: number;
    total: number;
    breakdown: Array<{
      question_text: string;
      selected: string;
      correct: string;
      is_correct: boolean;
      explanation: string;
    }>;
  } | null>(null);

  const findNearbyQuizzes = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationState('unavailable');
      return;
    }
    setLocationState('checking');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationState('ok');
        try {
          setNearbyQuizzes(await fetchNearbyQuizzes(pos.coords.latitude, pos.coords.longitude));
        } catch {
          setNearbyQuizzes([]);
        }
      },
      (err) => setLocationState(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    findNearbyQuizzes();
  }, [findNearbyQuizzes]);

  const startStarterQuiz = () => {
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setActiveSession({
      title: STARTER_PANGASINAN_QUIZ.title,
      description: STARTER_PANGASINAN_QUIZ.description,
      xp_reward: STARTER_PANGASINAN_QUIZ.xp_reward,
      questions: STARTER_PANGASINAN_QUIZ.questions,
    });
  };

  const handleSelectOption = (optionId: string) => {
    if (!activeSession) return;
    const currentQ = activeSession.questions[currentQuestionIndex];
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }));
  };

  const handleNext = () => {
    if (!activeSession) return;
    if (currentQuestionIndex < activeSession.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Practice runs are graded here and never award XP; rewarded quizzes go through the server.
  const handleSubmitQuiz = () => {
    if (!activeSession) return;
    let score = 0;
    const breakdown = activeSession.questions.map((q) => {
      const selected = selectedAnswers[q.id];
      const isCorrect = selected === q.correct_id;
      if (isCorrect) score += 1;
      const selectedOpt = q.options.find((o) => o.id === selected);
      const correctOpt = q.options.find((o) => o.id === q.correct_id);
      return {
        question_text: q.question_text,
        selected: selectedOpt?.option_text || 'No answer',
        correct: correctOpt?.option_text || '',
        is_correct: isCorrect,
        explanation: q.explanation || '',
      };
    });
    setQuizResult({ passed: score >= 4, score, total: activeSession.questions.length, breakdown });
  };

  // 1. Result View
  if (quizResult && activeSession) {
    return (
      <div className="bg-white rounded-3xl border border-[#E3DFD5] p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#F2EFE9]">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              quizResult.passed ? 'bg-emerald-100 text-[#2D6A4F]' : 'bg-amber-100 text-amber-800'
            }`}>
              {quizResult.passed ? <CheckCircle2 className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#837560] block">
                Practice results
              </span>
              <h3 className="text-sm font-black text-[#2C221E]">{activeSession.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveSession(null);
              setQuizResult(null);
            }}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Score Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          quizResult.passed
            ? 'bg-emerald-50/70 border-emerald-200 text-[#2D6A4F]'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}>
          <div>
            <div className="text-base font-black">
              {quizResult.passed ? 'Well done!' : 'Nice try!'}
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              You got {quizResult.score} of {quizResult.total} right. Practice runs don&apos;t give XP; play a quiz at a destination to earn it.
            </p>
          </div>
        </div>

        {/* Questions Breakdown */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-black text-[#582F0E] uppercase tracking-wider">
            Did you know?
          </div>
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {quizResult.breakdown.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]/60 text-xs space-y-1.5">
                <div className="flex items-start gap-1.5 font-bold text-[#2C221E]">
                  {item.is_correct ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <span>{idx + 1}. {item.question_text}</span>
                </div>
                {!item.is_correct && (
                  <div className="pl-5 text-[11px] text-[#837560]">
                    Your answer: <span className="text-rose-600 font-semibold">{item.selected}</span>
                    <br />
                    Correct: <span className="text-emerald-700 font-bold">{item.correct}</span>
                  </div>
                )}
                <p className="pl-5 text-[11px] text-[#582F0E] italic bg-white/70 p-2 rounded-lg border border-[#E8E5DF]">
                  💡 {item.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2EFE9]">
          <button
            type="button"
            onClick={startStarterQuiz}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#582F0E] text-xs font-bold transition cursor-pointer"
          >
            Play again
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSession(null);
              setQuizResult(null);
            }}
            className="px-4 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-bold transition hover:bg-[#1B4332] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // 2. In-Progress Quiz Session
  if (activeSession) {
    const currentQ = activeSession.questions[currentQuestionIndex];
    const isAnswered = Boolean(selectedAnswers[currentQ.id]);
    const isLastQuestion = currentQuestionIndex === activeSession.questions.length - 1;
    const answeredCount = Object.keys(selectedAnswers).length;

    return (
      <div className="bg-white rounded-3xl border border-[#2D6A4F]/30 p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F2EFE9]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2D6A4F] border border-emerald-200 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Question {currentQuestionIndex + 1} of {activeSession.questions.length}
              </span>
              <h3 className="text-xs sm:text-sm font-black text-[#2C221E] truncate">
                {activeSession.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSession(null)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
            title="Exit quiz"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#2D6A4F] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / activeSession.questions.length) * 100}%` }}
          />
        </div>

        {/* Question Text */}
        <div className="space-y-3">
          <h4 className="text-sm sm:text-base font-bold text-[#2C221E] leading-relaxed">
            {currentQ.question_text}
          </h4>

          {/* Options */}
          <div className="space-y-2 pt-1">
            {currentQ.options.map((opt) => {
              const isSelected = selectedAnswers[currentQ.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-3 rounded-2xl border text-xs sm:text-sm font-bold transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/80 border-[#2D6A4F] text-[#1B4332] shadow-2xs'
                      : 'bg-[#FAF9F5] border-[#E3DFD5] text-[#3D332A] hover:bg-white hover:border-[#2D6A4F]/40'
                  }`}
                >
                  <span>{opt.option_text}</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                    isSelected ? 'border-[#2D6A4F] bg-[#2D6A4F]' : 'border-stone-300'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F2EFE9]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {!isLastQuestion ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isAnswered}
                className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold shadow-2xs transition disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={answeredCount < activeSession.questions.length}
                className="px-5 py-2.5 rounded-xl bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs font-black shadow-sm transition disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#582F0E]" />
                <span>See results</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Default Idle / Invitation View
  return (
    <div className="bg-white rounded-3xl border border-[#E3DFD5] p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#F2EFE9]">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-500/20">
            <HelpCircle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#2C221E]">Cultural quizzes</h3>
            <p className="text-[11px] text-[#837560]">
              Answer 5 questions at a destination to earn Explorer XP
            </p>
          </div>
        </div>
      </div>

      {locationState === 'checking' && (
        <p className="text-[11px] text-[#837560]" role="status">Looking for quizzes near you…</p>
      )}

      {(locationState === 'denied' || locationState === 'unavailable') && (
        <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <LocateFixed className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-[#5C4F3F]">
              {locationState === 'denied'
                ? 'Turn on location to see quizzes near you.'
                : "We couldn't get your location. Check that GPS is on."}
            </p>
          </div>
          <button
            type="button"
            onClick={findNearbyQuizzes}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#E3DFD5] hover:border-[#2D6A4F]/40 text-[#2D6A4F] text-xs font-bold shrink-0 transition cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {locationState === 'ok' && nearbyQuizzes.length === 0 && (
        <p className="text-[11px] text-[#837560]">No quizzes here yet. Visit a destination to find one.</p>
      )}

      {nearbyQuizzes.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-black text-emerald-800">Near you</span>
          {nearbyQuizzes.map((quiz) => (
            <div
              key={quiz.quiz_id}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-stone-50 border border-emerald-200/80 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#2D6A4F] shrink-0" />
                  <span className="text-xs font-black text-[#2C221E] truncate">{quiz.title}</span>
                </div>
                <p className="text-[11px] text-[#837560] truncate mt-0.5">
                  {quiz.destination_name} · {quiz.distance_meters ? `${Math.round(quiz.distance_meters)} m away` : 'Nearby'}
                  {quiz.is_completed ? ' · Completed' : ` · +${quiz.xp_reward} XP`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenQuiz?.(quiz.quiz_id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-extrabold shrink-0 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <span>{quiz.is_completed ? 'Play again' : 'Play'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Featured Starter Quiz Spotlight Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF9F5] to-emerald-50/30 border border-[#E3DFD5] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#2D6A4F] tracking-wide">
              <Sparkles className="w-3 h-3 text-[#FFB703]" />
              Practice quiz · anywhere
            </span>
            <h4 className="text-xs sm:text-sm font-black text-[#2C221E]">
              {STARTER_PANGASINAN_QUIZ.title}
            </h4>
            <p className="text-xs text-[#6B5E4D] leading-relaxed">
              {STARTER_PANGASINAN_QUIZ.description}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="px-2.5 py-1 rounded-xl bg-stone-100 text-[#5C4F3F] text-xs font-black">
              No XP
            </div>
            <span className="text-[9px] text-[#837560] block mt-0.5">5 Questions</span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-[#EAE6DD]">
          <span className="text-[11px] text-[#837560] flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#837560]" />
            About 2 minutes · Play anytime
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startStarterQuiz}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <span>Practice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
