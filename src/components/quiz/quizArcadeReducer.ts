import { QuizQuestion, QuizSubmissionResult } from '@/lib/quizzes';

export type QuizStage = 'title' | 'question' | 'submitting' | 'results';

export interface QuizArcadeState {
  stage: QuizStage;
  currentIndex: number;
  answers: Record<string, string>; // question_id -> selected_option_id
  focusedOptionIndex: number;
  submissionResult: QuizSubmissionResult | null;
  error: string | null;
  soundEnabled: boolean;
  hostLine: string;
  lifelinesUsed: string[];
  eliminatedOptions: Record<string, string[]>; // question_id -> option_ids eliminated
  revealedHints: Record<string, string>; // question_id -> hint string
  skippedQuestions: Record<string, boolean>; // question_id -> true
  styleScore: number;
}

export type QuizArcadeAction =
  | { type: 'START_EPISODE'; initialHostLine?: string }
  | { type: 'SELECT_OPTION'; questionId: string; optionId: string; hostQuip?: string }
  | { type: 'NEXT_QUESTION'; nextHostLine?: string }
  | { type: 'PREV_QUESTION' }
  | { type: 'SET_SUBMITTING'; hostLine?: string }
  | { type: 'SUBMIT_SUCCESS'; result: QuizSubmissionResult; hostLine: string }
  | { type: 'SUBMIT_FAILURE'; error: string }
  | { type: 'SET_FOCUS_OPTION'; index: number }
  | { type: 'USE_LIFELINE_FIFTY_FIFTY'; questionId: string; eliminatedIds: string[]; hostLine?: string }
  | { type: 'USE_LIFELINE_ASK_LOCAL'; questionId: string; hint: string; hostLine?: string }
  | { type: 'USE_LIFELINE_SKIP'; questionId: string; hostLine?: string }
  | { type: 'UPDATE_STYLE_SCORE'; delta: number }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'RESTART' };

export const initialQuizArcadeState: QuizArcadeState = {
  stage: 'title',
  currentIndex: 0,
  answers: {},
  focusedOptionIndex: 0,
  submissionResult: null,
  error: null,
  soundEnabled: false, // OFF by default
  hostLine: '',
  lifelinesUsed: [],
  eliminatedOptions: {},
  revealedHints: {},
  skippedQuestions: {},
  styleScore: 0,
};

export function quizArcadeReducer(
  state: QuizArcadeState,
  action: QuizArcadeAction,
  questions: QuizQuestion[]
): QuizArcadeState {
  switch (action.type) {
    case 'START_EPISODE': {
      return {
        ...state,
        stage: 'question',
        currentIndex: 0,
        focusedOptionIndex: 0,
        error: null,
        hostLine: action.initialHostLine || state.hostLine,
      };
    }

    case 'SELECT_OPTION': {
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: action.optionId,
        },
        hostLine: action.hostQuip || state.hostLine,
      };
    }

    case 'SET_FOCUS_OPTION': {
      return {
        ...state,
        focusedOptionIndex: action.index,
      };
    }

    case 'NEXT_QUESTION': {
      const nextIdx = state.currentIndex + 1;
      if (nextIdx >= questions.length) {
        return state;
      }
      return {
        ...state,
        currentIndex: nextIdx,
        focusedOptionIndex: 0,
        hostLine: action.nextHostLine || state.hostLine,
      };
    }

    case 'PREV_QUESTION': {
      const prevIdx = Math.max(0, state.currentIndex - 1);
      return {
        ...state,
        currentIndex: prevIdx,
        focusedOptionIndex: 0,
      };
    }

    case 'SET_SUBMITTING': {
      return {
        ...state,
        stage: 'submitting',
        error: null,
        hostLine: action.hostLine || state.hostLine,
      };
    }

    case 'SUBMIT_SUCCESS': {
      return {
        ...state,
        stage: 'results',
        submissionResult: action.result,
        hostLine: action.hostLine,
      };
    }

    case 'SUBMIT_FAILURE': {
      return {
        ...state,
        stage: 'question',
        error: action.error,
      };
    }

    case 'USE_LIFELINE_FIFTY_FIFTY': {
      return {
        ...state,
        lifelinesUsed: [...state.lifelinesUsed, 'fifty_fifty'],
        eliminatedOptions: {
          ...state.eliminatedOptions,
          [action.questionId]: action.eliminatedIds,
        },
        hostLine: action.hostLine || 'Apo Lakay: Two deceptive answers vanished into thin air!',
      };
    }

    case 'USE_LIFELINE_ASK_LOCAL': {
      return {
        ...state,
        lifelinesUsed: [...state.lifelinesUsed, 'ask_local'],
        revealedHints: {
          ...state.revealedHints,
          [action.questionId]: action.hint,
        },
        hostLine: action.hostLine || 'Apo Lakay: Listen closely to the local elders!',
      };
    }

    case 'USE_LIFELINE_SKIP': {
      return {
        ...state,
        lifelinesUsed: [...state.lifelinesUsed, 'skip'],
        skippedQuestions: {
          ...state.skippedQuestions,
          [action.questionId]: true,
        },
        hostLine: action.hostLine || 'Apo Lakay: Granted safe passage to the next challenge!',
      };
    }

    case 'UPDATE_STYLE_SCORE': {
      return {
        ...state,
        styleScore: Math.max(0, state.styleScore + action.delta),
      };
    }

    case 'TOGGLE_SOUND': {
      return {
        ...state,
        soundEnabled: !state.soundEnabled,
      };
    }

    case 'RESTART': {
      return {
        ...initialQuizArcadeState,
        soundEnabled: state.soundEnabled,
      };
    }

    default:
      return state;
  }
}
