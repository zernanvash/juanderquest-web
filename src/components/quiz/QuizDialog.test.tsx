import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuizDialog } from './QuizDialog';
import * as quizzesApi from '@/lib/quizzes';
import { QuizDetail } from '@/lib/quizzes';

const quiz: QuizDetail = {
  id: 'quiz-lucap-wharf',
  destination_id: 'spot-lucap-wharf',
  destination_name: 'Lucap Wharf & Promenade',
  municipality: 'Alaminos City',
  gps_lat: 16.2085,
  gps_lng: 119.972,
  title: 'Tales of Hundred Islands & Lucap Wharf',
  description: 'Coastal history of Alaminos City.',
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

describe('QuizDialog', () => {
  beforeEach(() => {
    vi.spyOn(quizzesApi, 'fetchQuizDetail').mockResolvedValue(quiz);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  it('opens as a modal dialog titled with the quiz and locks page scroll', async () => {
    render(<QuizDialog quizId="quiz-lucap-wharf" onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    await waitFor(() => expect(screen.getByText('Tales of Hundred Islands & Lucap Wharf')).toBeDefined());
    expect(screen.getByRole('button', { name: /Start quiz/i })).toBeDefined();
    expect(document.body.style.overflow).toBe('hidden');
    expect(quizzesApi.fetchQuizDetail).toHaveBeenCalledWith('quiz-lucap-wharf');
  });

  it('closes with Escape and the close button before a run starts, and returns focus to the opener', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();

    const { unmount } = render(<QuizDialog quizId="quiz-lucap-wharf" onClose={onClose} />);
    await waitFor(() => screen.getByRole('button', { name: /Start quiz/i }));

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Close quiz/i }));
    expect(onClose).toHaveBeenCalledTimes(2);

    unmount();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');
    opener.remove();
  });

  it('keeps Tab focus inside the dialog', async () => {
    render(<QuizDialog quizId="quiz-lucap-wharf" onClose={() => {}} />);
    await waitFor(() => screen.getByRole('button', { name: /Start quiz/i }));

    const closeBtn = screen.getByRole('button', { name: /Close quiz/i });
    const startBtn = screen.getByRole('button', { name: /Start quiz/i });

    startBtn.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);

    closeBtn.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(startBtn);
  });

  it('shows a plain error when the quiz cannot be loaded', async () => {
    vi.spyOn(quizzesApi, 'fetchQuizDetail').mockResolvedValue(null);
    render(<QuizDialog quizId="missing" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/not available right now/i)).toBeDefined());
  });
});
