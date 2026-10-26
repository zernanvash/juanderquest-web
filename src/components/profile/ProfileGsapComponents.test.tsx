import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfileXpBar } from './ProfileXpBar';
import { ProfileTabGlider } from './ProfileTabGlider';

describe('Profile GSAP Components', () => {
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

  describe('ProfileXpBar', () => {
    it('renders level, xp, and progress bar', () => {
      render(
        <ProfileXpBar
          level={3}
          label="Explorer"
          xp={145}
          progressPercent={90}
        />
      );

      expect(screen.getByText('Level 3 Explorer')).toBeTruthy();
      expect(screen.getByText('145 XP')).toBeTruthy();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeTruthy();
      expect(progressbar.getAttribute('aria-valuenow')).toBe('90');
    });

    it('renders custom xpUnit if provided (e.g., Scout Rep)', () => {
      render(
        <ProfileXpBar
          level={2}
          label="Scout"
          xp={80}
          xpUnit="Rep"
          progressPercent={60}
        />
      );

      expect(screen.getByText('Level 2 Scout')).toBeTruthy();
      expect(screen.getByText('80 Rep')).toBeTruthy();
    });

    it('renders gracefully under reduced motion', () => {
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

      render(
        <ProfileXpBar
          level={5}
          xp={250}
          progressPercent={50}
        />
      );

      expect(screen.getByText('Level 5 Explorer')).toBeTruthy();
    });
  });

  describe('ProfileTabGlider', () => {
    it('renders overview and badges tabs for public traveler', () => {
      render(
        <ProfileTabGlider
          cleanParam="maria"
          activePanel="overview"
          isOwner={false}
          sampleBadgesCount={12}
        />
      );

      expect(screen.getByText('Overview')).toBeTruthy();
      expect(screen.getByText('Badges & Achievements')).toBeTruthy();
      expect(screen.getByText('12')).toBeTruthy();
      expect(screen.getByTestId('tab-glider')).toBeTruthy();
    });

    it('renders extra owner tabs when isOwner is true', () => {
      render(
        <ProfileTabGlider
          cleanParam="juan"
          activePanel="badges"
          isOwner={true}
        />
      );

      expect(screen.getByText('Overview')).toBeTruthy();
      expect(screen.getByText('Badges & Achievements')).toBeTruthy();
      expect(screen.getByText('Submissions & GPS Proof')).toBeTruthy();
      expect(screen.getByText('Settings')).toBeTruthy();
      expect(screen.getByTestId('tab-glider')).toBeTruthy();
    });

    it('positions glider inside active tab', () => {
      render(
        <ProfileTabGlider
          cleanParam="juan"
          activePanel="badges"
          isOwner={false}
        />
      );

      const badgesLink = screen.getByText('Badges & Achievements').closest('a');
      const glider = screen.getByTestId('tab-glider');
      expect(badgesLink?.contains(glider)).toBe(true);
    });
  });
});
