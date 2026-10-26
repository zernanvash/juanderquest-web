import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuizCabinet } from './QuizCabinet';
import { QuizDetail, QuizQuestion } from '@/lib/quizzes';
import * as quizzesApi from '@/lib/quizzes';

describe('QuizCabinet Interactive Component & Keyboard Controls', () => {
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

  it('renders title screen and initiates attempt on Start button click or Enter key', async () => {
    vi.spyOn(quizzesApi, 'startQuizAttempt').mockResolvedValue({
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

    render(<QuizCabinet quiz={mockQuiz} />);

    expect(screen.getAllByText('Tales of Hundred Islands & Lucap Wharf').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Insert Token & Start/i)).toBeDefined();

    // Trigger Enter key to start game
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Checkpoint 1 of 5/i)).toBeDefined();
    });

    expect(screen.getByText('How many islands comprise Hundred Islands at low tide?')).toBeDefined();
  });

  it('selects options via keyboard number keys [1-4] and advances with Enter', async () => {
    render(
      <QuizCabinet
        quiz={mockQuiz}
        initialQuestions={mockQuestions}
        initialAttemptId="attempt-123"
      />
    );

    // Click start to enter question stage directly
    fireEvent.click(screen.getByText(/Insert Token & Start/i));

    expect(screen.getByText('How many islands comprise Hundred Islands at low tide?')).toBeDefined();

    // Press '1' to select first option (124 islands)
    fireEvent.keyDown(window, { key: '1' });

    const opt1 = screen.getByRole('radio', { name: /124 islands/i });
    expect(opt1.getAttribute('aria-checked')).toBe('true');

    // Press Enter to advance to next checkpoint
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Checkpoint 2 of 5/i)).toBeDefined();
    });

    expect(
      screen.getByText('In what year was Hundred Islands proclaimed a national park?')
    ).toBeDefined();
  });

  it('submits all five answers at the end and renders ResultsScreen with Did You Know cards', async () => {
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

    render(
      <QuizCabinet
        quiz={mockQuiz}
        initialQuestions={mockQuestions}
        initialAttemptId="attempt-123"
      />
    );

    fireEvent.click(screen.getByText(/Insert Token & Start/i));

    // Answer Q1
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    // Answer Q2
    await waitFor(() => screen.getByText(/Checkpoint 2 of 5/i));
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    // Answer Q3
    await waitFor(() => screen.getByText(/Checkpoint 3 of 5/i));
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    // Answer Q4
    await waitFor(() => screen.getByText(/Checkpoint 4 of 5/i));
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    // Answer Q5 (last question)
    await waitFor(() => screen.getByText(/Checkpoint 5 of 5/i));
    fireEvent.keyDown(window, { key: '1' });

    // Click submit button
    const submitBtn = screen.getByText(/Submit 5 Checkpoints/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith(
        'attempt-123',
        mockQuestions.map((q) => ({
          question_id: q.id,
          selected_option_id: q.options[0].id,
        }))
      );
    });

    // Check results screen
    await waitFor(() => {
      expect(screen.getByText(/Cultural Milestone Achieved!/i)).toBeDefined();
      expect(screen.getByText(/Did You Know\? Heritage Briefing/i)).toBeDefined();
      expect(screen.getByText('Hundred Islands has 124 at low tide and 123 at high tide.')).toBeDefined();
    });
  });
});
