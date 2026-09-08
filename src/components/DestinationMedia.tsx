'use client';

import React, { useState, useCallback } from 'react';
import { MapPin, Film, AlertCircle, RefreshCw } from 'lucide-react';
import { isVideoMedia } from '@/lib/api';

interface DestinationMediaProps {
  src?: string;
  alt: string;
  destinationName?: string;
  municipality?: string;
  aspectRatio?: 'video' | 'card' | 'banner';
  priority?: boolean;
  className?: string;
}

export const DestinationMedia: React.FC<DestinationMediaProps> = ({
  src,
  alt,
  destinationName,
  municipality,
  aspectRatio = 'card',
  priority = false,
  className = '',
}) => {
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const isVideo = isVideoMedia(src);

  const aspectClass =
    aspectRatio === 'video'
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
    return (
      <div
        className={`relative w-full ${aspectClass} bg-gradient-to-br from-[#FAF9F5] via-[#F2EFE9] to-[#E3DFD5] border-y border-[#E3DFD5] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden ${className}`}
        role="img"
        aria-label={`${alt} (Photo placeholder)`}
      >
        {/* Subtle patterned background accent */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#2D6A4F_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

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
                {municipality}, Pangasinan
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
              <span>Destination preview</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal image rendering with smooth loaded transition & retry keying
  const imageSrcWithRetry = retryCount > 0 ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}` : src;

  return (
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
};
