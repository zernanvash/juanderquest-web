'use client';

import React, { useState } from 'react';
import { DestinationMedia } from '@/components/DestinationMedia';

interface QuestMarkerMediaProps {
  markerImageUrl?: string | null;
  title: string;
  category?: string;
  locationName?: string;
  className?: string;
  aspectRatio?: 'card' | 'banner';
}

/**
 * Checks whether the quest marker URL looks like a usable custom image,
 * filtering out generic placeholder seeds or empty strings.
 */
export function isUsableQuestImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Filter out the generic interior furniture stock photo used in some seed records
  if (trimmed.includes('1513694203232-719a280e022f')) return false;
  return true;
}

/**
 * Renders a quest's marker / hero image with a robust, graceful fallback.
 * If the remote image 404s or fails to load, it automatically switches to
 * JuanDerQuest's branded DestinationMedia illustration for the quest's category,
 * preventing any repetitive 404 loops or broken image borders.
 */
export const QuestMarkerMedia: React.FC<QuestMarkerMediaProps> = ({
  markerImageUrl,
  title,
  category,
  locationName,
  className = 'w-full h-full object-cover',
  aspectRatio = 'card',
}) => {
  const [hasFailed, setHasFailed] = useState(false);
  const usable = isUsableQuestImage(markerImageUrl);

  if (!usable || hasFailed) {
    return (
      <DestinationMedia
        destinationName={title}
        alt={title}
        category={category}
        municipality={locationName}
        variant="illustration"
        aspectRatio={aspectRatio}
        className="w-full h-full"
      />
    );
  }

  return (
    <img
      src={markerImageUrl!}
      alt={title}
      className={className}
      data-testid="quest-marker-image"
      onError={() => {
        // Switch state so the component cleanly swaps to the branded illustration fallback
        setHasFailed(true);
      }}
    />
  );
};
