'use client';

import { useCallback, useEffect, useState } from 'react';
import { appRoutes } from './routes';

/**
 * Plan 71: Daily Missions take the traveler to the page where the task happens and
 * briefly highlight the control to use there (`?mission=<kind>` or a same-page event).
 */
export type MissionTargetKind = 'qotd' | 'cheer_post' | 'read_story' | 'check_in' | 'quest_step';

export const MISSION_HIGHLIGHT_EVENT = 'jdq:mission-highlight';
export const MISSION_HIGHLIGHT_MS = 4500;

const KINDS: MissionTargetKind[] = ['qotd', 'cheer_post', 'read_story', 'check_in', 'quest_step'];

export function isMissionKind(value: unknown): value is MissionTargetKind {
  return typeof value === 'string' && (KINDS as string[]).includes(value);
}

export interface MissionTarget {
  kind: MissionTargetKind;
  href: string;
  ctaLabel: string;
}

/** Maps a daily mission (`mission.kind` from `/me/daily`) to the page where it is done. */
export function resolveMissionTarget(kind: string, options?: { hiddenGemSpotId?: string | null }): MissionTarget {
  switch (kind) {
    case 'qotd':
      return { kind: 'qotd', href: '/dashboard?mission=qotd#qotd-card', ctaLabel: 'Answer' };
    case 'cheer_post':
      return { kind: 'cheer_post', href: '/plaza?mission=cheer_post', ctaLabel: 'Cheer' };
    case 'read_story':
      return {
        kind: 'read_story',
        href: options?.hiddenGemSpotId
          ? `${appRoutes.spot(options.hiddenGemSpotId)}?mission=read_story`
          : '/explore?mission=read_story',
        ctaLabel: 'Read',
      };
    case 'check_in':
      return { kind: 'check_in', href: '/map?mission=check_in', ctaLabel: 'Check in' };
    default:
      return { kind: 'quest_step', href: '/quests?mission=quest_step', ctaLabel: 'Play' };
  }
}

/** Same-page guidance (e.g. the QOTD mission while already on /dashboard). */
export function requestMissionHighlight(kind: MissionTargetKind): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MISSION_HIGHLIGHT_EVENT, { detail: { kind } }));
}

/**
 * Highlights a target for `durationMs` when the page opens with `?mission=<kind>` or when
 * `requestMissionHighlight(kind)` fires. The query is removed so a reload does not replay it.
 * Reads `window.location` instead of `useSearchParams` so pages need no Suspense boundary.
 * `ready: false` holds the request until the target exists (e.g. a feed still loading).
 */
export function useMissionHighlight(
  expected: MissionTargetKind | MissionTargetKind[],
  options?: { durationMs?: number; scrollElementId?: string; ready?: boolean },
) {
  const durationMs = options?.durationMs ?? MISSION_HIGHLIGHT_MS;
  const scrollElementId = options?.scrollElementId;
  const ready = options?.ready ?? true;
  const kindsKey = (Array.isArray(expected) ? expected : [expected]).join(',');
  // The requested kind; it shows once the page is ready and clears itself after durationMs.
  const [requested, setRequested] = useState<MissionTargetKind | null>(null);

  const dismiss = useCallback(() => setRequested(null), []);
  const trigger = useCallback((kind: MissionTargetKind) => setRequested(kind), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('mission');
    if (!isMissionKind(param) || !kindsKey.split(',').includes(param)) return;
    url.searchParams.delete('mission');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    trigger(param);
  }, [kindsKey, trigger]);

  useEffect(() => {
    const handler = (event: Event) => {
      const kind = (event as CustomEvent<{ kind?: unknown }>).detail?.kind;
      if (isMissionKind(kind) && kindsKey.split(',').includes(kind)) trigger(kind);
    };
    window.addEventListener(MISSION_HIGHLIGHT_EVENT, handler);
    return () => window.removeEventListener(MISSION_HIGHLIGHT_EVENT, handler);
  }, [kindsKey, trigger]);

  const activeKind = ready ? requested : null;

  useEffect(() => {
    if (!activeKind) return;
    if (scrollElementId) {
      window.requestAnimationFrame(() => {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        document.getElementById(scrollElementId)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      });
    }
    const timer = window.setTimeout(() => setRequested(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [activeKind, durationMs, scrollElementId]);

  return { isHighlighted: activeKind !== null, activeKind, dismiss, trigger };
}
