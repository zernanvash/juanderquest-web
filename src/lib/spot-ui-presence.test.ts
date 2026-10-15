import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpotPresenceController, SPOT_CHROME_IDLE_MS } from './spot-ui-presence';

describe('SpotPresenceController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in visible state', () => {
    const controller = new SpotPresenceController();
    expect(controller.getState()).toBe('visible');
    controller.destroy();
  });

  it('transitions from visible to fading then hidden after idle timeout on fine pointer devices', () => {
    const onStateChange = vi.fn();
    const controller = new SpotPresenceController({
      idleMs: 3000,
      onStateChange,
      isReducedMotion: () => false,
      isFinePointer: () => true,
    });

    controller.wake();
    expect(controller.getState()).toBe('visible');

    // Advance 3000ms -> should fade
    vi.advanceTimersByTime(3000);
    expect(controller.getState()).toBe('fading');
    expect(onStateChange).toHaveBeenCalledWith('fading');

    // Advance 200ms -> should become hidden
    vi.advanceTimersByTime(200);
    expect(controller.getState()).toBe('hidden');
    expect(onStateChange).toHaveBeenCalledWith('hidden');

    controller.destroy();
  });

  it('wakes up immediately to visible when wake() is called', () => {
    const onStateChange = vi.fn();
    const controller = new SpotPresenceController({
      idleMs: 3000,
      onStateChange,
      isReducedMotion: () => false,
      isFinePointer: () => true,
    });

    controller.wake();
    vi.advanceTimersByTime(3200);
    expect(controller.getState()).toBe('hidden');

    controller.wake();
    expect(controller.getState()).toBe('visible');
    expect(onStateChange).toHaveBeenLastCalledWith('visible');

    controller.destroy();
  });

  it('suspends auto-hide when suspended (e.g. hovered or focused) and resumes timer when resumed', () => {
    const onStateChange = vi.fn();
    const controller = new SpotPresenceController({
      idleMs: 3000,
      onStateChange,
      isReducedMotion: () => false,
      isFinePointer: () => true,
    });

    controller.wake();
    vi.advanceTimersByTime(2000);

    // Hover or focus suspends timer
    controller.suspend();
    vi.advanceTimersByTime(5000);
    expect(controller.getState()).toBe('visible');

    // Unhover resumes
    controller.resume();
    vi.advanceTimersByTime(3000);
    expect(controller.getState()).toBe('fading');
    vi.advanceTimersByTime(200);
    expect(controller.getState()).toBe('hidden');

    controller.destroy();
  });

  it('toggles between visible and hidden', () => {
    const controller = new SpotPresenceController({
      isReducedMotion: () => false,
      isFinePointer: () => true,
    });

    expect(controller.getState()).toBe('visible');
    controller.toggle();
    expect(controller.getState()).toBe('hidden');
    controller.toggle();
    expect(controller.getState()).toBe('visible');

    controller.destroy();
  });

  it('remains visible permanently when prefers-reduced-motion is true', () => {
    const onStateChange = vi.fn();
    const controller = new SpotPresenceController({
      idleMs: 1000,
      onStateChange,
      isReducedMotion: () => true,
      isFinePointer: () => true,
    });

    controller.wake();
    vi.advanceTimersByTime(10000);
    expect(controller.getState()).toBe('visible');
    expect(onStateChange).not.toHaveBeenCalledWith('fading');
    expect(onStateChange).not.toHaveBeenCalledWith('hidden');

    controller.destroy();
  });

  it('remains visible permanently on touch-only devices without fine pointer', () => {
    const onStateChange = vi.fn();
    const controller = new SpotPresenceController({
      idleMs: 1000,
      onStateChange,
      isReducedMotion: () => false,
      isFinePointer: () => false,
    });

    controller.wake();
    vi.advanceTimersByTime(10000);
    expect(controller.getState()).toBe('visible');

    controller.destroy();
  });
});
