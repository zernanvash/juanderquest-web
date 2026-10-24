'use client';
import React from 'react';

type BannerAsset = { style?: string; generator?: string; colors?: string[]; angle?: number; pattern?: string };
type ProfileBannerProps = {
  asset?: BannerAsset;
  seed?: number;
  motion?: 'auto' | 'still';
  aspect?: number;
  children?: React.ReactNode;
  className?: string;
};

export function ProfileBanner({ asset, seed, motion = 'auto', aspect = 3, children, className = '' }: ProfileBannerProps) {
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
  return <div aria-label="Profile banner" className={`relative isolate overflow-hidden ${className}`} style={{ background: `linear-gradient(${angle}deg,${colors.join(',')})` }}>
    {asset?.style === 'procedural' && <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full" />}
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/3 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
    {mark && <span aria-hidden="true" className="pointer-events-none absolute right-3 top-0 z-[1] select-none text-7xl font-black text-white/10">{mark}</span>}
    <div className="relative z-[2] h-full">{children}</div>
  </div>;
}
