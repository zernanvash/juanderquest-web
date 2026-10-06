'use client';

import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// 1. Pixel Art Search Icon
// ==========================================

export interface PixelSearchIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number | string;
  className?: string;
}

/**
 * PixelSearchIcon: Retro RPG pixel art magnifying glass (36x36 source asset).
 * Rendered with nearest-neighbor crisp pixel edges (`image-rendering: pixelated`).
 */
export const PixelSearchIcon: React.FC<PixelSearchIconProps> = ({
  size,
  className = '',
  alt = 'Search',
  style,
  ...rest
}) => {
  const inlineStyle: React.CSSProperties = { ...style };
  if (typeof size === 'number') {
    inlineStyle.width = `${size}px`;
    inlineStyle.height = `${size}px`;
  } else if (typeof size === 'string') {
    inlineStyle.width = size;
    inlineStyle.height = size;
  }

  return (
    <img
      src="/icons/search.png"
      alt={alt}
      width={typeof size === 'number' ? size : 20}
      height={typeof size === 'number' ? size : 20}
      className={`pixel-art-icon object-contain select-none pointer-events-none inline-block ${className}`}
      style={inlineStyle}
      draggable={false}
      {...rest}
    />
  );
};

// ==========================================
// 2. Pixel Art Animated Heart Icon
// ==========================================

export type PixelHeartSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface PixelHeartProps {
  isLiked: boolean;
  size?: PixelHeartSize;
  className?: string;
  onAnimationComplete?: () => void;
  'aria-hidden'?: boolean | 'true' | 'false';
  title?: string;
}

const SIZE_PRESETS: Record<string, { w: number; h: number; scale: number }> = {
  xs: { w: 14, h: 16, scale: 16 / 36 },
  sm: { w: 18, h: 20, scale: 20 / 36 },
  md: { w: 22, h: 25, scale: 25 / 36 },
  lg: { w: 28, h: 32, scale: 32 / 36 },
  xl: { w: 32, h: 36, scale: 1 },
};

/**
 * PixelHeart: Gamified pixel art ruby gem heart with spritesheet animation.
 * - When transitioning from unliked -> liked: plays shining sparkle animation (12 frames, 450ms).
 * - When transitioning from liked -> unliked: plays shattered break animation (13 frames, 480ms).
 * - Idle state: displays crisp static ruby heart or dark empty socket.
 */
export const PixelHeart: React.FC<PixelHeartProps> = ({
  isLiked,
  size = 'md',
  className = '',
  onAnimationComplete,
  'aria-hidden': ariaHidden = true,
  title,
}) => {
  const [animState, setAnimState] = useState<'idle' | 'liking' | 'unliking'>('idle');
  const [animKey, setAnimKey] = useState<number>(0);
  const prevLiked = useRef<boolean>(isLiked);
  const isMounted = useRef<boolean>(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      prevLiked.current = isLiked;
      return;
    }

    if (prevLiked.current !== isLiked) {
      const nextState = isLiked ? 'liking' : 'unliking';
      setAnimState(nextState);
      setAnimKey((prev) => prev + 1);
      prevLiked.current = isLiked;

      // Settle back to idle state matching CSS animation durations (450ms like, 480ms unlike)
      const duration = nextState === 'liking' ? 460 : 490;
      const timer = setTimeout(() => {
        setAnimState('idle');
        onAnimationComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isLiked, onAnimationComplete]);

  const handleAnimationEnd = () => {
    setAnimState('idle');
    onAnimationComplete?.();
  };

  // Determine scaling & container dimensions
  let config = SIZE_PRESETS.md;
  if (typeof size === 'number') {
    const scale = size / 36;
    config = {
      w: Math.round(32 * scale),
      h: size,
      scale,
    };
  } else if (size in SIZE_PRESETS) {
    config = SIZE_PRESETS[size];
  }

  let animClass = 'pixel-heart-static-unliked';
  if (animState === 'liking') {
    animClass = 'pixel-heart-anim-like';
  } else if (animState === 'unliking') {
    animClass = 'pixel-heart-anim-unlike';
  } else if (isLiked) {
    animClass = 'pixel-heart-static-liked';
  } else {
    animClass = 'pixel-heart-static-unliked';
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 overflow-visible relative select-none pointer-events-none ${className}`}
      style={{ width: `${config.w}px`, height: `${config.h}px` }}
      aria-hidden={ariaHidden}
      title={title}
    >
      <span
        key={animKey}
        data-anim-state={animState}
        data-is-liked={isLiked ? 'true' : 'false'}
        className={`pixel-heart-sprite ${animClass}`}
        style={{
          transform: `scale(${config.scale})`,
          transformOrigin: 'center center',
        }}
        onAnimationEnd={handleAnimationEnd}
      />
    </span>
  );
};

// ==========================================
// 3. Pixel Art Heart Toggle Button
// ==========================================

export interface PixelHeartButtonProps {
  isLiked: boolean;
  onToggle: () => void;
  count?: number;
  label?: string;
  size?: PixelHeartSize;
  className?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}

export const PixelHeartButton: React.FC<PixelHeartButtonProps> = ({
  isLiked,
  onToggle,
  count,
  label,
  size = 'md',
  className = '',
  disabled = false,
  title,
  'aria-label': ariaLabel,
}) => {
  const displayLabel = label ?? (isLiked ? 'Liked' : 'Like');
  const displayCount = count !== undefined ? (count > 0 ? count : null) : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={title || (isLiked ? 'Unlike' : 'Like')}
      aria-label={ariaLabel || (isLiked ? 'Unlike destination' : 'Like destination')}
      className={`btn-tactile inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl transition duration-150 cursor-pointer min-h-[38px] ${
        isLiked
          ? 'bg-rose-50 text-rose-600 font-bold border border-rose-200 shadow-2xs'
          : 'hover:bg-[#FAF9F5] text-[#582F0E] border border-transparent'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      <PixelHeart isLiked={isLiked} size={size} />
      <span className="text-xs font-extrabold">{displayCount ?? displayLabel}</span>
    </button>
  );
};
