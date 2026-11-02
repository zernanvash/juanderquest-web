import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileSettingsPage from './profile/page';
import BadgesSettingsPage from './badges/page';
import AppearanceSettingsPage from './appearance/page';
import WalletSettingsPage from './wallet/page';
import NotificationsSettingsPage from './notifications/page';
import MapAudioSettingsPage from './map-audio/page';
import StorageSettingsPage from './storage/page';
import * as authModule from '@/lib/auth';

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('@/lib/notifications-api', () => ({
  getNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/social', () => ({
  fetchMyProfile: vi.fn().mockResolvedValue({
    display_name: 'Test Explorer',
    handle: '@testexplorer',
    bio: 'Test bio',
    status_text: 'Active',
    is_public: true,
  }),
  updateMyProfile: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/engagement', () => ({
  fetchMyEngagement: vi.fn().mockResolvedValue({ share_achievements: true }),
  updateAchievementSharing: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/api', () => ({
  fetchMerchantMe: vi.fn().mockResolvedValue({ has_merchant: false }),
  api: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock('@/components/OnChainBadges', () => ({
  OnChainBadges: () => <div data-testid="mock-onchain-badges">OnChainBadges</div>,
}));

vi.mock('@/components/ChainReadiness', () => ({
  ChainReadiness: () => <div data-testid="mock-chain-readiness">ChainReadiness</div>,
}));

describe('Settings Sub-pages: <h1> and back link to /settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: {
        id: 'u-1',
        seedId: 'seed-1',
        displayName: 'Explorer Test',
        handle: '@explorertest',
        avatarUrl: '/avatar.png',
        points: 100,
        role: 'traveler',
      },
      wallet: null,
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      loginWithSignature: vi.fn(),
      loginDemo: vi.fn(),
      guestLogin: vi.fn(),
      requestEmailOtp: vi.fn(),
      verifyEmailOtp: vi.fn(),
    } as unknown as ReturnType<typeof authModule.useAuth>);
  });

  const assertBackLink = () => {
    const backLinks = screen.getAllByRole('link', { name: /Settings/i });
    const targetLink = backLinks.find((link) => link.getAttribute('href') === '/settings');
    expect(targetLink).toBeTruthy();
  };

  it('renders Profile sub-page with <h1> and back link', () => {
    render(<ProfileSettingsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Profile & Social Identity/i })
    ).toBeTruthy();
    assertBackLink();
  });

  it('renders Badges sub-page with <h1> and back link', () => {
    render(<BadgesSettingsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Nametag Badges/i })
    ).toBeTruthy();
    assertBackLink();
  });

  it('renders Appearance sub-page with <h1> and back link', () => {
    render(<AppearanceSettingsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Appearance/i })
    ).toBeTruthy();
    assertBackLink();
  });

  it('renders Wallet sub-page with <h1> and back link', () => {
    render(<WalletSettingsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Wallet & On-Chain Badges/i })
    ).toBeTruthy();
    assertBackLink();
  });

  it('renders Notifications sub-page with <h1> and back link', () => {
    render(<NotificationsSettingsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Notification Preferences/i })
    ).toBeTruthy();
    assertBackLink();
  });

  it('renders Map & Audio sub-page with <h1> and back link', () => {
    render(<MapAudioSettingsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Map & Audio Experience/i })
    ).toBeTruthy();
    assertBackLink();
  });

  it('renders Storage sub-page with <h1> and back link', () => {
    render(<StorageSettingsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Storage & Session Management/i })
    ).toBeTruthy();
    assertBackLink();
  });
});
