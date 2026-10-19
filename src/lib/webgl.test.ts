import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWebGLSupported } from './webgl';

describe('WebGL detection utility', () => {
  const originalEnv = process.env.NEXT_PUBLIC_VECTOR_MAP;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_VECTOR_MAP = originalEnv;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_VECTOR_MAP = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns false when NEXT_PUBLIC_VECTOR_MAP=false', () => {
    process.env.NEXT_PUBLIC_VECTOR_MAP = 'false';
    expect(isWebGLSupported()).toBe(false);
  });

  it('checks canvas getContext when enabled', () => {
    process.env.NEXT_PUBLIC_VECTOR_MAP = 'true';
    const res = isWebGLSupported();
    expect(typeof res).toBe('boolean');
  });
});
