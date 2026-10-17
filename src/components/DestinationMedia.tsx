'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Film, AlertCircle, RefreshCw } from 'lucide-react';
import { isVideoMedia } from '@/lib/api';

export interface DestinationMediaProps {
  src?: string;
  alt: string;
  destinationName?: string;
  municipality?: string;
  category?: string;
  aspectRatio?: 'video' | 'card' | 'banner';
  variant?: 'card' | 'thumb' | 'illustration';
  priority?: boolean;
  className?: string;
  hideUnavailable?: boolean;
  href?: string;
}

export function getCategoryIllustrationUrl(category?: string): string {
  const normalized = (category || '').toLowerCase();
  if (normalized.includes('histor') || normalized.includes('church') || normalized.includes('museum') || normalized.includes('heritage') || normalized.includes('cultural')) {
    return '/illustrations/heritage-church.svg';
  }
  if (normalized.includes('food') || normalized.includes('culinary') || normalized.includes('market') || normalized.includes('dining')) {
    return '/illustrations/food-market.svg';
  }
  if (normalized.includes('activit') || normalized.includes('park') || normalized.includes('trail') || normalized.includes('adventure')) {
    return '/illustrations/activities.svg';
  }
  if (normalized.includes('wellness') || normalized.includes('resort') || normalized.includes('spring') || normalized.includes('retreat')) {
    return '/illustrations/wellness.svg';
  }
  return '/illustrations/nature-coast.svg';
}

export const DestinationMedia: React.FC<DestinationMediaProps> = ({
  src,
  alt,
  destinationName,
  municipality,
  category,
  aspectRatio = 'card',
  variant = 'card',
  priority = false,
  className = '',
  hideUnavailable = false,
  href,
}) => {
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const isVideo = isVideoMedia(src);

  const aspectClass =
    variant === 'thumb'
      ? 'w-full h-full'
      : aspectRatio === 'video'
      ? 'aspect-[16/9]'
      : aspectRatio === 'banner'
      ? 'aspect-[21/9]'
      : 'aspect-[16/10] sm:aspect-[16/9]';

  const handleRetry = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (retryCount < 2) {
        setLoadError(false);
        setRetryCount((prev) => prev + 1);
      }
    },
    [retryCount]
  );

  // Compact feed cards have no reserved media area when their source is unavailable.
  if (hideUnavailable && (!src?.trim() || loadError)) return null;

  // If video media is detected
  if (isVideo && src) {
    return (
      <div className={`relative w-full ${aspectClass} bg-black max-h-[480px] overflow-hidden ${className}`}>
        <video
          src={src}
          controls
          playsInline
          muted
          preload="metadata"
          onError={() => setLoadError(true)}
          className="w-full h-full object-cover"
          aria-label={alt}
        />
        <div className="absolute top-3 left-3 bg-[#0F172A]/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-md pointer-events-none">
          <Film className="w-3.5 h-3.5 text-[#FFB703]" />
          <span>Video Clip</span>
        </div>
      </div>
    );
  }

  // Failed state or no source URL provided
  if (!src || loadError) {
    const illustrationSrc = getCategoryIllustrationUrl(category);

    // Compact thumbnail variant: renders category icon/illustration tile without text labels that clip at <=80px
    if (variant === 'thumb') {
      return (
        <div
          className={`relative w-full h-full bg-[#1B4332] flex items-center justify-center select-none overflow-hidden ${className}`}
          role="img"
          aria-label={`${alt} (Category thumbnail)`}
        >
          <img
            src={illustrationSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-85"
          />
          <MapPin className="relative z-10 w-4 h-4 text-white drop-shadow-sm" aria-hidden="true" />
        </div>
      );
    }

    // Category illustration strip variant (used on no-photo cards so grid rhythm stays aligned)
    if (variant === 'illustration') {
      return (
        <div
          className={`relative w-full ${aspectClass} bg-[#133A2B] select-none overflow-hidden ${className}`}
          role="img"
          aria-label={`${alt} (Category illustration)`}
        >
          <img
            src={illustrationSrc}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-white/95">
            <span>Illustration — no photo yet</span>
          </span>
        </div>
      );
    }

    const placeholderContent = (
      <div
        className={`relative w-full ${aspectClass} bg-gradient-to-br from-[#FAF9F5] via-[#F2EFE9] to-[#E3DFD5] border-y border-[#E3DFD5] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden ${className}`}
        role="img"
        aria-label={`${alt} (Photo placeholder)`}
      >
        {/* Subtle category illustration accent */}
        <img
          src={illustrationSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center max-w-xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#D5C4AC] shadow-xs flex items-center justify-center text-[#2D6A4F]">
            <MapPin className="w-6 h-6 text-[#2D6A4F]" />
          </div>

          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#582F0E] line-clamp-1">
              {destinationName || alt}
            </p>
            {municipality && (
              <p className="text-[11px] text-[#7D5800] font-semibold">
                {municipality}
              </p>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-[#D5C4AC] text-[10px] text-[#837560] font-medium shadow-2xs">
            {loadError ? (
              <>
                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Photo unavailable</span>
                {retryCount < 2 && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="ml-1 text-[#2D6A4F] hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Retry</span>
                  </button>
                )}
              </>
            ) : (
              <span>Illustration — no photo yet</span>
            )}
          </div>
        </div>
      </div>
    );

    if (href && !loadError) {
      return (
        <Link
          href={href}
          className="block w-full cursor-pointer focus:outline-none group/placeholder"
          aria-label={`View details for ${destinationName || alt}`}
        >
          {placeholderContent}
        </Link>
      );
    }

    return placeholderContent;
  }

  // Normal image rendering with smooth loaded transition & retry keying
  const imageSrcWithRetry = retryCount > 0 ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}` : src;

  const imageCard = (
    <div className={`relative w-full ${aspectClass} max-h-[480px] bg-[#FAF9F5] overflow-hidden ${className}`}>
      {/* Background skeleton while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#F2EFE9] animate-pulse flex items-center justify-center">
          <MapPin className="w-6 h-6 text-[#D5C4AC] opacity-40" />
        </div>
      )}

      <img
        key={imageSrcWithRetry}
        src={imageSrcWithRetry}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setLoadError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block w-full cursor-pointer focus:outline-none group/media overflow-hidden"
        aria-label={`View details for ${destinationName || alt}`}
      >
        {imageCard}
      </Link>
    );
  }

  return imageCard;
};

export default DestinationMedia;
