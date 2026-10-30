import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestMissionHighlight, resolveMissionTarget, useMissionHighlight, type MissionTargetKind } from './mission-guidance';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('resolveMissionTarget', () => {
  it('maps every daily mission to the page where it is done', () => {
    expect(resolveMissionTarget('qotd').href).toBe('/dashboard?mission=qotd#qotd-card');
    expect(resolveMissionTarget('cheer_post').href).toBe('/plaza?mission=cheer_post');
    expect(resolveMissionTarget('read_story').href).toBe('/explore?mission=read_story');
    expect(resolveMissionTarget('read_story', { hiddenGemSpotId: 'gem one' }).href).toBe('/spots/gem%20one?mission=read_story');
    expect(resolveMissionTarget('check_in').href).toBe('/map?mission=check_in');
    expect(resolveMissionTarget('quest_step').href).toBe('/quests?mission=quest_step');
    expect(resolveMissionTarget('something_new').kind).toBe('quest_step');
  });
});

function Probe({ kind, ready = true }: { kind: MissionTargetKind; ready?: boolean }) {
  const { isHighlighted } = useMissionHighlight(kind, { durationMs: 1000, ready });
  return <p>{isHighlighted ? 'lit' : 'off'}</p>;
}

describe('useMissionHighlight', () => {
  it('lights up from ?mission=, removes the query, then fades after the duration', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/plaza?board=town&mission=cheer_post#feed');
    render(<Probe kind="cheer_post" />);
    expect(screen.getByText('lit')).toBeTruthy();
    expect(window.location.search).toBe('?board=town');
    expect(window.location.hash).toBe('#feed');
    act(() => { vi.advanceTimersByTime(1001); });
    expect(screen.getByText('off')).toBeTruthy();
  });

  it('ignores other missions and waits until the target is ready', () => {
    window.history.replaceState(null, '', '/quests?mission=check_in');
    const view = render(<Probe kind="quest_step" />);
    expect(screen.getByText('off')).toBeTruthy();
    expect(window.location.search).toBe('?mission=check_in');

    view.rerender(<Probe kind="check_in" ready={false} />);
    act(() => { requestMissionHighlight('check_in'); });
    expect(screen.getByText('off')).toBeTruthy();
    view.rerender(<Probe kind="check_in" ready />);
    expect(screen.getByText('lit')).toBeTruthy();
  });
});
