'use client';

import React, { useRef, useEffect } from 'react';
import { MapOmnibox, MapOmniboxProps } from '@/components/MapOmnibox';

export type MapSearchOverlayProps = MapOmniboxProps;

export function MapSearchOverlay(props: MapSearchOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Global '/' keyboard shortcut to focus the map search input when not typing in another input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        const input = overlayRef.current?.querySelector('input');
        input?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      role="search"
      aria-label="Search the map"
      className="absolute top-3 inset-x-3 sm:inset-x-auto sm:left-4 sm:top-4 z-30 w-auto sm:w-[320px] lg:w-[300px] xl:w-[360px] pointer-events-auto"
    >
      <MapOmnibox {...props} />
    </div>
  );
}
