import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import MerchantFundingPage from './page';
import { fetchMerchantMe } from '@/lib/api';
import {
  buyMerchantPoints,
  counterSponsorship,
  getMerchantPoints,
  getMerchantSponsorships,
  getMerchantVouchers,
  respondToSponsorship,
  topUpSponsoredPlan,
} from '@/lib/merchant-funding-api';

vi.mock('@/lib/auth', () => {
  const user = { id: 'owner-1' };
  return { useAuth: () => ({ user, isLoading: false }) };
});
vi.mock('@/components/Navigation', () => ({ Navigation: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/lib/api', () => ({ fetchMerchantMe: vi.fn() }));
vi.mock('@/lib/merchant-funding-api', () => ({
  buyMerchantPoints: vi.fn(), counterSponsorship: vi.fn(), getMerchantPoints: vi.fn(),
  getMerchantSponsorships: vi.fn(), getMerchantVouchers: vi.fn(), respondToSponsorship: vi.fn(),
  topUpSponsoredPlan: vi.fn(),
}));

const requested = {
  id: 'request-1', plan_id: 'plan-1', plan_status: 'active', status: 'requested', quest_id: 'quest-1',
  quest_title: 'Beach cleanup', spot_name: 'Test Beach', points: 100, voucher_id: null, voucher_qty: 0,
  promo: false, terms_version: 2, expires_at: '2026-10-22T00:00:00.000Z',
};
const accepted = {
  ...requested, id: 'request-2', plan_id: 'plan-2', status: 'accepted', points: 200,
};

describe('merchant funding actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchMerchantMe).mockResolvedValue({
      has_merchant: true,
      membership: { role: 'owner' },
    } as never);
    vi.mocked(getMerchantPoints).mockResolvedValue({
      merchant_id: 'merchant-1', balance_points: 500, is_test: true, history: [],
    });
    vi.mocked(getMerchantSponsorships).mockResolvedValue({ items: [requested, accepted] });
    vi.mocked(getMerchantVouchers).mockResolvedValue({
      merchant_id: 'merchant-1', items: [{ id: 'voucher-1', title: 'Local drink', description: 'One drink', cost_points: 20 }],
    });
    vi.mocked(counterSponsorship).mockResolvedValue({});
    vi.mocked(topUpSponsoredPlan).mockResolvedValue({});
    vi.mocked(respondToSponsorship).mockResolvedValue({});
    vi.mocked(buyMerchantPoints).mockResolvedValue({});
  });

  it('can counter with a voucher and top up an accepted active sponsorship', async () => {
    render(<MerchantFundingPage />);
    await screen.findByRole('heading', { name: 'Points & quest sponsorships' });

    fireEvent.change(await screen.findByLabelText('Optional voucher'), { target: { value: 'voucher-1' } });
    fireEvent.change(await screen.findByLabelText('Vouchers per completing traveler'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send counter-offer' }));
    await waitFor(() => expect(counterSponsorship).toHaveBeenCalledWith('request-1', 2, 100, 'voucher-1', 2, false, undefined));

    fireEvent.change(screen.getByLabelText('Add points to this active round'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add sponsor points' }));
    await waitFor(() => expect(topUpSponsoredPlan).toHaveBeenCalledWith('plan-2', 75));
  });
});
