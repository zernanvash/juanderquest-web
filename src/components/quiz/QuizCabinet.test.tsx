import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuizCabinet } from './QuizCabinet';
import { QuizDetail, QuizQuestion } from '@/lib/quizzes';
import * as quizzesApi from '@/lib/quizzes';

describe('QuizCabinet Interactive Component & Location Gates', () => {
  const mockQuiz: QuizDetail = {
    id: 'quiz-lucap-wharf',
    destination_id: 'spot-lucap-wharf',
    destination_name: 'Lucap Wharf & Promenade',
    municipality: 'Alaminos City',
    gps_lat: 16.2085,
    gps_lng: 119.972,
    title: 'Tales of Hundred Islands & Lucap Wharf',
    description: 'Explore the legends, marine biodiversity, and coastal history of Alaminos City.',
    language: 'en',
    radius_meters: 500,
    xp_reward: 50,
    time_limit_minutes: 30,
    cooldown_hours: 24,
    status: 'published',
    version: 1,
    is_completed: false,
    active_attempt_id: null,
    cooldown_until: null,
  };

  const mockQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      ordinal: 1,
      question_text: 'How many islands comprise Hundred Islands at low tide?',
      options: [
        { id: 'o1', ordinal: 1, option_text: '124 islands' },
        { id: 'o2', ordinal: 2, option_text: '100 islands' },
        { id: 'o3', ordinal: 3, option_text: '88 islands' },
        { id: 'o4', ordinal: 4, option_text: '150 islands' },
      ],
      explanation: 'Hundred Islands has 124 at low tide and 123 at high tide.',
    },
    {
      id: 'q2',
      ordinal: 2,
      question_text: 'In what year was Hundred Islands proclaimed a national park?',
      options: [
        { id: 'o5', ordinal: 1, option_text: '1940' },
        { id: 'o6', ordinal: 2, option_text: '1905' },
        { id: 'o7', ordinal: 3, option_text: '1955' },
        { id: 'o8', ordinal: 4, option_text: '1986' },
      ],
      explanation: 'Proclaimed in 1940 by Manuel L. Quezon.',
    },
    {
      id: 'q3',
      ordinal: 3,
      question_text: 'What is the jump-off port for boat tours?',
      options: [
        { id: 'o9', ordinal: 1, option_text: 'Lucap Wharf' },
        { id: 'o10', ordinal: 2, option_text: 'Sual Port' },
      ],
      explanation: 'Lucap Wharf serves as the boat terminal.',
    },
    {
      id: 'q4',
      ordinal: 4,
      question_text: 'Which island features the Christ the Savior statue?',
      options: [
        { id: 'o11', ordinal: 1, option_text: 'Pilgrimage Island' },
        { id: 'o12', ordinal: 2, option_text: 'Governor Island' },
      ],
      explanation: 'Pilgrimage Island has the colossal statue.',
    },
    {
      id: 'q5',
      ordinal: 5,
      question_text: 'What geological formation characterizes the island bases?',
      options: [
        { id: 'o13', ordinal: 1, option_text: 'Marine limestone notch erosion' },
        { id: 'o14', ordinal: 2, option_text: 'Volcanic basalt cooling' },
      ],
      explanation: 'Wave erosion notched the limestone bases.',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initiates attempt with real browser geolocation coordinates', async () => {
    const startSpy = vi.spyOn(quizzesApi, 'startQuizAttempt').mockResolvedValue({
      attempt: {
        id: 'attempt-123',
        quiz_id: 'quiz-lucap-wharf',
        version_id: 'v1',
        status: 'in_progress',
        started_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      },
      questions: mockQuestions,
    });

    // Mock navigator.geolocation
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: {
            latitude: 16.2081,
            longitude: 119.9725,
            accuracy: 10,
          },
        })
      ),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    render(<QuizCabinet quiz={mockQuiz} />);

    expect(screen.getByText(/Start quiz/i)).toBeDefined();

    // Trigger Enter key to start game
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith({
        quizId: 'quiz-lucap-wharf',
        lat: 16.2081,
        lng: 119.9725,
      });
      expect(screen.getByText(/Question 1 of 5/i)).toBeDefined();
    });
  });

  it('stays on title card and displays clear message when geolocation is denied', async () => {
    const startSpy = vi.spyOn(quizzesApi, 'startQuizAttempt');

    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) =>
        error({
          code: 1, // PERMISSION_DENIED
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'User denied geolocation',
        })
      ),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    render(<QuizCabinet quiz={mockQuiz} />);

    fireEvent.click(screen.getByText(/Start quiz/i));

    await waitFor(() => {
      expect(startSpy).not.toHaveBeenCalled();
      expect(
        screen.getByText(/Location is blocked/i)
      ).toBeDefined();
      expect(screen.getByRole('button', { name: /Try again/i })).toBeDefined();
    });
  });

  it('stays on title card when server rejects distance geofence', async () => {
    vi.spyOn(quizzesApi, 'startQuizAttempt').mockRejectedValue(
      new Error('You are 12.4 km away from Lucap Wharf & Promenade. Must be within 500m.')
    );

    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: {
            latitude: 16.033,
            longitude: 120.334,
            accuracy: 15,
          },
        })
      ),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    render(<QuizCabinet quiz={mockQuiz} />);

    fireEvent.click(screen.getByText(/Start quiz/i));

    await waitFor(() => {
      expect(
        screen.getByText(/You are 12.4 km away from Lucap Wharf & Promenade/i)
      ).toBeDefined();
      expect(screen.getByRole('button', { name: /Try again/i })).toBeDefined();
    });
  });

  it('selects options via keyboard number keys [1-4] and advances with Enter', async () => {
    render(
      <QuizCabinet
        quiz={mockQuiz}
        initialQuestions={mockQuestions}
        initialAttemptId="attempt-123"
      />
    );

    // Bypass title screen directly using initial questions/attempt
    // In this state, clicking start enters question stage
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: { latitude: 16.2085, longitude: 119.972 },
        })
      ),
    };
    vi.stubGlobal('navigator', { ...navigator, geolocation: mockGeolocation });

    fireEvent.click(screen.getByText(/Start quiz/i));

    await waitFor(() => {
      expect(screen.getByText('How many islands comprise Hundred Islands at low tide?')).toBeDefined();
    });

    // Press '1' to select first option (124 islands)
    fireEvent.keyDown(window, { key: '1' });

    const opt1 = screen.getByRole('radio', { name: /124 islands/i });
    expect(opt1.getAttribute('aria-checked')).toBe('true');

    // Press Enter to advance to next checkpoint
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Question 2 of 5/i)).toBeDefined();
    });

    expect(
      screen.getByText('In what year was Hundred Islands proclaimed a national park?')
    ).toBeDefined();
  });

  it('submits all five answers, and clicking Play Another Round clears the attempt and calls startQuizAttempt again', async () => {
    const startSpy = vi.spyOn(quizzesApi, 'startQuizAttempt').mockResolvedValue({
      attempt: {
        id: 'attempt-fresh-999',
        quiz_id: 'quiz-lucap-wharf',
        version_id: 'v1',
        status: 'in_progress',
        started_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      },
      questions: mockQuestions,
    });

    const submitSpy = vi.spyOn(quizzesApi, 'submitQuizAttempt').mockResolvedValue({
      passed: true,
      score: 5,
      total_questions: 5,
      xp_awarded: 50,
      already_completed_prior: false,
      breakdown: mockQuestions.map((q) => ({
        question_id: q.id,
        question_text: q.question_text,
        selected_option_id: q.options[0].id,
        correct_option_id: q.options[0].id,
        is_correct: true,
        explanation: q.explanation || '',
      })),
    });

    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: { latitude: 16.2085, longitude: 119.972 },
        })
      ),
    };
    vi.stubGlobal('navigator', { ...navigator, geolocation: mockGeolocation });

    render(
      <QuizCabinet
        quiz={mockQuiz}
        initialQuestions={mockQuestions}
        initialAttemptId="attempt-123"
      />
    );

    fireEvent.click(screen.getByText(/Start quiz/i));

    // Answer Q1
    await waitFor(() => screen.getByText(/Question 1 of 5/i));
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    // Answer Q2
    await waitFor(() => screen.getByText(/Question 2 of 5/i));
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    // Answer Q3
    await waitFor(() => screen.getByText(/Question 3 of 5/i));
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    // Answer Q4
    await waitFor(() => screen.getByText(/Question 4 of 5/i));
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    // Answer Q5 (last question)
    await waitFor(() => screen.getByText(/Question 5 of 5/i));
    fireEvent.keyDown(window, { key: '1' });

    // Click submit button
    const submitBtn = screen.getByText(/See results/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith(
        'attempt-123',
        mockQuestions.map((q) => ({
          question_id: q.id,
          selected_option_id: q.options[0].id,
        })),
        expect.objectContaining({ style_score: expect.any(Number) })
      );
    });

    // Check results screen
    await waitFor(() => {
      expect(screen.getByText(/You passed!/i)).toBeDefined();
    });

    // Click Play Another Round
    const playAgainBtn = screen.getByText(/Play again/i);
    fireEvent.click(playAgainBtn);

    // Should return to Title stage
    await waitFor(() => {
      expect(screen.getByText(/Start quiz/i)).toBeDefined();
    });

    // Press start again - must trigger startQuizAttempt cleanly with geolocation!
    fireEvent.click(screen.getByText(/Start quiz/i));

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith({
        quizId: 'quiz-lucap-wharf',
        lat: 16.2085,
        lng: 119.972,
      });
    });
  });
});
