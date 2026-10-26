import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyStampsCard } from './DailyStampsCard';

const stampsApi = vi.hoisted(() => ({
  fetchDailyStamps: vi.fn(),
  claimDailyStamps: vi.fn(),
  STAMPS_UPDATED_EVENT: 'jdq:stamps-updated',
  formatStampCountdown: () => '03h 20m 10s',
  missionIconKind: () => 'qotd',
}));

vi.mock('@/lib/stamps-api', () => stampsApi);
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'traveler-1', displayName: 'Vash', points: 10, role: 'user' } }),
}));
vi.mock('@/lib/animations/gsap', () => ({
  gsap: { fromTo: vi.fn(), killTweensOf: vi.fn() },
  motionDuration: () => 0,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const baseDaily = {
  date: '2026-10-26',
  week_id: '2026-W44',
  next_reset_at: '2026-10-26T16:00:00.000Z',
  balance: 120,
  week: { used: 45, cap: 250, remaining: 205 },
  claim: {
    claimed_today: false,
    cycle_day: 3,
    claimed_days: 2,
    nominal_stamps: 5,
    awarded: 0,
    capped: false,
    claimed_at: null,
    calendar: Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      stamps: index === 6 ? 25 : 5,
      claimed: index < 2,
    })),
  },
  streak: { current: 2, best: 5, last_claim_date: '2026-10-25', shields_held: 1, shields_max: 2, shield_price: 100 },
  chest: { completed_missions: 2, required: 5, stamps: 30, earned: false },
  missions: [
    { id: 'mission-qotd', kind: 'qotd', title: 'Answer the Question of the Day', stamps: 5, on_site: false, progress: 0, target: 1, completed: false, completed_at: null },
    { id: 'mission-checkin', kind: 'check_in', title: 'Check in at a destination', stamps: 10, on_site: true, progress: 1, target: 1, completed: true, completed_at: '2026-10-26T02:00:00.000Z' },
    { id: 'mission-cheer', kind: 'cheer_post', title: 'Cheer a Plaza post', stamps: 5, on_site: false, progress: 0, target: 1, completed: false, completed_at: null },
  ],
  qotd: { answered: false },
};

describe('DailyStampsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stampsApi.fetchDailyStamps.mockResolvedValue(baseDaily);
    stampsApi.claimDailyStamps.mockResolvedValue({ ...baseDaily, replayed: false });
  });
  afterEach(cleanup);

  it('renders the seven-day calendar, missions, chest, streak and weekly cap', async () => {
    render(<DailyStampsCard />);
    expect(await screen.findByText('Daily Passport Stamps')).toBeTruthy();
    expect(screen.getByText(/120/)).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('Answer the Question of the Day')).toBeTruthy();
    expect(screen.getByText('Check in at a destination')).toBeTruthy();
    expect(screen.getByText('2/5 missions · +30 stamps')).toBeTruthy();
    expect(screen.getByText('2-day streak')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Weekly stamp cap used' })).toBeTruthy();
    expect(screen.getByText('45 / 250')).toBeTruthy();
  });

  it('claims once, refreshes the card and shows the claimed state', async () => {
    stampsApi.fetchDailyStamps
      .mockResolvedValueOnce(baseDaily)
      .mockResolvedValueOnce({
        ...baseDaily,
        balance: 125,
        claim: { ...baseDaily.claim, claimed_today: true, awarded: 5, cycle_day: 3, claimed_days: 3 },
      });
    render(<DailyStampsCard />);
    const button = await screen.findByRole('button', { name: /Claim \+5 stamps/i });
    fireEvent.click(button);
    await waitFor(() => expect(stampsApi.claimDailyStamps).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Claimed today/)).toBeTruthy();
    expect(stampsApi.fetchDailyStamps).toHaveBeenCalledTimes(2);
  });

  it('does not let a claimed day be claimed again', async () => {
    stampsApi.fetchDailyStamps.mockResolvedValue({
      ...baseDaily,
      claim: { ...baseDaily.claim, claimed_today: true, awarded: 5 },
    });
    render(<DailyStampsCard />);
    const button = await screen.findByRole('button', { name: /Claimed today/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
