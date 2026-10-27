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
