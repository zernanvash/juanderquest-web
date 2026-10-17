import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapOmnibox } from './MapOmnibox';
import { SpotModel, QuestModel } from '@/lib/api';

const spotDefaults = {
  slug: 'test-spot', subcategory: 'beach', priceLevel: 0, hours: {}, amenities: [],
  imageUrl: '', sourceType: 'editorial', sourceName: 'Test fixture', trustLevel: 'editorial',
  recommendationReasons: [], saved: false, liked: false, trendScore: 0,
  crowdStatus: 'unknown' as const, crowdConfidence: 'none',
};

const mockSpots: SpotModel[] = [
  {
    id: 'spot-1',
    ...spotDefaults,
    name: 'Hundred Islands National Park',
    description: 'Scenic marine sanctuary with 123 islands',
    municipality: 'Alaminos City',
    address: 'Lucap, Alaminos, Pangasinan',
    category: 'nature_outdoors',
    gpsLat: 16.205,
    gpsLng: 120.045,
    photos: [],
    tags: ['islands', 'boat', 'snorkeling'],
  },
  {
    id: 'spot-2',
    ...spotDefaults,
    name: 'Patar White Beach',
    description: 'Golden white sands in Bolinao',
    municipality: 'Bolinao',
    address: 'Patar, Bolinao, Pangasinan',
    category: 'nature_outdoors',
    gpsLat: 16.305,
    gpsLng: 119.782,
    photos: [],
    tags: ['beach', 'sunset'],
  },
];

const mockQuests: QuestModel[] = [
  {
    id: 'quest-1',
    title: 'Hundred Islands Island-Hopping Expedition',
    description: 'Visit Governor Island and Marcos Island',
    locationName: 'Alaminos City',
    rewardPoints: 200,
    gpsLat: 16.205,
    gpsLng: 120.045,
    category: 'eco',
    radiusMeters: 100,
  },
];

describe('MapOmnibox', () => {
  it('renders input field with national placeholder', () => {
    render(
      <MapOmnibox
        onSelectArea={vi.fn()}
        onSelectDestination={vi.fn()}
        activeArea={null}
        onClearActiveArea={vi.fn()}
        spots={mockSpots}
        quests={mockQuests}
      />
    );

    expect(screen.getByPlaceholderText(/search area, town, spot, or quest/i)).toBeDefined();
  });

  it('displays quick popular areas when focused and query is empty', () => {
    render(
      <MapOmnibox
        onSelectArea={vi.fn()}
        onSelectDestination={vi.fn()}
        activeArea={null}
        onClearActiveArea={vi.fn()}
        spots={mockSpots}
        quests={mockQuests}
      />
    );

    const input = screen.getByPlaceholderText(/search area, town, spot, or quest/i);
    fireEvent.focus(input);

    expect(screen.getByText(/explore wide geographic areas/i)).toBeDefined();
    expect(screen.getByText('Pangasinan')).toBeDefined();
    expect(screen.getByText('Bolinao')).toBeDefined();
  });

  it('filters and selects a geographic area like Pangasinan', () => {
    const handleSelectArea = vi.fn();
    render(
      <MapOmnibox
        onSelectArea={handleSelectArea}
        onSelectDestination={vi.fn()}
        activeArea={null}
        onClearActiveArea={vi.fn()}
        spots={mockSpots}
        quests={mockQuests}
      />
    );

    const input = screen.getByPlaceholderText(/search area, town, spot, or quest/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'pangasinan' } });

    expect(screen.getByText(/areas & municipalities \(wide view\)/i)).toBeDefined();
    const areaBtn = screen.getByRole('option', { name: /pangasinan province in ilocos region/i });
    fireEvent.mouseDown(areaBtn);

    expect(handleSelectArea).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pangasinan', name: 'Pangasinan', type: 'province' })
    );
  });

  it('supports arrow key navigation and Enter selection', () => {
    const handleSelectArea = vi.fn();
    render(
      <MapOmnibox
        onSelectArea={handleSelectArea}
        onSelectDestination={vi.fn()}
        activeArea={null}
        onClearActiveArea={vi.fn()}
        spots={mockSpots}
        quests={mockQuests}
      />
    );

    const input = screen.getByPlaceholderText(/search area, town, spot, or quest/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'bolinao' } });

    // Press ArrowDown to select first item
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.submit(input);

    expect(handleSelectArea).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bolinao', name: 'Bolinao' })
    );
  });

  it('displays honest no-match message and does not force fallback', () => {
    const handleSelectArea = vi.fn();
    render(
      <MapOmnibox
        onSelectArea={handleSelectArea}
        onSelectDestination={vi.fn()}
        activeArea={null}
        onClearActiveArea={vi.fn()}
        spots={mockSpots}
        quests={mockQuests}
      />
    );

    const input = screen.getByPlaceholderText(/search area, town, spot, or quest/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'nonexistentplace123' } });

    expect(screen.getByText(/no places or quests found/i)).toBeDefined();
    fireEvent.submit(input);

    // Should NOT call select area on nonexistent match
    expect(handleSelectArea).not.toHaveBeenCalled();
  });

  it('selects a specific destination spot from autocomplete', () => {
    const handleSelectDestination = vi.fn();
    render(
      <MapOmnibox
        onSelectArea={vi.fn()}
        onSelectDestination={handleSelectDestination}
        activeArea={null}
        onClearActiveArea={vi.fn()}
        spots={mockSpots}
        quests={mockQuests}
      />
    );

    const input = screen.getByPlaceholderText(/search area, town, spot, or quest/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'islands' } });

    expect(screen.getByText('Hundred Islands National Park')).toBeDefined();
    const spotBtn = screen.getByRole('option', { name: /hundred islands national park/i });
    fireEvent.mouseDown(spotBtn);

    expect(handleSelectDestination).toHaveBeenCalledWith(
      'spot',
      expect.objectContaining({ id: 'spot-1', name: 'Hundred Islands National Park' })
    );
  });

  it('renders active area badge and handles clearing', () => {
    const handleClear = vi.fn();
    render(
      <MapOmnibox
        onSelectArea={vi.fn()}
        onSelectDestination={vi.fn()}
        activeArea={{
          id: 'pangasinan',
          name: 'Pangasinan',
          type: 'province',
          subtitle: 'Province in Ilocos Region',
          center: [16.03, 120.33],
          zoom: 10,
          keywords: ['pangasinan'],
        }}
        onClearActiveArea={handleClear}
        spots={mockSpots}
        quests={mockQuests}
      />
    );

    expect(screen.getByText('Pangasinan')).toBeDefined();
    const clearBtn = screen.getByRole('button', { name: /reset area filter/i });
    fireEvent.click(clearBtn);

    expect(handleClear).toHaveBeenCalled();
  });
});
