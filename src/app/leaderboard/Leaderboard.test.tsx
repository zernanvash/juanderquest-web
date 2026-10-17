import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LeaderboardPage from './page';

vi.mock('@/components/Navigation', () => ({
  Navigation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="nav-wrapper">{children}</div>
  ),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'scout-1',
      displayName: 'LeaderScout',
      email: 'scout@test.com',
      points: 450,
    },
  }),
}));

const mockFetchLeaderboard = vi.fn();
const mockSearchPublicTravelers = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchLeaderboard: (...args: any[]) => mockFetchLeaderboard(...args),
}));

vi.mock('@/lib/search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/search')>();
  return {
    ...actual,
    searchPublicTravelers: (...args: any[]) => mockSearchPublicTravelers(...args),
  };
});

describe('LeaderboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pilot provenance banner and dynamic top scouts', async () => {
    mockFetchLeaderboard.mockResolvedValue({
      timeframe: 'weekly',
      metric: 'scout_reputation',
      total_active_scouts: 2,
      is_sparse_pilot: true,
      provenance_note: 'Pilot Season 1 verified proof rankings.',
      top_scouts: [
        {
          rank: 1,
          user_id: 'scout-1',
          display_name: 'LeaderScout',
          handle: 'leaderscout',
          avatar_url: 'https://avatar/1',
          scout_reputation: 350,
          approved_quests: 5,
          points_earned: 450,
          badge: '👑 Grandmaster Scout',
          primary_town: 'Bolinao',
          is_self: true,
        },
        {
          rank: 2,
          user_id: 'scout-2',
          display_name: 'Anonymous Scout',
          handle: null,
          avatar_url: 'https://avatar/2',
          scout_reputation: 120,
          approved_quests: 2,
          points_earned: 180,
          badge: '🌱 Active Scout',
          primary_town: 'Lingayen',
          is_self: false,
        },
      ],
      top_municipalities: [
        {
          name: 'Bolinao',
          quests_completed: 5,
          active_scouts: 1,
          share_percentage: 71,
        },
        {
          name: 'Lingayen',
          quests_completed: 2,
          active_scouts: 1,
          share_percentage: 29,
        },
      ],
      my_rank: {
        rank: 1,
        user_id: 'scout-1',
        display_name: 'LeaderScout',
        handle: 'leaderscout',
        avatar_url: 'https://avatar/1',
        scout_reputation: 350,
        approved_quests: 5,
        points_earned: 450,
        badge: '👑 Grandmaster Scout',
        primary_town: 'Bolinao',
        is_self: true,
      },
    });

    render(<LeaderboardPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Explorer Leaderboard/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Season 1 Pilot Rankings • Verified Activity Provenance/i)).toBeDefined();
    });

    expect(screen.getByText(/Pilot Season 1 verified proof rankings./i)).toBeDefined();
    expect(screen.getAllByText(/@leaderscout/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Anonymous Scout/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/350 Scout Rep • 450 pts • 5 verified Eco-Quests/i)).toBeDefined();
    expect(screen.getByText(/2 LGUs Active/i)).toBeDefined();
  });

  it('renders empty state truthfully when no scout has completed verified quests', async () => {
    mockFetchLeaderboard.mockResolvedValue({
      timeframe: 'weekly',
      metric: 'scout_reputation',
      total_active_scouts: 0,
      is_sparse_pilot: true,
      provenance_note: 'No activity.',
      top_scouts: [],
      top_municipalities: [],
      my_rank: null,
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/No verified scout activity recorded for this timeframe yet\. Be the first to complete a quest!/i)
      ).toBeDefined();
    });
    expect(screen.getByText(/No municipal quest check-ins logged yet for this timeframe\./i)).toBeDefined();
  });

  it('filters ranked scouts by name or municipality with honest slice labeling', async () => {
    mockFetchLeaderboard.mockResolvedValue({
      timeframe: 'weekly',
      metric: 'scout_reputation',
      total_active_scouts: 2,
      top_scouts: [
        {
          rank: 1,
          user_id: 'scout-1',
          display_name: 'LeaderScout',
          handle: 'leaderscout',
          avatar_url: '',
          scout_reputation: 350,
          approved_quests: 5,
          points_earned: 450,
          badge: '👑 Grandmaster Scout',
          primary_town: 'Bolinao',
          is_self: true,
        },
        {
          rank: 2,
          user_id: 'scout-2',
          display_name: 'Anonymous Scout',
          handle: null,
          avatar_url: '',
          scout_reputation: 120,
          approved_quests: 2,
          points_earned: 180,
          badge: '🌱 Active Scout',
          primary_town: 'Lingayen',
          is_self: false,
        },
      ],
      top_municipalities: [],
      my_rank: null,
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/filter ranked scouts\.\.\./i)).toBeDefined();
    });

    const filterInput = screen.getByPlaceholderText(/filter ranked scouts\.\.\./i);
    fireEvent.change(filterInput, { target: { value: 'Lingayen' } });

    // Should filter down to only Anonymous Scout in the roster
    expect(screen.getByText(/Showing 1 of 1 ranked scouts/i)).toBeDefined();
    expect(screen.getAllByText(/Anonymous Scout/i).length).toBeGreaterThan(0);
  });

  it('searches public travelers directory and displays "No rank in this timeframe" for unranked users', async () => {
    mockFetchLeaderboard.mockResolvedValue({
      timeframe: 'weekly',
      metric: 'scout_reputation',
      total_active_scouts: 1,
      top_scouts: [
        {
          rank: 1,
          user_id: 'scout-1',
          display_name: 'LeaderScout',
          handle: 'leaderscout',
          avatar_url: '',
          scout_reputation: 350,
          approved_quests: 5,
          points_earned: 450,
          badge: '👑 Grandmaster Scout',
          primary_town: 'Bolinao',
          is_self: true,
        },
      ],
      top_municipalities: [],
      my_rank: null,
    });

    mockSearchPublicTravelers.mockResolvedValue({
      items: [
        {
          id: 'user-unranked',
          display_name: 'Elena Rostova',
          handle: 'elena',
          avatar_url: '',
          bio: 'Exploring Pangasinan beaches',
          status_text: 'On the road',
        },
        {
          id: 'scout-1',
          display_name: 'LeaderScout',
          handle: 'leaderscout',
          avatar_url: '',
          bio: 'Trail champion',
          status_text: null,
        },
      ],
      cursor: null,
      hasMore: false,
      totalMatches: 2,
    });

    render(<LeaderboardPage />);

    // Switch to "Find a Traveler"
    const findTabBtn = screen.getByRole('button', { name: /find a traveler/i });
    fireEvent.click(findTabBtn);

    const searchInput = screen.getByPlaceholderText(/search public travelers by name or @handle/i);
    fireEvent.change(searchInput, { target: { value: 'elena' } });

    await waitFor(() => {
      expect(mockSearchPublicTravelers).toHaveBeenCalledWith('elena', undefined, 20, expect.any(AbortSignal));
    });

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeDefined();
      expect(screen.getByText(/@elena/i)).toBeDefined();
      // Elena is unranked, must show "No rank in this timeframe"
      expect(screen.getByText('No rank in this timeframe')).toBeDefined();
      // LeaderScout is ranked #1 in top_scouts, must show official rank
      expect(screen.getByText('Rank #1')).toBeDefined();
    });
  });
});
