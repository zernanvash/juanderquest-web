import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { JuanChoiceOverview, JuanChoiceDetail, JuanChoiceMyState, JuanChoiceReceipt } from '@/lib/juanchoice';

// Mock dependencies before importing JuanChoiceExperience
vi.mock('@/components/Navigation', () => ({
  Navigation: ({ children }: { children: React.ReactNode }) => <div data-testid="nav-wrapper">{children}</div>,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mutable mocks for lib/auth and lib/juanchoice
const mockAuth = {
  user: { id: 'usr-1', username: 'guest_1', name: 'Guest 1', email: 'guest1@example.com' } as { id: string; username: string; name: string; email: string } | null,
  isLoading: false,
  isPreviewActive: false,
};

vi.mock('@/lib/auth', () => ({
  useAuth: () => mockAuth,
}));

const mockJuanChoice = {
  getJuanChoiceOverview: vi.fn<() => Promise<JuanChoiceOverview>>(),
  getJuanChoiceCampaign: vi.fn<(id: string) => Promise<JuanChoiceDetail>>(),
  getMyJuanChoiceState: vi.fn<(id: string) => Promise<JuanChoiceMyState | null>>(),
  putJuanChoiceBallot: vi.fn<() => Promise<JuanChoiceReceipt>>(),
  uuid: () => 'fixed-test-uuid',
};

vi.mock('@/lib/juanchoice', async () => {
  const actual = await vi.importActual<typeof import('@/lib/juanchoice')>('@/lib/juanchoice');
  return {
    ...actual,
    getJuanChoiceOverview: () => mockJuanChoice.getJuanChoiceOverview(),
    getJuanChoiceCampaign: (id: string) => mockJuanChoice.getJuanChoiceCampaign(id),
    getMyJuanChoiceState: (id: string) => mockJuanChoice.getMyJuanChoiceState(id),
    putJuanChoiceBallot: () => mockJuanChoice.putJuanChoiceBallot(),
  };
});

process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE = 'true';

// Import component under test after env var is set
import { JuanChoiceExperience } from './JuanChoiceExperience';

const mockPresentationOverview: JuanChoiceOverview = {
  server_time: '2026-10-04T12:00:00.000Z',
  region: { code: 'pangasinan', name: 'Pangasinan', timezone: 'Asia/Manila' },
  current: {
    id: 'round-1',
    slug: 'round-1',
    region: 'pangasinan',
    theme: 'Coastal Wonders of Pangasinan',
    status: 'voting',
    opens_at: '2026-10-04T10:00:00.000Z',
    closes_at: '2026-10-06T20:00:00.000Z',
    policy_version: 'juanchoice-pilot-v1',
  },
  availability: { voting_enabled: true, reason: null },
  environment: 'presentation_demo',
  notice: null,
};

const mockCampaignDetail: JuanChoiceDetail = {
  campaign: {
    id: 'round-1',
    slug: 'round-1',
    region: 'pangasinan',
    theme: 'Coastal Wonders of Pangasinan',
    status: 'voting',
    opens_at: '2026-10-04T10:00:00.000Z',
    closes_at: '2026-10-06T20:00:00.000Z',
    policy_version: 'juanchoice-pilot-v1',
  },
  standings: [
    { candidate_id: 'cand-1', spot_id: 'spot-1', spot_name: 'Tondol White Sand Beach', votes: 2, share: 0.5 },
    { candidate_id: 'cand-2', spot_id: 'spot-2', spot_name: 'Patar Beach Lighthouse', votes: 2, share: 0.5 },
  ],
  result: null,
};

const mockMyState: JuanChoiceMyState = {
  can_vote_now: true,
  eligibility: {
    eligible: true,
    reason: null,
    account_created_at: '2026-10-01T00:00:00.000Z',
    verified_visits_count: 1,
    required_visits: 1,
    eligible_at: null,
  },
  ballot: null,
  participation: null,
};

function makeAxiosError(message: string, status?: number, code?: string) {
  const err = new Error(message) as Error & {
    isAxiosError: boolean;
    response?: { status: number; data: { error?: { code: string } } };
  };
  err.isAxiosError = true;
  if (status !== undefined) {
    err.response = { status, data: code ? { error: { code } } : {} };
  }
  return err;
}

describe('JuanChoiceExperience component integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = { id: 'usr-1', username: 'guest_1', name: 'Guest 1', email: 'guest1@example.com' };
    mockAuth.isLoading = false;
    mockAuth.isPreviewActive = false;
    // Set presentation mode env var
    process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE = 'true';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders presentation demo banner, mode copy, and allows voting with demo confirmation modal', async () => {
    mockJuanChoice.getJuanChoiceOverview.mockResolvedValue(mockPresentationOverview);
    mockJuanChoice.getJuanChoiceCampaign.mockResolvedValue(mockCampaignDetail);
    mockJuanChoice.getMyJuanChoiceState.mockResolvedValue(mockMyState);

    const mockReceipt: JuanChoiceReceipt = {
      ballot: {
        id: 'ballot-101',
        campaign_id: 'round-1',
        user_id: 'usr-1',
        candidate_id: 'cand-1',
        version: 1,
        created_at: '2026-10-04T12:05:00.000Z',
        updated_at: '2026-10-04T12:05:00.000Z',
      },
      replayed: false,
    };
    mockJuanChoice.putJuanChoiceBallot.mockResolvedValue(mockReceipt);

    render(<JuanChoiceExperience isPresentation={true} />);

    // Presentation demo warning banner must be visible
    const banner = await screen.findByText(/Presentation demo — votes and Civic XP\/stamps stay in a separate test database/i);
    expect(banner).toBeTruthy();

    // Candidates must be rendered with demo labels after detail resolves
    const candidate = await screen.findByText('Tondol White Sand Beach');
    expect(candidate).toBeTruthy();
    expect(screen.getAllByText(/2 demo ballots · popularity, not a visitor rating/i).length).toBe(2);

    // Vote button should be available
    const voteButtons = screen.getAllByRole('button', { name: /Vote for this place/i });
    expect(voteButtons.length).toBeGreaterThan(0);

    // Click vote for cand-1
    fireEvent.click(voteButtons[0]);

    // Modal dialog must show presentation demo disclaimer
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/This is a presentation demo: the ballot and participation XP\/stamp stay in the separate test database and do not count officially/i)).toBeTruthy();

    // Confirm vote
    const confirmButton = screen.getByRole('button', { name: /Confirm vote/i });
    fireEvent.click(confirmButton);

    // Wait for receipt display
    await waitFor(() => {
      expect(mockJuanChoice.putJuanChoiceBallot).toHaveBeenCalled();
      expect(screen.getByText(/Demo ballot recorded\. \+25 demo Civic XP and \+1 demo stamp in the separate test database only; 0 mJDQ issued\./i)).toBeTruthy();
    });
  });

  it('renders alert and disables voting when environment marker is mismatched or missing', async () => {
    // Missing environment marker in presentation build
    const untrustedOverview: JuanChoiceOverview = {
      ...mockPresentationOverview,
      environment: undefined,
    };

    mockJuanChoice.getJuanChoiceOverview.mockResolvedValue(untrustedOverview);
    mockJuanChoice.getJuanChoiceCampaign.mockResolvedValue(mockCampaignDetail);
    mockJuanChoice.getMyJuanChoiceState.mockResolvedValue(mockMyState);

    render(<JuanChoiceExperience isPresentation={true} />);

    // Mismatch alert must be visible
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'Voting configuration mismatch. Ballots are disabled here. Reload the page or ask the team to check the demo API.'
    );

    // Vote buttons must NOT be present
    expect(screen.queryByRole('button', { name: /Vote for this place/i })).toBeNull();
  });

  it('handles API outage when overview fails to load', async () => {
    mockJuanChoice.getJuanChoiceOverview.mockRejectedValue(new Error('Network Error'));

    render(<JuanChoiceExperience isPresentation={true} />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Campaigns could not be loaded. Please retry.');
    expect(screen.getByRole('button', { name: /Retry/i })).toBeTruthy();
  });

  it('handles FEATURE_DISABLED from overview during non-pilot mode', async () => {
    mockJuanChoice.getJuanChoiceOverview.mockRejectedValue(makeAxiosError('Disabled', 503, 'FEATURE_DISABLED'));

    render(<JuanChoiceExperience isPresentation={true} />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'JuanChoice is not open yet. Check back when the pilot begins.'
    );
  });

  it('handles CAMPAIGN_NOT_FOUND when requesting an unknown campaignId', async () => {
    mockJuanChoice.getJuanChoiceOverview.mockResolvedValue(mockPresentationOverview);
    mockJuanChoice.getJuanChoiceCampaign.mockRejectedValue(makeAxiosError('Not Found', 404, 'CAMPAIGN_NOT_FOUND'));

    render(<JuanChoiceExperience campaignId="unknown-round-uuid" isPresentation={true} />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('This campaign is unavailable.');
  });

  it('displays error and suggests retry on VERSION_CONFLICT', async () => {
    mockJuanChoice.getJuanChoiceOverview.mockResolvedValue(mockPresentationOverview);
    mockJuanChoice.getJuanChoiceCampaign.mockResolvedValue(mockCampaignDetail);
    mockJuanChoice.getMyJuanChoiceState.mockResolvedValue(mockMyState);

    mockJuanChoice.putJuanChoiceBallot.mockRejectedValue(makeAxiosError('Conflict', 409, 'VERSION_CONFLICT'));

    render(<JuanChoiceExperience isPresentation={true} />);

    const voteButtons = await screen.findAllByRole('button', { name: /Vote for this place/i });
    fireEvent.click(voteButtons[0]);

    const confirmButton = screen.getByRole('button', { name: /Confirm vote/i });
    fireEvent.click(confirmButton);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'Your ballot changed in another session. Review the latest selection before trying again.'
    );
  });

  it('displays error and informs user when round is ROUND_CLOSED', async () => {
    mockJuanChoice.getJuanChoiceOverview.mockResolvedValue(mockPresentationOverview);
    mockJuanChoice.getJuanChoiceCampaign.mockResolvedValue(mockCampaignDetail);
    mockJuanChoice.getMyJuanChoiceState.mockResolvedValue(mockMyState);

    mockJuanChoice.putJuanChoiceBallot.mockRejectedValue(makeAxiosError('Closed', 400, 'ROUND_CLOSED'));

    render(<JuanChoiceExperience isPresentation={true} />);

    const voteButtons = await screen.findAllByRole('button', { name: /Vote for this place/i });
    fireEvent.click(voteButtons[0]);

    const confirmButton = screen.getByRole('button', { name: /Confirm vote/i });
    fireEvent.click(confirmButton);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'This round has closed. No new ballot was submitted.'
    );
  });

  it('informs user about idempotent retry safety on network error', async () => {
    mockJuanChoice.getJuanChoiceOverview.mockResolvedValue(mockPresentationOverview);
    mockJuanChoice.getJuanChoiceCampaign.mockResolvedValue(mockCampaignDetail);
    mockJuanChoice.getMyJuanChoiceState.mockResolvedValue(mockMyState);

    mockJuanChoice.putJuanChoiceBallot.mockRejectedValue(makeAxiosError('Network Error'));

    render(<JuanChoiceExperience isPresentation={true} />);

    const voteButtons = await screen.findAllByRole('button', { name: /Vote for this place/i });
    fireEvent.click(voteButtons[0]);

    const confirmButton = screen.getByRole('button', { name: /Confirm vote/i });
    fireEvent.click(confirmButton);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'The result is uncertain. Retry uses the same receipt key, so it cannot double-count your vote.'
    );
  });

  it('renders finalized round demo results with clear disclaimers', async () => {
    const finalizedDetail: JuanChoiceDetail = {
      ...mockCampaignDetail,
      campaign: { ...mockCampaignDetail.campaign, status: 'closed' },
      result: {
        campaign_id: 'round-1',
        valid_ballots: 4,
        co_winner_ids: ['cand-1', 'cand-2'],
        finalized_at: '2026-10-06T20:00:00.000Z',
        status: 'finalized',
        is_test: true,
      },
    };

    mockJuanChoice.getJuanChoiceOverview.mockResolvedValue({
      ...mockPresentationOverview,
      current: { ...mockPresentationOverview.current!, status: 'closed' },
      availability: { voting_enabled: false, reason: 'ROUND_CLOSED' },
    });
    mockJuanChoice.getJuanChoiceCampaign.mockResolvedValue(finalizedDetail);
    mockJuanChoice.getMyJuanChoiceState.mockResolvedValue({ ...mockMyState, can_vote_now: false });

    render(<JuanChoiceExperience isPresentation={true} />);

    const demoResult = await screen.findByText(/Presentation demo result: 4 demo ballots recorded in the separate test database\. This rehearsal does not count toward official destination rankings or rewards\./i);
    expect(demoResult).toBeTruthy();
  });

  it('renders share round and candidate deep-link surfaces', async () => {
    mockJuanChoice.getJuanChoiceOverview.mockResolvedValue(mockPresentationOverview);
    mockJuanChoice.getJuanChoiceCampaign.mockResolvedValue(mockCampaignDetail);
    mockJuanChoice.getMyJuanChoiceState.mockResolvedValue(mockMyState);

    render(<JuanChoiceExperience isPresentation={true} />);

    // Share round link
    const shareRoundLink = await screen.findByRole('link', { name: /Share round/i });
    expect(shareRoundLink.getAttribute('href')).toBe('/choice/round-1');

    // Candidate deep link shares
    const shareCandidateLinks = screen.getAllByRole('link', { name: 'Share' });
    expect(shareCandidateLinks[0].getAttribute('href')).toBe('/choice/round-1/candidates/cand-1');
    expect(shareCandidateLinks[1].getAttribute('href')).toBe('/choice/round-1/candidates/cand-2');
  });

  it('strictly enforces ordinary read-only alpha behavior when isPresentation is false', async () => {
    const alphaOverview: JuanChoiceOverview = {
      server_time: '2026-10-04T12:00:00.000Z',
      region: { code: 'pangasinan', name: 'Pangasinan', timezone: 'Asia/Manila' },
      current: {
        id: 'round-alpha-1',
        slug: 'round-alpha-1',
        region: 'pangasinan',
        theme: 'Coastal Wonders of Pangasinan',
        status: 'voting',
        opens_at: '2026-10-04T10:00:00.000Z',
        closes_at: '2026-10-06T20:00:00.000Z',
        policy_version: 'juanchoice-pilot-v1',
      },
      availability: { voting_enabled: false, reason: 'WRITES_DISABLED' },
      environment: undefined, // Ordinary alpha API has no environment marker
      notice: null,
    };

    mockJuanChoice.getJuanChoiceOverview.mockResolvedValue(alphaOverview);
    mockJuanChoice.getJuanChoiceCampaign.mockResolvedValue(mockCampaignDetail);
    mockJuanChoice.getMyJuanChoiceState.mockResolvedValue({ ...mockMyState, can_vote_now: false });

    render(<JuanChoiceExperience isPresentation={false} />);

    // Must NOT render presentation demo banner
    expect(screen.queryByText(/Presentation demo/i)).toBeNull();

    // Must render ordinary read-only notice
    const statusNotice = await screen.findByText(
      'Community voting is unavailable in this alpha. You can explore the schedule and previous results.'
    );
    expect(statusNotice).toBeTruthy();

    // Header title must be ordinary alpha copy
    expect(screen.getByText('Community destination spotlight')).toBeTruthy();

    // Voting button must NOT be present
    expect(screen.queryByRole('button', { name: /Vote for this place/i })).toBeNull();
  });
});
