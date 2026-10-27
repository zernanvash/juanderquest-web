'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

// Register Flip plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(Flip);
}

/**
 * Checks whether user prefers reduced motion (browser or OS level).
 * Gracefully defaults to false in SSR / non-browser environments.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Helper to adjust animation duration according to reduced-motion preferences.
 * When reduced motion is preferred, returns 0 or a minimal crossfade duration (<= 0.15s).
 *
 * @param durationInSeconds Normal target duration in seconds
 * @param fallbackDurationInSeconds Reduced-motion fallback duration (defaults to 0)
 */
export function motionDuration(durationInSeconds: number, fallbackDurationInSeconds = 0): number {
  if (prefersReducedMotion()) {
    return Math.min(fallbackDurationInSeconds, 0.15);
  }
  return durationInSeconds;
}

/**
 * Standard JuanDerQuest animation ease definitions
 */
export const GSAP_EASES = {
  bounceOut: 'back.out(1.6)',
  overshoot: 'back.out(2)',
  fluidOut: 'power2.out',
  cinematic: 'power3.out',
  smoothInOut: 'power2.inOut',
} as const;

export { gsap, useGSAP, Flip };
