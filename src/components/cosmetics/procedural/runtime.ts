import { generators, isGeneratorId, mulberry32 } from './index';

type BannerAsset = { style?: string; generator?: string; colors?: string[] };
/**
 * still: one frame at t = 6 (lists, feeds). auto: animates unless the OS asks for reduced motion.
 * live: animates even under reduced motion; only for motion the traveler asked for (opening a
 * preview, hovering a card, or switching animations on) — Plan 69.
 */
export type BannerMotion = 'auto' | 'live' | 'still';
export const isReducedMotion = (motion: BannerMotion, prefersReduced: boolean) =>
  motion === 'still' || (motion === 'auto' && prefersReduced);
type Instance = {
  canvas: HTMLCanvasElement;
  draw: ((ctx: CanvasRenderingContext2D, t: number, dt: number) => void) | null;
  visible: boolean;
  last: number;
  start: number;
  resizeTimer: number | null;
  resizeObserver: ResizeObserver | null;
  reduced: boolean;
};
const instances = new Set<Instance>();
let frameId: number | null = null;
let observer: IntersectionObserver | null = null;
let visibilityBound = false;
const frameMs = 1000 / 30;

const isRunnable = (instance: Instance) => instance.visible && !instance.reduced && !document.hidden && Boolean(instance.draw);
function stopIfIdle() {
  if ([...instances].some(isRunnable)) return;
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null;
}
function tick(now: number) {
  frameId = null;
  for (const instance of instances) {
    if (!isRunnable(instance) || now - instance.last < frameMs) continue;
    const dt = instance.last ? Math.min((now - instance.last) / 1000, .1) : 1 / 30;
    instance.last = now;
    const ctx = instance.canvas.getContext('2d');
    // Start at the same t = 6 phase as the still frame (banner-lab parity) so nothing jumps.
    if (ctx && instance.draw) instance.draw(ctx, 6 + (now - instance.start) / 1000, dt);
  }
  stopIfIdle();
  if (frameId === null && [...instances].some(isRunnable)) frameId = requestAnimationFrame(tick);
}
function startIfNeeded() {
  if (frameId === null && [...instances].some(isRunnable)) frameId = requestAnimationFrame(tick);
}
function drawStill(instance: Instance) {
  const ctx = instance.canvas.getContext('2d');
  if (ctx && instance.draw) instance.draw(ctx, 6, 0);
}
function resize(instance: Instance, generator: string, colors: string[], seed: number, aspect: number) {
  // Size from the rendered box (a dialog can measure 0 on its first frame; fall back to the parent).
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const clientW = instance.canvas.clientWidth || instance.canvas.parentElement?.clientWidth || 320;
  const clientH = instance.canvas.clientHeight || instance.canvas.parentElement?.clientHeight || 0;
  const width = Math.min(Math.max(1, Math.round(clientW * dpr)), 1400);
  // Keep the box proportions when the width hits the 1400 px cap.
  const scale = width / Math.max(1, clientW * dpr);
  const height = Math.max(1, Math.round(clientH > 0 ? clientH * dpr * scale : width / aspect));
  if (instance.canvas.width === width && instance.canvas.height === height && instance.draw) return;
  instance.canvas.width = width;
  instance.canvas.height = height;
  instance.draw = generators[generator as keyof typeof generators].create(mulberry32(seed), width, height, colors);
  instance.last = 0;
  // Paint at once (at the current phase) so the canvas is never blank before the next tick.
  const ctx = instance.canvas.getContext('2d');
  if (ctx && instance.draw) instance.draw(ctx, instance.reduced ? 6 : 6 + (performance.now() - instance.start) / 1000, 0);
  if (!instance.reduced) startIfNeeded();
}

export function animateProceduralBanner(
  canvas: HTMLCanvasElement,
  asset: BannerAsset,
  seed: number,
  motion: BannerMotion,
  aspect = 3,
): () => void {
  if (!isGeneratorId(asset.generator) || !Array.isArray(asset.colors)) return () => undefined;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const instance: Instance = {
    canvas, draw: null, visible: true, last: 0, start: performance.now(), resizeTimer: null,
    resizeObserver: null, reduced: isReducedMotion(motion, media.matches),
  };
  if (!observer && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const target = [...instances].find((item) => item.canvas === entry.target);
        if (target) { target.visible = entry.isIntersecting; if (target.visible) startIfNeeded(); else stopIfIdle(); }
      }
    });
  }
  instances.add(instance);
  observer?.observe(canvas);
  instance.resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => {
    if (instance.resizeTimer !== null) window.clearTimeout(instance.resizeTimer);
    instance.resizeTimer = window.setTimeout(() => resize(instance, asset.generator!, asset.colors!, seed, aspect), 150);
  }) : null;
  instance.resizeObserver?.observe(canvas);
  resize(instance, asset.generator, asset.colors, seed >>> 0, aspect);
  const onMotionChange = (event: MediaQueryListEvent) => { instance.reduced = isReducedMotion(motion, event.matches); if (instance.reduced) drawStill(instance); else { instance.last = 0; startIfNeeded(); } stopIfIdle(); };
  media.addEventListener?.('change', onMotionChange);
  if (!visibilityBound) {
    document.addEventListener('visibilitychange', () => document.hidden ? stopIfIdle() : startIfNeeded());
    visibilityBound = true;
  }
  startIfNeeded();
  return () => {
    observer?.unobserve(canvas);
    instance.resizeObserver?.disconnect();
    if (instance.resizeTimer !== null) window.clearTimeout(instance.resizeTimer);
    media.removeEventListener?.('change', onMotionChange);
    instances.delete(instance);
    stopIfIdle();
  };
}
