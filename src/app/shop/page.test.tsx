import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), put: vi.fn(), replace: vi.fn(), push: vi.fn(), tab: 'cosmetics', walletAddress: '0x00000000000000000000000000000000000000a1' as string | null,
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => key === 'tab' ? mocks.tab : null }),
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }), usePathname: () => '/shop',
}));
vi.mock('@/lib/api', () => ({ api: { get: mocks.get, post: mocks.post, put: mocks.put }, uuid: () => 'test-idempotency-key' }));
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'traveler', displayName: 'Test Traveler', avatarUrl: '', points: 500, walletAddress: mocks.walletAddress }, refreshProfile: vi.fn() }),
  useRequireAuth: () => ({ isReady: true }),
}));
vi.mock('@/components/Navigation', () => ({ Navigation: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import ShopPage from './page';

const catalog = [
  { id: 'frame-bamboo', kind: 'frame', name: 'Bamboo Ring', rarity: 'common', pricePoints: 120, asset: { style: 'ring', colors: ['#95d5b2'], width: 3 }, owned: false, equipped: false, buyable: true },
];
const previewVoucher = { id: 'pv-coffee', title: 'Free iced coffee', description: 'Sample', cost_points: 60, merchant_name: 'Partner café · Bolinao', partnerLabel: 'Partner café · Bolinao', availability: 'preview', redeemable: false, iconKey: 'coffee' };

describe('Shop v1', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.tab = 'cosmetics'; mocks.walletAddress = '0x00000000000000000000000000000000000000a1';
    mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data:
      url.endsWith('/shop/cosmetics') ? catalog : url.endsWith('/vouchers') ? [previewVoucher] : url.endsWith('/shop/teasers') ? [] : { owned: [], loadout: {} } } }));
    mocks.post.mockResolvedValue({ data: { data: {} } });
  });

  it('shows the tab from the URL and preview vouchers have no redeem action', async () => {
    mocks.tab = 'vouchers';
    render(<ShopPage />);
    expect(await screen.findByText('Free iced coffee')).toBeTruthy();
    expect(screen.getByText('Sample offer · partner coming soon')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /redeem/i })).toBeNull();
  });

  it('opens the cosmetic preview and confirms a mocked points purchase', async () => {
    render(<ShopPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Bamboo Ring/ }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Buy for 120 points' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm purchase for 120 points' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/shop/cosmetics/frame-bamboo/purchase', { idempotency_key: 'test-idempotency-key' }));
  });

  it('lets a traveler without a wallet browse, then asks them to connect one before buying (Plan 67)', async () => {
    mocks.walletAddress = null;
    render(<ShopPage />);
    expect(await screen.findByText(/Wallet not connected yet/)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Bamboo Ring/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Buy for 120 points' }));
    const prompt = await screen.findByRole('dialog', { name: 'Connect a wallet to continue' });
    expect(prompt.textContent).toContain('Bamboo Ring');
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, connect wallet →' }));
    expect(mocks.push).toHaveBeenCalledWith('/wallet/connect?returnTo=%2Fshop%3Ftab%3Dcosmetics');
  });

  it('previews a banner on the traveler passport with their equipped frame kept on (Plan 69)', async () => {
    const banner = { id: 'banner-capiz', kind: 'banner', name: 'Capiz Heritage', rarity: 'rare', pricePoints: 150, asset: { style: 'gradient', colors: ['#fff', '#ccc'], angle: 90 }, owned: false, equipped: false, buyable: true };
    const frame = { id: 'frame-bamboo', kind: 'frame', name: 'Bamboo Ring', rarity: 'common', pricePoints: 120, asset: { style: 'ring', colors: ['#95d5b2'], width: 3 }, owned: true, equipped: true, buyable: false };
    mocks.get.mockImplementation((url: string) => Promise.resolve({ data: { data:
      url.endsWith('/shop/cosmetics') ? [banner, frame] : url.endsWith('/vouchers') ? [] : url.endsWith('/shop/teasers') ? [] : { owned: [], loadout: { frame_id: 'frame-bamboo' } } } }));
    render(<ShopPage />);
    expect(await screen.findByRole('button', { name: /Live animations: On/ })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Capiz Heritage/ }));
    const dialog = await screen.findByRole('dialog', { name: /Test Traveler/ });
    expect(dialog.textContent).toContain('Your Passport');
    const loadout = screen.getByRole('list', { name: 'Preview loadout' });
    expect(loadout.textContent).toContain('Previewing Banner: Capiz Heritage');
    expect(loadout.textContent).toContain('Equipped Frame: Bamboo Ring');
    const motion = screen.getByRole('button', { name: 'Animated' });
    fireEvent.click(motion);
    expect(screen.getByRole('button', { name: 'Still' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Buy for 150 points' })).toBeTruthy();
  });
});
