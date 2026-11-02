import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SettingsPage from './page';
import * as authModule from '@/lib/auth';
import * as apiModule from '@/lib/api';

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

describe('SettingsPage (Hub)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('signed in: renders the five group labels and every row href, with merchant hub for non-owners', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: {
        id: 'traveler-1',
        seedId: 'seed-1',
        displayName: 'Juan Dela Cruz',
        handle: '@juandelacruz',
        points: 250,
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

    vi.spyOn(apiModule, 'fetchMerchantMe').mockResolvedValue({
      has_merchant: false,
    } as any);

    render(<SettingsPage />);

    // Renders the five group labels
    expect(screen.getByRole('heading', { name: /^Account$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^Activity$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^Preferences$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^About$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^Storage & session$/i })).toBeTruthy();

    // Renders every row href
    await waitFor(() => {
      const profileLink = screen.getByRole('link', { name: /^Profile: Manage display name/i });
      expect(profileLink.getAttribute('href')).toBe('/settings/profile');

      const badgesLink = screen.getByRole('link', { name: /^Nametag badges: Select up to 3 badges/i });
      expect(badgesLink.getAttribute('href')).toBe('/settings/badges');

      const appearanceLink = screen.getByRole('link', { name: /^Appearance: Preview and equip/i });
      expect(appearanceLink.getAttribute('href')).toBe('/settings/appearance');

      const walletLink = screen.getByRole('link', { name: /^Wallet & on-chain badges: Connect Web3/i });
      expect(walletLink.getAttribute('href')).toBe('/settings/wallet');

      const submissionsLink = screen.getByRole('link', { name: /^My submissions: View and manage/i });
      expect(submissionsLink.getAttribute('href')).toBe('/history');

      const merchantHubLink = screen.getByRole('link', { name: /^Merchant hub: Partner with JuanDerQuest/i });
      expect(merchantHubLink.getAttribute('href')).toBe('/affiliate');

      const notifsLink = screen.getByRole('link', { name: /^Notifications: Control alerts/i });
      expect(notifsLink.getAttribute('href')).toBe('/settings/notifications');

      const mapAudioLink = screen.getByRole('link', { name: /^Map & audio: Configure audio/i });
      expect(mapAudioLink.getAttribute('href')).toBe('/settings/map-audio');

      const aboutLink = screen.getByRole('link', { name: /^About JuanDerQuest: Learn about the mission/i });
      expect(aboutLink.getAttribute('href')).toBe('/about');

      const storageLink = screen.getByRole('link', { name: /^Storage & session: Clear offline/i });
      expect(storageLink.getAttribute('href')).toBe('/settings/storage');
    });

    // Shows "Log out" button when signed in
    expect(screen.getByRole('button', { name: /Log out/i })).toBeTruthy();

    // Does NOT show traveler sign-in required card
    expect(screen.queryByText('Traveler Sign-In Required')).toBeNull();
  });

  it('signed in: renders merchant dashboard when user owns a merchant', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: {
        id: 'merchant-user-1',
        seedId: 'seed-2',
        displayName: 'Merchant Maria',
        handle: '@maria',
        points: 500,
        role: 'merchant',
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

    vi.spyOn(apiModule, 'fetchMerchantMe').mockResolvedValue({
      has_merchant: true,
      merchant: { id: 'm-1', business_name: 'Bolinao Cafe' },
    } as any);

    render(<SettingsPage />);

    await waitFor(() => {
      const merchantDashLink = screen.getByRole('link', { name: /^Merchant dashboard: Manage merchant spots/i });
      expect(merchantDashLink.getAttribute('href')).toBe('/merchant');
    });
    expect(screen.queryByRole('link', { name: /^Merchant hub:/i })).toBeNull();
  });

  it('signed out: no Account/Activity rows; Preferences/About/Storage present; sign-in card shown', () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: null,
      wallet: null,
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      loginWithSignature: vi.fn(),
      loginDemo: vi.fn(),
      guestLogin: vi.fn(),
      requestEmailOtp: vi.fn(),
      verifyEmailOtp: vi.fn(),
    } as unknown as ReturnType<typeof authModule.useAuth>);

    vi.spyOn(apiModule, 'fetchMerchantMe').mockResolvedValue({
      has_merchant: false,
    } as any);

    render(<SettingsPage />);

    // Sign-in card shown
    expect(screen.getByText('Traveler Sign-In Required')).toBeTruthy();
    expect(screen.getByRole('link', { name: /^Sign In$/i })).toBeTruthy();

    // No Account / Activity group headers or rows
    expect(screen.queryByRole('heading', { name: /^Account$/i })).toBeNull();
    expect(screen.queryByRole('heading', { name: /^Activity$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Profile:/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Nametag badges:/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Appearance:/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Wallet & on-chain badges:/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^My submissions:/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Merchant hub:/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Merchant dashboard:/i })).toBeNull();

    // Preferences / About / Storage & session present
    expect(screen.getByRole('heading', { name: /^Preferences$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^About$/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^Storage & session$/i })).toBeTruthy();

    expect(screen.getByRole('link', { name: /^Notifications: Control alerts/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /^Map & audio: Configure audio/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /^About JuanDerQuest: Learn about/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /^Storage & session: Clear offline/i })).toBeTruthy();

    // No Log out button when signed out
    expect(screen.queryByRole('button', { name: /Log out/i })).toBeNull();
  });
});
