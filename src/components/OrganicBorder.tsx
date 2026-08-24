'use client';

import React, { useMemo } from 'react';

export interface OrganicBorderProps {
  children: React.ReactNode;
  variant?: 'vines' | 'golden-leaves' | 'woodland' | 'subtle-tendrils';
  density?: 'subtle' | 'medium' | 'lush';
  seed?: string | number;
  cornerOnly?: boolean;
  interactive?: boolean;
  className?: string;
  contentClassName?: string;
  badgeText?: string;
}

// Simple Linear Congruential Generator for deterministic procedural generation
function createPRNG(seedStr: string | number) {
  let hash = 0;
  const str = String(seedStr);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  let s = Math.abs(hash) || 123456789;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const OrganicBorder: React.FC<OrganicBorderProps> = ({
  children,
  variant = 'vines',
  density = 'medium',
  seed = 'juanderquest',
  cornerOnly = false,
  interactive = true,
  className = '',
  contentClassName = '',
  badgeText,
}) => {
  // Deterministically compute procedural offsets and leaf rotations from seed
  const proceduralData = useMemo(() => {
    const prng = createPRNG(seed);
    const leafCount = density === 'subtle' ? 2 : density === 'medium' ? 4 : 6;

    const generateCornerData = (baseAngle: number) => {
      const leaves = [];
      for (let i = 0; i < leafCount; i++) {
        leaves.push({
          angle: baseAngle + (prng() * 40 - 20),
          scale: 0.75 + prng() * 0.45,
          offsetDistance: 12 + i * 10 + prng() * 6,
          isGold: prng() > 0.65,
        });
      }
      return {
        stemCurl: prng() > 0.5 ? 1 : -1,
        tendrilLength: 28 + prng() * 16,
        leaves,
      };
    };

    return {
      topLeft: generateCornerData(45),
      topRight: generateCornerData(135),
      bottomLeft: generateCornerData(-45),
      bottomRight: generateCornerData(-135),
    };
  }, [seed, density]);

  // Color schemes for botanical presets
  const themeColors = useMemo(() => {
    switch (variant) {
      case 'golden-leaves':
        return {
          stem: '#7D5800',
          stemGlow: '#FFB703',
          leafPrimary: '#FFB703',
          leafSecondary: '#F59E0B',
          leafAccent: '#FFF3CD',
          tendril: '#D97706',
        };
      case 'woodland':
        return {
          stem: '#582F0E',
          stemGlow: '#837560',
          leafPrimary: '#2D6A4F',
          leafSecondary: '#1B4332',
          leafAccent: '#D5C4AC',
          tendril: '#7D5800',
        };
      case 'subtle-tendrils':
        return {
          stem: '#2D6A4F',
          stemGlow: '#52B788',
          leafPrimary: '#52B788',
          leafSecondary: '#2D6A4F',
          leafAccent: '#D8F3DC',
          tendril: '#40916C',
        };
      case 'vines':
      default:
        return {
          stem: '#2D6A4F',
          stemGlow: '#48C71D',
          leafPrimary: '#48C71D',
          leafSecondary: '#2D6A4F',
          leafAccent: '#FFB703',
          tendril: '#52B788',
        };
    }
  }, [variant]);

  // Reusable SVG Leaf Stamp Component
  const renderLeaf = (x: number, y: number, angle: number, scale: number, isGold: boolean, key: string | number) => {
    const leafFill = isGold ? themeColors.leafAccent : themeColors.leafPrimary;
    const leafStroke = isGold ? themeColors.leafSecondary : themeColors.stem;

    return (
      <g
        key={key}
        transform={`translate(${x}, ${y}) rotate(${angle}) scale(${scale})`}
        className={interactive ? 'transition-transform duration-500 hover:scale-125' : ''}
      >
        {/* Leaf blade shape */}
        <path
          d="M 0 0 C -4 -7 -8 -12 0 -18 C 8 -12 4 -7 0 0 Z"
          fill={leafFill}
          stroke={leafStroke}
          strokeWidth="0.8"
          className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
        />
        {/* Central leaf vein */}
        <line x1="0" y1="0" x2="0" y2="-15" stroke={leafStroke} strokeWidth="0.6" strokeLinecap="round" />
      </g>
    );
  };

  return (
    <div className={`relative group ${className}`}>
      {/* ===================================================================== */}
      {/* PROCEDURAL BOTANICAL SVG VINE OVERLAY (POINTER-EVENTS-NONE)           */}
      {/* ===================================================================== */}
      <svg
        className="absolute -inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)] pointer-events-none z-10 overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle nature glow filter */}
          <filter id={`vine-glow-${seed}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ----------------------------------------------------------------- */}
        {/* 1. PERIMETER PROCEDURAL VINE PATHS (WHEN NOT CORNER-ONLY)         */}
        {/* ----------------------------------------------------------------- */}
        {!cornerOnly && (
          <g className={interactive ? 'group-hover:opacity-95 transition-opacity duration-300' : ''} opacity="0.85">
            {/* Top Border Undulating Vine */}
            <path
              d="M 35 12 Q 100 8, 180 14 T 320 10 T 480 13 T 640 10 T 800 13 T 960 10 T 1120 13 T 1280 10"
              fill="none"
              stroke={themeColors.stem}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeDasharray={variant === 'subtle-tendrils' ? '4 3' : 'none'}
            />
            {/* Bottom Border Undulating Vine */}
            <path
              d="M 35 calc(100% - 12px) Q 120 calc(100% - 16px), 240 calc(100% - 10px) T 480 calc(100% - 14px) T 720 calc(100% - 11px) T 960 calc(100% - 14px) T 1200 calc(100% - 11px)"
              fill="none"
              stroke={themeColors.stem}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 2. TOP-LEFT BOTANICAL CORNER FLOURISH                             */}
        {/* ----------------------------------------------------------------- */}
        <g className="origin-top-left">
          {/* Curving stem */}
          <path
            d="M 8 36 C 8 20, 20 8, 36 8 C 48 8, 54 12, 60 10"
            fill="none"
            stroke={themeColors.stem}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Spiraling tendril */}
          <path
            d="M 36 8 C 42 4, 46 0, 52 4 C 55 7, 50 11, 47 9"
            fill="none"
            stroke={themeColors.tendril}
            strokeWidth="1"
            strokeLinecap="round"
            className={interactive ? 'group-hover:animate-pulse transition duration-700' : ''}
          />
          {/* Corner Leaves */}
          {proceduralData.topLeft.leaves.map((leaf, idx) =>
            renderLeaf(
              12 + Math.cos((leaf.angle * Math.PI) / 180) * leaf.offsetDistance,
              12 + Math.sin((leaf.angle * Math.PI) / 180) * leaf.offsetDistance,
              leaf.angle,
              leaf.scale,
              leaf.isGold,
              `tl-${idx}`
            )
          )}
        </g>

        {/* ----------------------------------------------------------------- */}
        {/* 3. TOP-RIGHT BOTANICAL CORNER FLOURISH                            */}
        {/* ----------------------------------------------------------------- */}
        <g transform="translate(100%, 0) scale(-1, 1)" className="origin-top-right">
          <path
            d="M 8 36 C 8 20, 20 8, 36 8 C 48 8, 54 12, 60 10"
            fill="none"
            stroke={themeColors.stem}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M 36 8 C 42 4, 46 0, 52 4 C 55 7, 50 11, 47 9"
            fill="none"
            stroke={themeColors.tendril}
            strokeWidth="1"
            strokeLinecap="round"
          />
          {proceduralData.topRight.leaves.map((leaf, idx) =>
            renderLeaf(
              12 + Math.cos((leaf.angle * Math.PI) / 180) * leaf.offsetDistance,
              12 + Math.sin((leaf.angle * Math.PI) / 180) * leaf.offsetDistance,
              leaf.angle,
              leaf.scale,
              leaf.isGold,
              `tr-${idx}`
            )
          )}
        </g>

        {/* ----------------------------------------------------------------- */}
        {/* 4. BOTTOM-LEFT BOTANICAL CORNER FLOURISH                          */}
        {/* ----------------------------------------------------------------- */}
        <g transform="translate(0, 100%) scale(1, -1)" className="origin-bottom-left">
          <path
            d="M 8 36 C 8 20, 20 8, 36 8 C 48 8, 54 12, 60 10"
            fill="none"
            stroke={themeColors.stem}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {proceduralData.bottomLeft.leaves.map((leaf, idx) =>
            renderLeaf(
              12 + Math.cos((leaf.angle * Math.PI) / 180) * leaf.offsetDistance,
              12 + Math.sin((leaf.angle * Math.PI) / 180) * leaf.offsetDistance,
              leaf.angle,
              leaf.scale,
              leaf.isGold,
              `bl-${idx}`
            )
          )}
        </g>

        {/* ----------------------------------------------------------------- */}
        {/* 5. BOTTOM-RIGHT BOTANICAL CORNER FLOURISH                         */}
        {/* ----------------------------------------------------------------- */}
        <g transform="translate(100%, 100%) scale(-1, -1)" className="origin-bottom-right">
          <path
            d="M 8 36 C 8 20, 20 8, 36 8 C 48 8, 54 12, 60 10"
            fill="none"
            stroke={themeColors.stem}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M 36 8 C 42 4, 46 0, 52 4 C 55 7, 50 11, 47 9"
            fill="none"
            stroke={themeColors.tendril}
            strokeWidth="1"
            strokeLinecap="round"
          />
          {proceduralData.bottomRight.leaves.map((leaf, idx) =>
            renderLeaf(
              12 + Math.cos((leaf.angle * Math.PI) / 180) * leaf.offsetDistance,
              12 + Math.sin((leaf.angle * Math.PI) / 180) * leaf.offsetDistance,
              leaf.angle,
              leaf.scale,
              leaf.isGold,
              `br-${idx}`
            )
          )}
        </g>
      </svg>

      {/* Optional Eco Badge Pill */}
      {badgeText && (
        <div className="absolute -top-3.5 left-6 z-20 px-3 py-0.5 rounded-full bg-[#FAF9F5] border border-[#2D6A4F]/40 text-[#2D6A4F] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
          <span>🌿</span>
          <span>{badgeText}</span>
        </div>
      )}

      {/* Actual Inner Content (Unmodified Layout) */}
      <div className={`relative z-0 ${contentClassName}`}>{children}</div>
    </div>
  );
};
