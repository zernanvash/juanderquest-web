import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionCard } from './QuestionCard';
import { QuizProgressLadder } from './QuizProgressLadder';
import { HostLineBar } from './HostLineBar';
import * as gsapModule from '@/lib/animations/gsap';

describe('Quiz Arcade Presentation Components', () => {
  const options = [
    { id: 'o1', ordinal: 1, option_text: 'Option A' },
    { id: 'o2', ordinal: 2, option_text: 'Option B' },
    { id: 'o3', ordinal: 3, option_text: 'Option C' },
    { id: 'o4', ordinal: 4, option_text: 'Option D' },
  ];

  it('renders QuestionCard with ordinal, text, options, and radio roles', () => {
    const onSelect = vi.fn();
    const onFocus = vi.fn();

    render(
      <QuestionCard
        ordinal={1}
        questionText="What is the capital of Pangasinan?"
        options={options}
        selectedOptionId="o2"
        onSelectOption={onSelect}
        focusedOptionIndex={1}
        onFocusOption={onFocus}
      />
    );

    expect(screen.getByText(/Question 1 of 5/i)).toBeDefined();
    expect(screen.getByText('What is the capital of Pangasinan?')).toBeDefined();
    expect(screen.getByText('Option B')).toBeDefined();

    const optB = screen.getByRole('radio', { name: /Option B/i });
    expect(optB.getAttribute('aria-checked')).toBe('true');

    const optA = screen.getByRole('radio', { name: /Option A/i });
    expect(optA.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(optA);
    expect(onSelect).toHaveBeenCalledWith('o1');
  });

  it('respects prefers-reduced-motion in QuestionCard animation path', () => {
    const prefersSpy = vi.spyOn(gsapModule, 'prefersReducedMotion').mockReturnValue(true);

    render(
      <QuestionCard
        ordinal={2}
        questionText="Reduced motion test question"
        options={options}
        onSelectOption={vi.fn()}
        focusedOptionIndex={0}
        onFocusOption={vi.fn()}
      />
    );

    expect(prefersSpy).toHaveBeenCalled();
    prefersSpy.mockRestore();
  });

  it('renders QuizProgressLadder with 5 checkpoints and never uses the word safe', () => {
    const { container } = render(
      <QuizProgressLadder
        totalQuestions={5}
        currentIndex={2}
        answers={{ q1: 'o1', q2: 'o2' }}
        questionIds={['q1', 'q2', 'q3', 'q4', 'q5']}
      />
    );

    expect(screen.getByText('2/5 answered')).toBeDefined();
    expect(screen.getByLabelText('Checkpoint 1, answered')).toBeDefined();
    expect(screen.getByLabelText('Checkpoint 2, answered')).toBeDefined();
    expect(screen.getByLabelText('Checkpoint 3')).toBeDefined();

    // Protocol requirement: never call them "safe"
    expect(container.textContent?.toLowerCase()).not.toContain('safe');
  });

  it('renders HostLineBar with ARIA live region for screen readers', () => {
    render(<HostLineBar hostName="Apo Lakay" line="Welcome to the arcade cabinet!" />);

    const hostName = screen.getByText('Apo Lakay');
    expect(hostName).toBeDefined();

    const liveText = screen.getByText('Welcome to the arcade cabinet!');
    expect(liveText.getAttribute('aria-live')).toBe('polite');
    expect(liveText.getAttribute('aria-atomic')).toBe('true');
  });
});
