import { describe, it, expect } from 'vitest';
import { generateQrMatrix, generateQrSvgPath } from './qr-svg';

describe('QR SVG Generator (Zero-dependency Model 2)', () => {
  it('generates a valid QR boolean matrix for text', () => {
    const matrix = generateQrMatrix('JDQ-QR-SECRET-1234');
    expect(Array.isArray(matrix)).toBe(true);
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix[0].length).toBe(matrix.length);

    // Finder patterns should have solid 3x3 centers
    // Top-left center: row 2..4, col 2..4
    expect(matrix[3][3]).toBe(true);
    // Top-right center
    expect(matrix[3][matrix.length - 4]).toBe(true);
    // Bottom-left center
    expect(matrix[matrix.length - 4][3]).toBe(true);
  });

  it('generates an SVG path and viewBox', () => {
    const { path, viewBox } = generateQrSvgPath('JDQ-TEST-CODE');
    expect(viewBox).toMatch(/^0 0 \d+ \d+$/);
    expect(path).toContain('M');
    expect(path).toContain('h8v8h-8z');
  });
});
