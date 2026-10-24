import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { ProfileBanner } from '../ProfileBanner';
import { generators, mulberry32, paletteColors, type GeneratorId } from './index';
import { animateProceduralBanner } from './runtime';

const ids = Object.keys(generators) as GeneratorId[];

function createTraceContext() {
  const trace: string[] = [];
  const gradient = (kind: string, args: unknown[]) => {
    trace.push(`${kind}:${JSON.stringify(args)}`);
    return { addColorStop: (offset: number, color: string) => trace.push(`stop:${offset}:${color}`) };
  };
  const hashPixels = (data: Uint8ClampedArray) => {
    let hash = 0x811c9dc5;
    for (const value of data) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  };
  const base = {
    createLinearGradient: (...args: unknown[]) => gradient('linear', args),
    createRadialGradient: (...args: unknown[]) => gradient('radial', args),
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: (image: ImageData) => trace.push(`pixels:${hashPixels(image.data)}`),
    drawImage: (image: HTMLCanvasElement, ...args: unknown[]) => trace.push(`image:${image.width}x${image.height}:${JSON.stringify(args)}`),
  };
  const context = new Proxy(base as Record<string, unknown>, {
    get(target, key) {
      if (key in target) return target[key as string];
      if (typeof key !== 'string') return undefined;
      return (...args: unknown[]) => trace.push(`${key}:${JSON.stringify(args)}`);
    },
    set(_target, key, value) {
      trace.push(`set:${String(key)}:${String(value)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { context, trace };
}

function mockCanvasContext() {
  const traces: string[][] = [];
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) => {
    if (kind !== '2d') return null;
    const result = createTraceContext();
    traces.push(result.trace);
    return result.context;
  }) as typeof HTMLCanvasElement.prototype.getContext);
  return { spy, traces };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('procedural banner generators', () => {
  it.each(ids.flatMap((id) => Object.entries(paletteColors[id]).map(([palette, colors]) => [id, palette, colors] as const)))(
    '%s / %s creates and draws a frame', (_id, _palette, colors) => {
      mockCanvasContext();
      const generator = generators[_id];
      const draw = generator.create(mulberry32(0x12345678), 240, 80, colors);
      expect(() => draw(document.createElement('canvas').getContext('2d')!, 6, 0)).not.toThrow();
    },
  );

  it.each(ids)('%s has a deterministic first-frame drawing trace for the same seed', (id) => {
    mockCanvasContext();
    const colors = Object.values(paletteColors[id])[0];
    const renderFrame = () => {
      const { context, trace } = createTraceContext();
      generators[id].create(mulberry32(0x5eed1234), 240, 80, colors)(context, 6, 0);
      return trace;
    };
    expect(renderFrame()).toEqual(renderFrame());
  });
});

describe('procedural banner runtime', () => {
  it('draws a still frame and schedules no animation under reduced motion', () => {
    const { spy, traces } = mockCanvasContext();
    const requestFrame = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const canvas = document.createElement('canvas');
    const dispose = animateProceduralBanner(canvas, {
      style: 'procedural', generator: 'sunset', colors: paletteColors.sunset.golden,
    }, 123, 'auto');

    expect(spy).toHaveBeenCalled();
    expect(traces.some((trace) => trace.length > 0)).toBe(true);
    expect(requestFrame).not.toHaveBeenCalled();
    dispose();
  });

  it('cancels the shared animation frame when a banner unmounts', async () => {
    mockCanvasContext();
    const requestFrame = vi.fn(() => 42);
    const cancelFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const view = render(<ProfileBanner asset={{
      style: 'procedural', generator: 'sunset', colors: paletteColors.sunset.golden,
    }} seed={42} />);
    await waitFor(() => expect(requestFrame).toHaveBeenCalled());
    view.unmount();
    expect(cancelFrame).toHaveBeenCalledWith(42);
  });
});
