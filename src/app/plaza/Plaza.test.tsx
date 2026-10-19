import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import PlazaPage from './page';

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'u_me',
      displayName: 'Aira Leader',
      email: 'aira@example.com',
      points: 500,
    },
  }),
}));

vi.mock('@/components/Navigation', () => ({
  Navigation: ({ children }: { children: React.ReactNode }) => (
    <div>
      <aside aria-label="Sidebar Navigation" />
      <main id="main-content">{children}</main>
    </div>
  ),
}));

const mockGetStandings = vi.fn();
const mockGetTowns = vi.fn();
const mockGetFeed = vi.fn();
const mockCheerActivity = vi.fn();
const mockUncheerActivity = vi.fn();

vi.mock('@/lib/plaza-api', () => ({
  getStandings: (...args: any[]) => mockGetStandings(...args),
  getTowns: (...args: any[]) => mockGetTowns(...args),
  getFeed: (...args: any[]) => mockGetFeed(...args),
  getActivity: vi.fn(),
  cheerActivity: (...args: any[]) => mockCheerActivity(...args),
  uncheerActivity: (...args: any[]) => mockUncheerActivity(...args),
  hideActivity: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  listComments: vi.fn().mockResolvedValue({ items: [] }),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
  reportComment: vi.fn(),
}));

