/**
 * Spot UI Gestures Handler
 *
 * Provides tap and double-tap disambiguation for the destination hero stage:
 * - Single tap toggles or wakes stage chrome
 * - Double tap opens the fullscreen gallery lightbox
 * - Ignores taps that originate from interactive children (links, buttons, inputs)
 * - Stage swipes and pinch-zooms do nothing by deliberate design
 */

export const SPOT_DOUBLE_TAP_WINDOW_MS = 300;

export interface SpotGestureOptions {
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  doubleTapWindowMs?: number;
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest('a, button, input, textarea, select, [role="button"]'));
}

export class SpotGestureHandler {
  private lastTapTime = 0;
  private tapTimeout: ReturnType<typeof setTimeout> | null = null;
  private doubleTapWindowMs: number;
  private onSingleTap?: () => void;
  private onDoubleTap?: () => void;

  constructor(options: SpotGestureOptions = {}) {
    this.doubleTapWindowMs = options.doubleTapWindowMs ?? SPOT_DOUBLE_TAP_WINDOW_MS;
    this.onSingleTap = options.onSingleTap;
    this.onDoubleTap = options.onDoubleTap;
  }

  public handleTap(target: EventTarget | null): void {
    if (isInteractiveTarget(target)) {
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;

    if (timeSinceLastTap > 0 && timeSinceLastTap < this.doubleTapWindowMs) {
      // Double tap detected
      if (this.tapTimeout) {
        clearTimeout(this.tapTimeout);
        this.tapTimeout = null;
      }
      this.lastTapTime = 0;
      this.onDoubleTap?.();
    } else {
      // First tap
      this.lastTapTime = now;
      if (this.tapTimeout) {
        clearTimeout(this.tapTimeout);
      }
      this.tapTimeout = setTimeout(() => {
        this.onSingleTap?.();
        this.tapTimeout = null;
      }, this.doubleTapWindowMs);
    }
  }

  public cancel(): void {
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }
    this.lastTapTime = 0;
  }
}
