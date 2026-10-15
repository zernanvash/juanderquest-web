import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpotGestureHandler, isInteractiveTarget } from './spot-ui-gestures';

describe('SpotGestureHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers onSingleTap after the double-tap window expires', () => {
    const onSingleTap = vi.fn();
    const onDoubleTap = vi.fn();
    const handler = new SpotGestureHandler({ onSingleTap, onDoubleTap, doubleTapWindowMs: 300 });

    const dummyTarget = document.createElement('div');
    handler.handleTap(dummyTarget);

    expect(onSingleTap).not.toHaveBeenCalled();
    expect(onDoubleTap).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('triggers onDoubleTap and cancels single tap when tapped twice within window', () => {
    const onSingleTap = vi.fn();
    const onDoubleTap = vi.fn();
    const handler = new SpotGestureHandler({ onSingleTap, onDoubleTap, doubleTapWindowMs: 300 });

    const dummyTarget = document.createElement('div');
    handler.handleTap(dummyTarget);

    vi.advanceTimersByTime(150);
    handler.handleTap(dummyTarget);

    expect(onDoubleTap).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    expect(onSingleTap).not.toHaveBeenCalled();
  });

  it('ignores taps on interactive targets (buttons, links)', () => {
    const onSingleTap = vi.fn();
    const onDoubleTap = vi.fn();
    const handler = new SpotGestureHandler({ onSingleTap, onDoubleTap });

    const button = document.createElement('button');
    const link = document.createElement('a');
    const childSpan = document.createElement('span');
    button.appendChild(childSpan);

    expect(isInteractiveTarget(button)).toBe(true);
    expect(isInteractiveTarget(link)).toBe(true);
    expect(isInteractiveTarget(childSpan)).toBe(true);

    handler.handleTap(button);
    handler.handleTap(childSpan);
    vi.advanceTimersByTime(500);

    expect(onSingleTap).not.toHaveBeenCalled();
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('allows cancelling pending taps', () => {
    const onSingleTap = vi.fn();
    const handler = new SpotGestureHandler({ onSingleTap, doubleTapWindowMs: 300 });

    const dummyTarget = document.createElement('div');
    handler.handleTap(dummyTarget);
    handler.cancel();

    vi.advanceTimersByTime(500);
    expect(onSingleTap).not.toHaveBeenCalled();
  });
});
