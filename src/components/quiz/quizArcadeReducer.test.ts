import { describe, it, expect } from 'vitest';
import {
  quizArcadeReducer,
  initialQuizArcadeState,
} from './quizArcadeReducer';
import { QuizQuestion, QuizSubmissionResult } from '@/lib/quizzes';

const MOCK_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    ordinal: 1,
    question_text: 'Question 1',
    options: [
      { id: 'o1', ordinal: 1, option_text: 'Option 1' },
      { id: 'o2', ordinal: 2, option_text: 'Option 2' },
    ],
  },
  {
    id: 'q2',
    ordinal: 2,
    question_text: 'Question 2',
    options: [
      { id: 'o3', ordinal: 1, option_text: 'Option 3' },
      { id: 'o4', ordinal: 2, option_text: 'Option 4' },
    ],
  },
  {
    id: 'q3',
    ordinal: 3,
    question_text: 'Question 3',
    options: [{ id: 'o5', ordinal: 1, option_text: 'Option 5' }],
  },
  {
    id: 'q4',
    ordinal: 4,
    question_text: 'Question 4',
    options: [{ id: 'o6', ordinal: 1, option_text: 'Option 6' }],
  },
  {
    id: 'q5',
    ordinal: 5,
    question_text: 'Question 5',
    options: [{ id: 'o7', ordinal: 1, option_text: 'Option 7' }],
  },
];

describe('quizArcadeReducer state machine', () => {
  it('transitions from title to question stage on START_EPISODE', () => {
    const nextState = quizArcadeReducer(
      initialQuizArcadeState,
      { type: 'START_EPISODE', initialHostLine: 'Welcome!' },
      MOCK_QUESTIONS
    );

    expect(nextState.stage).toBe('question');
    expect(nextState.currentIndex).toBe(0);
    expect(nextState.hostLine).toBe('Welcome!');
  });

  it('records client-side answers on SELECT_OPTION without calling server', () => {
    let state = quizArcadeReducer(
      initialQuizArcadeState,
      { type: 'START_EPISODE' },
      MOCK_QUESTIONS
    );

    state = quizArcadeReducer(
      state,
      { type: 'SELECT_OPTION', questionId: 'q1', optionId: 'o1', hostQuip: 'Bold choice!' },
      MOCK_QUESTIONS
    );

    expect(state.answers['q1']).toBe('o1');
    expect(state.hostLine).toBe('Bold choice!');
  });

  it('advances through checkpoints and preserves prior answers', () => {
    let state = quizArcadeReducer(
      initialQuizArcadeState,
      { type: 'START_EPISODE' },
      MOCK_QUESTIONS
    );

    state = quizArcadeReducer(
      state,
      { type: 'SELECT_OPTION', questionId: 'q1', optionId: 'o1' },
      MOCK_QUESTIONS
    );

    state = quizArcadeReducer(
      state,
      { type: 'NEXT_QUESTION', nextHostLine: 'Checkpoint 2!' },
      MOCK_QUESTIONS
    );

    expect(state.currentIndex).toBe(1);
    expect(state.answers['q1']).toBe('o1');
    expect(state.hostLine).toBe('Checkpoint 2!');

    // Test PREV_QUESTION
    state = quizArcadeReducer(state, { type: 'PREV_QUESTION' }, MOCK_QUESTIONS);
    expect(state.currentIndex).toBe(0);
  });

  it('transitions through submitting and results upon SUBMIT_SUCCESS', () => {
    let state = quizArcadeReducer(
      initialQuizArcadeState,
      { type: 'START_EPISODE' },
      MOCK_QUESTIONS
    );

    state = quizArcadeReducer(
      state,
      { type: 'SET_SUBMITTING', hostLine: 'Tallying...' },
      MOCK_QUESTIONS
    );
    expect(state.stage).toBe('submitting');
    expect(state.hostLine).toBe('Tallying...');

    const mockResult: QuizSubmissionResult = {
      passed: true,
      score: 5,
      total_questions: 5,
      xp_awarded: 50,
      already_completed_prior: false,
      breakdown: [],
    };

    state = quizArcadeReducer(
      state,
      { type: 'SUBMIT_SUCCESS', result: mockResult, hostLine: 'Outstanding!' },
      MOCK_QUESTIONS
    );

    expect(state.stage).toBe('results');
    expect(state.submissionResult).toEqual(mockResult);
    expect(state.hostLine).toBe('Outstanding!');
  });

  it('handles lifelines: fifty_fifty, ask_local, and skip', () => {
    let state = quizArcadeReducer(
      initialQuizArcadeState,
      { type: 'START_EPISODE' },
      MOCK_QUESTIONS
    );

    // Fifty-fifty
    state = quizArcadeReducer(
      state,
      { type: 'USE_LIFELINE_FIFTY_FIFTY', questionId: 'q1', eliminatedIds: ['o2'] },
      MOCK_QUESTIONS
    );
    expect(state.lifelinesUsed).toContain('fifty_fifty');
    expect(state.eliminatedOptions['q1']).toEqual(['o2']);

    // Ask a local
    state = quizArcadeReducer(
      state,
      { type: 'USE_LIFELINE_ASK_LOCAL', questionId: 'q1', hint: 'Look to the western coast.' },
      MOCK_QUESTIONS
    );
    expect(state.lifelinesUsed).toContain('ask_local');
    expect(state.revealedHints['q1']).toBe('Look to the western coast.');

    // Skip
    state = quizArcadeReducer(
      state,
      { type: 'USE_LIFELINE_SKIP', questionId: 'q2' },
      MOCK_QUESTIONS
    );
    expect(state.lifelinesUsed).toContain('skip');
    expect(state.skippedQuestions['q2']).toBe(true);
  });

  it('toggles sound on and off', () => {
    expect(initialQuizArcadeState.soundEnabled).toBe(false);

    let state = quizArcadeReducer(initialQuizArcadeState, { type: 'TOGGLE_SOUND' }, MOCK_QUESTIONS);
    expect(state.soundEnabled).toBe(true);

    state = quizArcadeReducer(state, { type: 'TOGGLE_SOUND' }, MOCK_QUESTIONS);
    expect(state.soundEnabled).toBe(false);
  });
});
