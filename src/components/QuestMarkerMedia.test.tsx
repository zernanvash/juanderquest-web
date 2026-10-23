import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestMarkerMedia, isUsableQuestImage } from './QuestMarkerMedia';

describe('QuestMarkerMedia', () => {
  it('identifies usable vs unusable image URLs', () => {
    expect(isUsableQuestImage(undefined)).toBe(false);
    expect(isUsableQuestImage(null)).toBe(false);
    expect(isUsableQuestImage('')).toBe(false);
    expect(isUsableQuestImage('   ')).toBe(false);
    // Stock furniture seed URL filtered out
    expect(isUsableQuestImage('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format')).toBe(false);
    // Valid URL
    expect(isUsableQuestImage('https://images.unsplash.com/photo-1507525428034-b723cf961d3e')).toBe(true);
  });

  it('renders DestinationMedia illustration immediately when no markerImageUrl is provided', () => {
    render(
      <QuestMarkerMedia
        markerImageUrl={null}
        title="Hundred Islands Eco Quest"
        category="eco"
        locationName="Alaminos City"
      />
    );

    // Image tag with testid should not exist
    expect(screen.queryByTestId('quest-marker-image')).toBeNull();
    // Branded illustration for category is rendered
    expect(screen.getByRole('img', { name: /Hundred Islands Eco Quest \(Category illustration\)/i })).toBeDefined();
    expect(screen.getByText(/Illustration — no photo yet/i)).toBeDefined();
  });

  it('renders <img> initially, and smoothly transitions to DestinationMedia fallback on error without infinite loop', () => {
    render(
      <QuestMarkerMedia
        markerImageUrl="https://raw.githubusercontent.com/JuanderQuest/assets/main/markers/broken_marker.png"
        title="Balingasay River Clean-up"
        category="adventure"
        locationName="Bolinao"
      />
    );

    // Initial image tag rendered with marker URL
    const img = screen.getByTestId('quest-marker-image') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('broken_marker.png');

    // Trigger image error (e.g., 404 or network failure)
    fireEvent.error(img);

    // After error, img tag is replaced with branded illustration
    expect(screen.queryByTestId('quest-marker-image')).toBeNull();
    expect(screen.getByRole('img', { name: /Balingasay River Clean-up \(Category illustration\)/i })).toBeDefined();
  });
});
