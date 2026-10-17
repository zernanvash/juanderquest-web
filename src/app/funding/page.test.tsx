import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import QuestFundingPage from './page';
import { createFundingPlan, getQuestFundingPlan } from '@/lib/funding-api';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'author-1' }, isLoading: false }) }));
vi.mock('@/components/Navigation', () => ({ Navigation: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/lib/funding-api', () => ({
  acceptSponsorshipCounter: vi.fn(), cancelFundingPlan: vi.fn(), closeFundingPlan: vi.fn(),
  contributeToFundingPlan: vi.fn(), createFundingPlan: vi.fn(), extendFundingPlan: vi.fn(),
  getQuestFundingPlan: vi.fn(), getFundingPlan: vi.fn(), listSponsorDirectory: vi.fn(),
  requestQuestSponsorship: vi.fn(), submitFundingPlan: vi.fn(), updateFundingPlan: vi.fn(),
}));

describe('author Eco-Quest funding setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/funding?quest_id=quest-1');
    vi.mocked(getQuestFundingPlan).mockResolvedValue({ plan: null });
    vi.mocked(createFundingPlan).mockResolvedValue({
      id: 'plan-1', quest_id: 'quest-1', round_number: 1, version: 1, mode: 'budget', status: 'draft',
      reward_points: 50, fee_points: 3, planned_completions: 10, target_points: 530,
      starts_at: '2026-10-17T00:00:00.000Z', ends_at: '2026-10-31T00:00:00.000Z',
    });
  });

  it('creates a draft funding plan and states the simulated-points boundary', async () => {
    const created = {
      id: 'plan-1', quest_id: 'quest-1', round_number: 1, version: 1, mode: 'budget', status: 'draft',
      reward_points: 50, fee_points: 3, planned_completions: 10, target_points: 530,
      starts_at: '2026-10-17T00:00:00.000Z', ends_at: '2026-10-31T00:00:00.000Z',
    };
    vi.mocked(getQuestFundingPlan).mockResolvedValueOnce({ plan: null }).mockResolvedValueOnce({ plan: created as never });
    render(<QuestFundingPage />);
    expect(await screen.findByRole('heading', { name: 'Set up this round' })).toBeTruthy();
    expect(screen.getByText(/Simulated demo points only/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create funding plan' }));
    await waitFor(() => expect(createFundingPlan).toHaveBeenCalledWith('quest-1', expect.objectContaining({
      mode: 'budget', planned_completions: 10,
      starts_at: expect.any(String), ends_at: expect.any(String),
    })));
    expect(await screen.findByRole('heading', { name: /Round 1/ })).toBeTruthy();
    expect(screen.getByText('530 pts')).toBeTruthy();
  });
});
