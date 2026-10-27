import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QuizLobbyClient } from './QuizLobbyClient';
import * as quizzesApi from '@/lib/quizzes';

// Mock useAuth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    logout: vi.fn(),
  }),
}));

describe('QuizLobbyClient Geolocation and Nearby Discovery', () => {
  const mockNearbyQuizzes: quizzesApi.NearbyQuizInvitation[] = [
    {
      quiz_id: 'quiz-lucap-wharf',
      destination_id: 'spot-lucap-wharf',
      destination_name: 'Lucap Wharf & Promenade',
      municipality: 'Alaminos City',
      title: 'Tales of Hundred Islands & Lucap Wharf',
      description: 'Explore the legends and coastal history.',
      radius_meters: 500,
      distance_meters: 120,
      xp_reward: 50,
      time_limit_minutes: 30,
      is_completed: false,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders turn on location state when geolocation is unavailable or denied', async () => {
    const fetchSpy = vi.spyOn(quizzesApi, 'fetchNearbyQuizzes');

    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) =>
        error({
          code: 1, // PERMISSION_DENIED
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'Location access denied',
        })
      ),
    };

    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    render(<QuizLobbyClient />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Turn on location to see quizzes near you/i })
      ).toBeDefined();
      expect(
        screen.getByRole('button', { name: /Enable Location Access/i })
      ).toBeDefined();
    });

    // Does not call fetchNearbyQuizzes with hardcoded coordinates
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches and renders nearby arcade cabinets when geolocation is granted', async () => {
    const fetchSpy = vi.spyOn(quizzesApi, 'fetchNearbyQuizzes').mockResolvedValue(mockNearbyQuizzes);

    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: {
            latitude: 16.2085,
            longitude: 119.972,
            accuracy: 10,
          },
        })
      ),
    };

    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    render(<QuizLobbyClient />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(16.2085, 119.972);
      expect(
        screen.getByText('Tales of Hundred Islands & Lucap Wharf')
      ).toBeDefined();
      expect(screen.getByText(/Alaminos City/i)).toBeDefined();
      expect(screen.getByRole('link', { name: /Enter Cabinet/i })).toBeDefined();
    });
  });

  it('retries location request when Enable Location Access button is clicked', async () => {
    let callCount = 0;
    const fetchSpy = vi.spyOn(quizzesApi, 'fetchNearbyQuizzes').mockResolvedValue(mockNearbyQuizzes);

    const mockGeolocation = {
      getCurrentPosition: vi.fn((success, error) => {
        callCount++;
        if (callCount === 1) {
          error({
            code: 1,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'Denied initially',
          });
        } else {
          success({
            coords: {
              latitude: 16.2085,
              longitude: 119.972,
              accuracy: 10,
            },
          });
        }
      }),
    };

    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });

    render(<QuizLobbyClient />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Turn on location to see quizzes near you/i })
      ).toBeDefined();
    });

    // Click retry button
    const retryBtn = screen.getByRole('button', { name: /Enable Location Access/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(16.2085, 119.972);
      expect(screen.getByText('Tales of Hundred Islands & Lucap Wharf')).toBeDefined();
    });
  });
});
