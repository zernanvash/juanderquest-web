import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CelebrationEffects, triggerCelebration } from './CelebrationEffects';

describe('CelebrationEffects audio & playback resilience', () => {
  let originalAudioContext: any;
  let originalWebkitAudioContext: any;

  beforeEach(() => {
    originalAudioContext = (window as any).AudioContext;
    originalWebkitAudioContext = (window as any).webkitAudioContext;
  });

  afterEach(() => {
    (window as any).AudioContext = originalAudioContext;
    (window as any).webkitAudioContext = originalWebkitAudioContext;
    vi.restoreAllMocks();
  });

  it('safely handles undefined resume() return value when AudioContext is suspended', () => {
    const resumeMock = vi.fn().mockReturnValue(undefined); // simulates browser returning undefined instead of Promise
    const createOscillatorMock = vi.fn().mockReturnValue({
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    });
    const createGainMock = vi.fn().mockReturnValue({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    });

    class MockAudioContext {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      resume = resumeMock;
      createOscillator = createOscillatorMock;
      createGain = createGainMock;
    }

    (window as any).AudioContext = MockAudioContext;

    render(<CelebrationEffects />);

    // Mock canvas dimensions
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.width = 800;
      canvas.height = 600;
    }

    expect(() => {
      triggerCelebration({ type: 'poppers', playAudio: true });
    }).not.toThrow();

    expect(resumeMock).toHaveBeenCalled();
  });

  it('safely catches when resume() returns a rejecting promise', async () => {
    const rejectedPromise = Promise.reject(new Error('Autoplay blocked'));
    // Attach a noop catch so Node doesn't trigger unhandledRejection if evaluated lazily
    rejectedPromise.catch(() => {});
    const resumeMock = vi.fn().mockReturnValue(rejectedPromise);

    const createOscillatorMock = vi.fn().mockReturnValue({
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    });
    const createGainMock = vi.fn().mockReturnValue({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    });

    class MockAudioContext {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      resume = resumeMock;
      createOscillator = createOscillatorMock;
      createGain = createGainMock;
    }

    (window as any).AudioContext = MockAudioContext;

    render(<CelebrationEffects />);

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.width = 800;
      canvas.height = 600;
    }

    expect(() => {
      triggerCelebration({ type: 'ticket-rip', playAudio: true });
    }).not.toThrow();

    expect(resumeMock).toHaveBeenCalled();
  });
});
