'use client';
import React from 'react';
import type { BannerMotion } from './procedural/runtime';

type BannerAsset = { style?: string; generator?: string; colors?: string[]; angle?: number; pattern?: string };
type ProfileBannerProps = {
  asset?: BannerAsset;
  seed?: number;
  motion?: BannerMotion;
  aspect?: number;
  /** bottom: dark fade for text on the banner. subtle: light fade when text sits below it. none. */
  scrim?: 'bottom' | 'subtle' | 'none';
  children?: React.ReactNode;
  className?: string;
};

export function ProfileBanner({ asset, seed, motion = 'auto', aspect = 3, scrim = 'bottom', children, className = '' }: ProfileBannerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (asset?.style !== 'procedural' || !canvasRef.current) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void import('./procedural/runtime').then(({ animateProceduralBanner }) => {
      if (!cancelled && canvasRef.current) dispose = animateProceduralBanner(canvasRef.current, asset, seed ?? 0, motion, aspect);
    });
    return () => { cancelled = true; dispose?.(); };
  }, [asset, seed, motion, aspect]);

  const colors = Array.isArray(asset?.colors) ? asset.colors : ['#3f6653', '#95d5b2'];
  const angle = Number.isInteger(asset?.angle) ? asset!.angle! : 135;
  const pattern = asset?.pattern || 'none';
  const mark = pattern === 'waves' ? '〰' : pattern === 'islands' ? '⌁' : pattern === 'sun' ? '☼' : pattern === 'capiz' ? '◇' : pattern === 'bamboo' ? '╱' : '';
  // Gradient banners drift slowly so they feel alive too (CSS respects reduced motion unless 'live').
  const drift = asset?.style !== 'procedural' && motion !== 'still' ? (motion === 'live' ? 'cosmetic-gradient-live' : 'cosmetic-gradient-alive') : '';
  return <div aria-label="Profile banner" className={`relative isolate overflow-hidden ${drift} ${className}`} style={{ background: `linear-gradient(${angle}deg,${colors.join(',')})`, ...(drift ? { backgroundSize: '220% 220%' } : {}) }}>
    {asset?.style === 'procedural' && <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full" />}
    {scrim === 'bottom' && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/3 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />}
    {scrim === 'subtle' && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/2 bg-gradient-to-t from-black/25 via-transparent to-transparent" />}
    {mark && <span aria-hidden="true" className={`pointer-events-none absolute right-3 top-0 z-[1] select-none text-7xl font-black text-white/10 ${drift ? 'cosmetic-mark-float' : ''}`}>{mark}</span>}
    <div className="relative z-[2] h-full">{children}</div>
  </div>;
}
