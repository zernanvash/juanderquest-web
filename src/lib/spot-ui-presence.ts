/**
 * Spot UI Presence Controller
 *
 * Implements a YouTube-fullscreen-inspired stage presence system:
 * - Controls appear on interaction and auto-hide after ~3s of idle
 * - Exit fade ~200ms; return completes immediately (<= 100ms)
 * - Suspends timer when controls are hovered or keyboard-focused
 * - Fine-pointer cursor hiding while idle
 * - Reduced motion and touch-only devices: controls remain persistently visible
 */

export const SPOT_CHROME_IDLE_MS = 3000;

export type SpotPresenceState = 'visible' | 'fading' | 'hidden';

export interface SpotPresenceOptions {
  idleMs?: number;
  onStateChange?: (state: SpotPresenceState) => void;
  isReducedMotion?: () => boolean;
  isFinePointer?: () => boolean;
}

export class SpotPresenceController {
  private state: SpotPresenceState = 'visible';
  private idleMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private fadingTimer: ReturnType<typeof setTimeout> | null = null;
  private isSuspended = false;
  private onStateChange?: (state: SpotPresenceState) => void;
  private checkReducedMotion: () => boolean;
  private checkFinePointer: () => boolean;

  constructor(options: SpotPresenceOptions = {}) {
    this.idleMs = options.idleMs ?? SPOT_CHROME_IDLE_MS;
    this.onStateChange = options.onStateChange;
    this.checkReducedMotion = options.isReducedMotion ?? (() => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    this.checkFinePointer = options.isFinePointer ?? (() => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
      return window.matchMedia('(pointer: fine)').matches;
    });
  }

  public getState(): SpotPresenceState {
    return this.state;
  }

  public wake(): void {
    if (this.checkReducedMotion() || !this.checkFinePointer()) {
      this.setState('visible');
      this.clearTimers();
      return;
    }
    this.setState('visible');
    this.resetTimer();
  }

  public toggle(): void {
    if (this.state === 'visible') {
      this.clearTimers();
      this.setState('hidden');
    } else {
      this.wake();
    }
  }

  public suspend(): void {
    this.isSuspended = true;
    this.clearTimers();
    this.setState('visible');
  }

  public resume(): void {
    this.isSuspended = false;
    this.resetTimer();
  }

  private resetTimer(): void {
    this.clearTimers();
    if (this.isSuspended) return;
    if (this.checkReducedMotion() || !this.checkFinePointer()) return;

    this.timer = setTimeout(() => {
      this.setState('fading');
      this.fadingTimer = setTimeout(() => {
        this.setState('hidden');
      }, 200);
    }, this.idleMs);
  }

  private clearTimers(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.fadingTimer) {
      clearTimeout(this.fadingTimer);
      this.fadingTimer = null;
    }
  }

  private setState(next: SpotPresenceState): void {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange?.(next);
  }

  public destroy(): void {
    this.clearTimers();
  }
}
