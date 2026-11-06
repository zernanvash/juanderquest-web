'use client';

import { useEffect, useRef } from 'react';

/**
 * The app's DitherBackground (shaders/dither_bg.frag) for the web: vertical colour bands blended
 * with 4×4 ordered (Bayer) dithering on a coarse grid. Drawn at one canvas pixel per cell and
 * scaled up with `image-rendering: pixelated`, fixed behind the page like an app screen.
 */

function hex(color: string): [number, number, number] {
  const n = Number.parseInt(color.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const fract = (v: number) => v - Math.floor(v);
const bayer2 = (x: number, y: number) => fract(Math.floor(x) / 2 + Math.floor(y) * Math.floor(y) * 0.75);
const bayer4 = (x: number, y: number) => bayer2(0.5 * x, 0.5 * y) * 0.25 + bayer2(x, y);

export function DitherBackdrop({
  top,
  bottom,
  bands = 6,
  cell = 4,
}: {
  top: string;
  bottom: string;
  bands?: number;
  cell?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const a = hex(top);
    const b = hex(bottom);
    const draw = () => {
      const cols = Math.ceil(window.innerWidth / cell);
      const rows = Math.ceil(window.innerHeight / cell);
      canvas.width = cols;
      canvas.height = rows;
      // Whole cells only, so every dither cell is the same size on screen.
      canvas.style.width = `${cols * cell}px`;
      canvas.style.height = `${rows * cell}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const image = ctx.createImageData(cols, rows);
      for (let y = 0; y < rows; y++) {
        const scaled = (rows <= 1 ? 0 : y / rows) * bands;
        const base = Math.floor(scaled);
        const frac = scaled - base;
        for (let x = 0; x < cols; x++) {
          const step = base + (frac > bayer4(x, y) ? 1 : 0);
          const k = Math.min(Math.max(step / bands, 0), 1);
          const i = (y * cols + x) * 4;
          image.data[i] = Math.round(a[0] + (b[0] - a[0]) * k);
          image.data[i + 1] = Math.round(a[1] + (b[1] - a[1]) * k);
          image.data[i + 2] = Math.round(a[2] + (b[2] - a[2]) * k);
          image.data[i + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [top, bottom, bands, cell]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        imageRendering: 'pixelated',
        zIndex: 0,
        background: top,
      }}
    />
  );
}
