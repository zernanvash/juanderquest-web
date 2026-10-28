import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfileXpBar } from './ProfileXpBar';
import { ProfileTabGlider } from './ProfileTabGlider';
import { gsap } from '@/lib/animations/gsap';

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
    it('renders level, xp, and progress bar with proper a11y attributes', () => {
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
      expect(progressbar.getAttribute('aria-label')).toBe('Level progress');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('90');
    });

    it('reports real progressPercent in aria-valuenow even when visual width is clamped to 6%', () => {
      render(
        <ProfileXpBar
          level={1}
          label="Explorer"
          xp={5}
          progressPercent={2.4}
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('2');
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

    it('slides glider using gsap.to when activePanel changes and uses gsap.set on mount', () => {
      const gsapSetSpy = vi.spyOn(gsap, 'set');
      const gsapToSpy = vi.spyOn(gsap, 'to');

      // Mock offsetLeft and offsetWidth on HTMLElement prototype
      Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
        configurable: true,
        get() {
          const key = this.getAttribute('data-tab-key');
          if (key === 'overview') return 10;
          if (key === 'badges') return 120;
          return 0;
        },
      });
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        get() {
          const key = this.getAttribute('data-tab-key');
          if (key === 'overview') return 90;
          if (key === 'badges') return 180;
          return 100;
        },
      });

      const { rerender } = render(
        <ProfileTabGlider
          cleanParam="juan"
          activePanel="overview"
          isOwner={false}
        />
      );

      // On first render / mount: gsap.set is used with measured values
      expect(gsapSetSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ x: 10, width: 90, opacity: 1 })
      );

      // Change activePanel to badges
      rerender(
        <ProfileTabGlider
          cleanParam="juan"
          activePanel="badges"
          isOwner={false}
        />
      );

      // Subsequent changes animate with gsap.to
      expect(gsapToSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          x: 120,
          width: 180,
          opacity: 1,
          duration: 0.35,
          ease: 'power2.out',
        })
      );
    });

    it('uses gsap.set exclusively when prefers-reduced-motion is active', () => {
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

      const gsapSetSpy = vi.spyOn(gsap, 'set');
      const gsapToSpy = vi.spyOn(gsap, 'to');

      const { rerender } = render(
        <ProfileTabGlider
          cleanParam="juan"
          activePanel="overview"
          isOwner={false}
        />
      );

      rerender(
        <ProfileTabGlider
          cleanParam="juan"
          activePanel="badges"
          isOwner={false}
        />
      );

      // gsap.to should NOT be called under reduced motion
      expect(gsapToSpy).not.toHaveBeenCalled();
      expect(gsapSetSpy).toHaveBeenCalled();
    });

    it('hides glider when active panel has no matching tab (e.g. journey on public profile)', () => {
      const gsapSetSpy = vi.spyOn(gsap, 'set');

      render(
        <ProfileTabGlider
          cleanParam="maria"
          activePanel="journey"
          isOwner={false}
        />
      );

      expect(gsapSetSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ opacity: 0 })
      );
    });
  });
});
