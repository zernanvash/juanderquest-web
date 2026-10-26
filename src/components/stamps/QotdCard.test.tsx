import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QotdCard } from './QotdCard';

const stampsApi = vi.hoisted(() => ({
  fetchQotd: vi.fn(),
  answerQotd: vi.fn(),
  notifyStampsUpdated: vi.fn(),
}));

vi.mock('@/lib/stamps-api', () => stampsApi);
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'traveler-1', displayName: 'Vash', points: 10, role: 'user' } }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const qotd = {
  date: '2026-10-26',
  question: {
    id: 'question-1',
    text: 'Which province is famous for Hundred Islands?',
    quiz_title: 'Pangasinan Heritage',
    options: [
      { id: 'o1', ordinal: 1, text: 'Pangasinan' },
      { id: 'o2', ordinal: 2, text: 'Cebu' },
      { id: 'o3', ordinal: 3, text: 'Davao' },
      { id: 'o4', ordinal: 4, text: 'Batanes' },
    ],
  },
  answered: false,
  answer: null,
};

describe('QotdCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stampsApi.fetchQotd.mockResolvedValue(qotd);
    stampsApi.answerQotd.mockResolvedValue({
      date: '2026-10-26',
      correct: true,
      correct_option_id: 'o1',
      explanation: 'Pangasinan is home to the Hundred Islands.',
      source_url: null,
    });
  });
  afterEach(cleanup);

  it('renders options without revealing the answer first', async () => {
    render(<QotdCard />);
    expect(await screen.findByText('Which province is famous for Hundred Islands?')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.queryByText('Correct!')).toBeNull();
    expect(screen.queryByText(/Pangasinan is home/)).toBeNull();
  });

  it('submits one answer and shows the server result', async () => {
    render(<QotdCard />);
    const option = await screen.findByRole('button', { name: /Pangasinan/ });
    fireEvent.click(option);
    await waitFor(() => expect(stampsApi.answerQotd).toHaveBeenCalledWith('o1'));
    expect(await screen.findByText('Correct!')).toBeTruthy();
    expect(screen.getByText(/Pangasinan is home to the Hundred Islands/)).toBeTruthy();
    expect(stampsApi.notifyStampsUpdated).toHaveBeenCalled();
    expect(screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });

  it('shows the stored answer for an already answered day', async () => {
    stampsApi.fetchQotd.mockResolvedValue({
      ...qotd,
      answered: true,
      answer: { correct: false, option_id: 'o2', explanation: 'Pangasinan, not Cebu.', source_url: null },
    });
    render(<QotdCard />);
    expect(await screen.findByText('Not quite.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cebu/ }).className).toContain('bg-red-50');
  });
});
