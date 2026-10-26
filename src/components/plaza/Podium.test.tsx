import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Podium } from './Podium';
import type { StandingEntry } from '@/lib/plaza-api';

const mockPodium: StandingEntry[] = [
  {
    rank: 1,
    user_id: 'user-1',
    display_name: 'Maria Santos',
    handle: 'maria_santos',
    avatar_url: '/avatars/maria.jpg',
    home_town: 'Alaminos City',
    score: 12500,
    quests: 24,
    delta: 1,
    is_self: false,
    is_following: false,
  },
  {
    rank: 2,
    user_id: 'user-2',
    display_name: 'Juan Dela Cruz',
    handle: 'juandc',
    avatar_url: '/avatars/juan.jpg',
    home_town: 'Dagupan City',
    score: 9800,
    quests: 18,
    delta: 0,
    is_self: false,
    is_following: true,
  },
  {
    rank: 3,
    user_id: 'user-3',
    display_name: 'Clara Reyes',
    handle: 'clara_reyes',
    avatar_url: '/avatars/clara.jpg',
    home_town: 'Bolinao',
    score: 7400,
    quests: 15,
    delta: -1,
    is_self: false,
    is_following: false,
  },
];

describe('Podium Component GSAP Animations', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders top 3 podium entries correctly', () => {
    render(<Podium podium={mockPodium} />);
    expect(screen.getByText('1st Place Champion')).toBeTruthy();
    expect(screen.getByText('🥈 2nd Place')).toBeTruthy();
    expect(screen.getByText('🥉 3rd Place')).toBeTruthy();
    expect(screen.getByText('@maria_santos')).toBeTruthy();
    expect(screen.getByText('@juandc')).toBeTruthy();
    expect(screen.getByText('@clara_reyes')).toBeTruthy();
  });

  it('respects prefers-reduced-motion without breaking rendering', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<Podium podium={mockPodium} />);
    expect(screen.getByText('1st Place Champion')).toBeTruthy();
  });

  it('returns null if podium is empty', () => {
    const { container } = render(<Podium podium={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
