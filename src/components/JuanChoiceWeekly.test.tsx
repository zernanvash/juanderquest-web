import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { JuanChoiceOverview, JuanChoiceDetail, JuanChoiceMyState, JuanChoiceReceipt, JuanChoiceReigning } from '@/lib/juanchoice';

vi.mock('@/components/Navigation', () => ({ Navigation: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('./CelebrationEffects', () => ({ triggerCelebration: vi.fn() }));
const auth = { user: { id: 'usr-1', points: 500 }, isLoading: false, isPreviewActive: false, refreshProfile: vi.fn(async () => {}) };
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }));
const lib = {
  getJuanChoiceOverview: vi.fn<() => Promise<JuanChoiceOverview>>(),
  getJuanChoiceCampaign: vi.fn<(id: string) => Promise<JuanChoiceDetail>>(),
  getMyJuanChoiceState: vi.fn<(id: string) => Promise<JuanChoiceMyState | null>>(),
  putJuanChoiceBallot: vi.fn<(...args: unknown[]) => Promise<JuanChoiceReceipt>>(),
};
vi.mock('@/lib/juanchoice', async () => {
  const actual = await vi.importActual<typeof import('@/lib/juanchoice')>('@/lib/juanchoice');
  return { ...actual,
    getJuanChoiceOverview: () => lib.getJuanChoiceOverview(),
    getJuanChoiceCampaign: (id: string) => lib.getJuanChoiceCampaign(id),
    getMyJuanChoiceState: (id: string) => lib.getMyJuanChoiceState(id),
    putJuanChoiceBallot: (...args: unknown[]) => lib.putJuanChoiceBallot(...args) };
});

process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE = 'false';
import { JuanChoiceExperience } from './JuanChoiceExperience';
import { BoostBar, PerkPills, ReigningHero } from './JuanChoiceWeekly';

const now = '2026-10-28T04:00:00.000Z';
const reigning: JuanChoiceReigning = {
  campaign_id: 'last-week', theme: 'Coast', reign_starts_at: '2026-10-25T16:00:00.000Z', reign_ends_at: '2026-11-01T16:00:00.000Z',
  champions: [{ candidate_id: 'c1', spot_id: 'spot-patar', spot_slug: 'patar', spot_name: 'Patar Beach', municipality: 'Bolinao' }],
  minister: { candidate_id: 'c2', spot_id: 'spot-cave', spot_slug: 'cave', spot_name: 'Enchanted Cave', municipality: 'Bolinao' },
  perks: [
    { key: 'spot_xp_boost', label: '+50% quest XP here', is_mystery: false, revealed: true, domain: 'quests', role: 'champion', spot_id: 'spot-patar', municipality: 'Bolinao', reign_ends_at: '' },
    { key: 'daily_stamp_bonus', label: '+5 daily stamps', is_mystery: false, revealed: true, domain: 'stamps_quiz', role: 'minister', spot_id: 'spot-cave', municipality: 'Bolinao', reign_ends_at: '' },
  ],
  total_weighted_votes: 12, valid_ballots: 7,
};
const campaign = { id: 'wk-1', slug: 'weekly-2026-W44', region: 'Pangasinan', theme: 'Weekly coast', status: 'voting' as const,
  opens_at: '2026-10-25T16:00:00.000Z', closes_at: '2026-11-01T16:00:00.000Z', policy_version: 'juanchoice-weekly-v1' };
const overview = (): JuanChoiceOverview => ({ server_time: now, region: { key: 'pangasinan', label: 'Pangasinan', timezone: 'Asia/Manila' },
  view: 'open', availability: { voting_enabled: true, reason: null }, current: { ...campaign, period_start: '2026-10-26' },
  reigning, next: null, previous: null, notice: null });