describe('PlazaPage Component', () => {
  it('uses the shared navigation shell that provides the side panel', async () => {
    render(<PlazaPage />);
    expect(screen.getByRole('complementary', { name: 'Sidebar Navigation' })).toBeDefined();
    expect(screen.getByRole('main')).toBeDefined();
    await waitFor(() => expect(screen.getByText('Aira Leader completed Hundred Islands Trail')).toBeDefined());
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetStandings.mockResolvedValue({
      board: 'everyone',
      period: 'weekly',
      week: {
        id: '2026-W41',
        starts_at: '2026-10-12T00:00:00Z',
        ends_at: '2026-10-19T00:00:00Z',
        resets_in_seconds: 120000,
      },
      me: {
        rank: 1,
        user_id: 'u_me',
        display_name: 'Aira Leader',
        handle: 'aira_coast',
        avatar_url: '',
        score: 500,
        quests: 5,
        home_town: 'Alaminos City',
        delta: 2,
        is_self: true,
        is_following: false,
      },
      podium: [
        {
          rank: 1,
          user_id: 'u_me',
          display_name: 'Aira Leader',
          handle: 'aira_coast',
          avatar_url: '',
          score: 500,
          quests: 5,
          home_town: 'Alaminos City',
          delta: 2,
          is_self: true,
          is_following: false,
        },
        {
          rank: 2,
          user_id: 'u_2',
          display_name: 'Carl Runner',
          handle: 'carl_run',
          avatar_url: '',
          score: 420,
          quests: 4,
          home_town: 'Bolinao',
          delta: -1,
          is_self: false,
          is_following: true,
        },
      ],
      entries: [
        {
          rank: 1,
          user_id: 'u_me',
          display_name: 'Aira Leader',
          handle: 'aira_coast',
          avatar_url: '',
          score: 500,
          quests: 5,
          home_town: 'Alaminos City',
          delta: 2,
          is_self: true,
          is_following: false,
        },
        {
          rank: 2,
          user_id: 'u_2',
          display_name: 'Carl Runner',
          handle: 'carl_run',
          avatar_url: '',
          score: 420,
          quests: 4,
          home_town: 'Bolinao',
          delta: -1,
          is_self: false,
          is_following: true,
        },
      ],
      rivals: { above: [], below: [] },
      town: null,
      total: 2,
      next_after_rank: null,
    });

    mockGetTowns.mockResolvedValue({
      week: { id: '2026-W41' },
      towns: [
        {
          rank: 1,
          town: 'Alaminos City',
          score_sum: 920,
          active_explorers: 2,
          top_explorer: { display_name: 'Aira Leader', handle: 'aira_coast', avatar_url: '' },
          is_my_town: true,
        },
      ],
    });

    mockGetFeed.mockResolvedValue({
      items: [
        {
          id: 'act_101',
          verb: 'quest_completed',
          actor: {
            user_id: 'u_me',
            display_name: 'Aira Leader',
            handle: 'aira_coast',
            avatar_url: '',
            is_following: false,
          },
          subject: {
            type: 'quest',
            id: 'q_1',
            title: 'Hundred Islands Trail',
            href: '/quests/q_1',
          },
          municipality: 'Alaminos City',
          payload: { points: 100 },
          reason: 'you',
          cheer_count: 5,
          cheered_by_me: false,
          comment_count: 0,
          can_hide: true,
          created_at: '2026-10-17T03:00:00Z',
        },
      ],
      next_cursor: null,
    });
  });

  it('renders Plaza header, podium, and activity feed', async () => {
    render(<PlazaPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Plaza' })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('1st Place Champion')).toBeDefined();
      expect(screen.getByText('Aira Leader completed Hundred Islands Trail')).toBeDefined();
      expect(screen.getByText('Town vs Town This Week')).toBeDefined();
    });
  });

  it('toggles cheer on activity card optimistically', async () => {
    render(<PlazaPage />);

    await waitFor(() => {
      expect(screen.getByText('👏')).toBeDefined();
    });

    const cheerBtn = screen.getByText('👏').closest('button');
    expect(cheerBtn).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();

    fireEvent.click(cheerBtn!);

    // Count increments to 6 optimistically
    await waitFor(() => {
      expect(screen.getByText('6')).toBeDefined();
      expect(mockCheerActivity).toHaveBeenCalledWith('act_101');
    });
  });

  it('shows the all-time podium and a one-tap switch when the weekly board is empty', async () => {
    const populated = await mockGetStandings();
    mockGetStandings.mockImplementation(({ period }: { period: string }) => Promise.resolve(
      period === 'all_time' ? { ...populated, period: 'all_time' } : {
        ...populated, podium: [], entries: [], total: 0, me: null,
      }
    ));

    render(<PlazaPage />);

    await waitFor(() => {
      expect(screen.getByText('No quests completed this week yet — be the first')).toBeDefined();
      expect(within(screen.getByRole('region', { name: 'All-time podium' })).getByText('1st Place Champion')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View All time' }));
    await waitFor(() => expect(mockGetStandings).toHaveBeenCalledWith(expect.objectContaining({ period: 'all_time' })));
  });

  it('offers quest and explorer CTAs when the activity feed is empty', async () => {
    mockGetFeed.mockResolvedValue({ items: [], next_cursor: null });
    render(<PlazaPage />);

    await waitFor(() => {
      expect(screen.getByText('No explorer stories yet — yours could be the first.')).toBeDefined();
      const feed = screen.getByRole('region', { name: 'Plaza Activity Feed' });
      expect(within(feed).getByRole('link', { name: 'Explore quests' }).getAttribute('href')).toBe('/quests');
      expect(within(feed).getByRole('link', { name: 'Find explorers to follow' }).getAttribute('href')).toBe('/plaza?period=all_time#plaza-rankings');
    });
  });

  it('keeps discovery CTAs when the Following feed is empty', async () => {
    mockGetFeed.mockResolvedValue({ items: [], next_cursor: null });
    render(<PlazaPage />);
    const feed = screen.getByRole('region', { name: 'Plaza Activity Feed' });
    fireEvent.click(within(feed).getByRole('button', { name: 'Following' }));
    await waitFor(() => {
      expect(within(feed).getByText(/not following anyone yet/)).toBeDefined();
      expect(within(feed).getByRole('link', { name: 'Explore quests' })).toBeDefined();
      expect(within(feed).getByRole('link', { name: 'Find explorers to follow' })).toBeDefined();
    });
  });
});