const detail = (hidden = false): JuanChoiceDetail => ({ campaign: { ...campaign, tally_hidden: hidden }, result: null, standings: [
  { candidate_id: 'k1', spot_id: 's1', spot_name: 'Tondol Beach', votes: hidden ? null : 6, voter_count: hidden ? null : 3, prior_loss_streak: 1,
    manifesto_perks: [{ key: 'spot_xp_boost', label: '+50% quest XP here', is_mystery: false, revealed: true, is_anchor: true, domain: 'quests' },
      { is_mystery: true, revealed: false, label: '??? Mystery perk' }] },
  { candidate_id: 'k2', spot_id: 's2', spot_name: 'Hundred Islands', votes: hidden ? null : 2, voter_count: hidden ? null : 2 },
] });
const mine = (): JuanChoiceMyState => ({ ballot: { candidate_id: 'k1', version: 1, vote_weight: 1 }, eligibility: { eligible: true, reason: null, eligible_at: null },
  can_vote_now: true, vote_unavailable_reason: null, server_time: now,
  boost: { available: true, current_weight: 1, next_weight: 2, next_cost_points: 25, cost_by_weight: { 1: 0, 2: 25, 3: 100, 4: 275, 5: 625 }, civic_xp_per_tier: 10 } });

describe('Plan 65 weekly JuanChoice UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lib.getJuanChoiceOverview.mockResolvedValue(overview());
    lib.getJuanChoiceCampaign.mockResolvedValue(detail());
    lib.getMyJuanChoiceState.mockResolvedValue(mine());
  });

  it('masks the mystery perk and offers only the next boost tier at its price', () => {
    render(<PerkPills perks={detail().standings[0].manifesto_perks} />);
    expect(screen.getByText(/\?\?\? Mystery perk/)).toBeTruthy();
    const onBoost = vi.fn();
    render(<BoostBar currentWeight={2} costByWeight={{ 1: 0, 2: 25, 3: 100, 4: 275, 5: 625 }} xpPerTier={10} balance={300} onBoost={onBoost} />);
    fireEvent.click(screen.getByRole('button', { name: /3x · 75 pts/ }));
    expect(onBoost).toHaveBeenCalledWith(3, 75);
    expect(screen.queryByRole('button', { name: /4x/ })).toBeNull();
  });

  it('shows the reigning Champion, Minister, live perks and a countdown', () => {
    render(<ReigningHero reigning={reigning} nowMs={Date.parse(now)} />);
    expect(screen.getByRole('heading', { name: 'Patar Beach' })).toBeTruthy();
    expect(screen.getByText('Enchanted Cave')).toBeTruthy();
    expect(screen.getAllByText(/Live this week/).length).toBe(2);
    expect(screen.getByLabelText('Reign time left').textContent).toMatch(/4d 12h left/);
    expect(screen.getByRole('link', { name: /Trails & route here/ }).getAttribute('href')).toBe('/map?spot=spot-patar&trip=1');
  });

  it('boosts a ballot through a points confirmation', async () => {
    lib.putJuanChoiceBallot.mockResolvedValue({ ballot: { candidate_id: 'k1', version: 2, vote_weight: 2 }, participation: null,
      boost: { points_spent: 25, civic_xp: 10, total_points_spent: 25 }, replayed: false, policy_version: 'juanchoice-weekly-v1' });
    render(<JuanChoiceExperience />);
    expect(await screen.findByRole('heading', { name: 'Patar Beach' })).toBeTruthy();
    expect(await screen.findByText(/Underdog/)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /2x · 25 pts/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Spend 25 points/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm vote/ }));
    await waitFor(() => expect(lib.putJuanChoiceBallot).toHaveBeenCalledWith('wk-1', 'k1', 1, expect.any(String), 2));
    expect((await screen.findByText(/Boost recorded: your vote now counts 2x/)).textContent).toMatch(/25 points spent, \+10 Civic XP/);
    expect(auth.refreshProfile).toHaveBeenCalled();
  });

  it('hides counts and rank during the final 24 hours', async () => {
    lib.getJuanChoiceCampaign.mockResolvedValue(detail(true));
    render(<JuanChoiceExperience />);
    expect(await screen.findByText(/Final 24 hours: vote counts are hidden/)).toBeTruthy();
    expect(screen.getAllByText(/Votes hidden in the final 24 hours/).length).toBe(2);
    expect(screen.queryByText(/#1 ·/)).toBeNull();
  });
});
