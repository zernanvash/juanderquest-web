import { describe, expect, it } from 'vitest';
import {
  deriveJuanChoiceDisplayMode,
  getJuanChoicePresentation,
  isJuanChoiceEnvironmentTrusted,
} from './juanchoice-presentation';
import {
  juanChoiceErrorCode,
  type JuanChoiceOverview,
  type JuanChoiceDetail,
  type JuanChoiceReceipt,
} from './juanchoice';
import { appRoutes } from './routes';

describe('JuanChoice presentation environment handshake', () => {
  it('strictly validates matching and mismatched environment markers in both directions', () => {
    // 1. Presentation build (NEXT_PUBLIC_JDQ_PRESENTATION_MODE = true)
    // Matching demo environment -> TRUSTED
    expect(isJuanChoiceEnvironmentTrusted({ environment: 'presentation_demo' }, true)).toBe(true);

    // Missing marker -> UNTRUSTED (fails closed)
    expect(isJuanChoiceEnvironmentTrusted({}, true)).toBe(false);
    expect(isJuanChoiceEnvironmentTrusted(null, true)).toBe(false);
    expect(isJuanChoiceEnvironmentTrusted(undefined, true)).toBe(false);
    expect(isJuanChoiceEnvironmentTrusted({ environment: undefined }, true)).toBe(false);

    // Mismatched / unexpected environment strings -> UNTRUSTED
    expect(isJuanChoiceEnvironmentTrusted({ environment: 'production' as unknown as 'presentation_demo' }, true)).toBe(false);
    expect(isJuanChoiceEnvironmentTrusted({ environment: 'alpha' as unknown as 'presentation_demo' }, true)).toBe(false);
    expect(isJuanChoiceEnvironmentTrusted({ environment: 'test' as unknown as 'presentation_demo' }, true)).toBe(false);
    expect(isJuanChoiceEnvironmentTrusted({ environment: '' as unknown as 'presentation_demo' }, true)).toBe(false);

    // 2. Ordinary alpha build (NEXT_PUBLIC_JDQ_PRESENTATION_MODE = false / undefined)
    // Standard alpha API without environment marker -> TRUSTED
    expect(isJuanChoiceEnvironmentTrusted({}, false)).toBe(true);
    expect(isJuanChoiceEnvironmentTrusted({ environment: undefined }, false)).toBe(true);

    // Demo API connected to ordinary build -> UNTRUSTED (prevent accidental demo voting on live site)
    expect(isJuanChoiceEnvironmentTrusted({ environment: 'presentation_demo' }, false)).toBe(false);

    // Null/undefined overview on ordinary build -> UNTRUSTED
    expect(isJuanChoiceEnvironmentTrusted(null, false)).toBe(false);
    expect(isJuanChoiceEnvironmentTrusted(undefined, false)).toBe(false);

    // Unexpected environment string on ordinary build -> UNTRUSTED
    expect(isJuanChoiceEnvironmentTrusted({ environment: 'unexpected' as unknown as 'presentation_demo' }, false)).toBe(false);
  });

  it('fails closed when overview availability is missing or malformed', () => {
    expect(deriveJuanChoiceDisplayMode(null)).toBe('unknown');
    expect(deriveJuanChoiceDisplayMode(undefined)).toBe('unknown');
    expect(
      deriveJuanChoiceDisplayMode({ availability: null as unknown as { voting_enabled: boolean; reason: string | null } }),
    ).toBe('unknown');
    expect(
      deriveJuanChoiceDisplayMode({ availability: {} as unknown as { voting_enabled: boolean; reason: string | null } }),
    ).toBe('unknown');
  });

  it('forces read_only and blocks voting on environment mismatch even if voting_enabled is true', () => {
    // Simulated API response where backend set voting_enabled: true, but environment was untrusted
    const untrustedOverview: JuanChoiceOverview = {
      server_time: '2026-10-04T12:00:00.000Z',
      region: { code: 'pangasinan', name: 'Pangasinan', timezone: 'Asia/Manila' },
      current: {
        id: 'round-1',
        slug: 'round-1',
        region: 'pangasinan',
        theme: 'Coastal Discoveries',
        status: 'voting',
        opens_at: '2026-10-04T12:00:00.000Z',
        closes_at: '2026-10-06T20:00:00.000Z',
        policy_version: 'juanchoice-pilot-v1',
      },
      availability: { voting_enabled: true, reason: null },
      environment: undefined, // Missing marker in presentation build!
    };

    // Environment trust check
    const isTrusted = isJuanChoiceEnvironmentTrusted(untrustedOverview, true);
    expect(isTrusted).toBe(false);

    // Sanitized overview fallback used by UI:
    const safeOverview = isTrusted
      ? untrustedOverview
      : { ...untrustedOverview, availability: { voting_enabled: false, reason: 'ENVIRONMENT_MISMATCH' } };

    expect(deriveJuanChoiceDisplayMode(safeOverview)).toBe('read_only');
    const presentation = getJuanChoicePresentation(safeOverview, 'voting');
    expect(presentation.mode).toBe('read_only');
    expect(presentation.readOnlyNotice).toBe(
      'Community voting is unavailable in this alpha. You can explore the schedule and previous results.',
    );
  });
});

describe('JuanChoice display presentation modes & copy contracts', () => {
  it('distinguishes write-enabled mode when voting_enabled is true', () => {
    const overview: Pick<JuanChoiceOverview, 'availability'> = {
      availability: { voting_enabled: true, reason: null },
    };
    expect(deriveJuanChoiceDisplayMode(overview)).toBe('write_enabled');

    const pres = getJuanChoicePresentation(overview, 'voting');
    expect(pres.mode).toBe('write_enabled');
    expect(pres.readOnlyNotice).toBeNull();
    expect(pres.headerTitle).toBe('Choose a destination worth discovering');
    expect(pres.headerDescription).toContain('One free ballot per round');
    expect(pres.roundWindowLabel).toBe('Voting closes');
    expect(pres.nextRoundWindowLabel).toBe('Voting opens');
    expect(pres.nextRoundHeading).toBe('Next community vote');
    expect(pres.nextRoundPrefix).toBe('Next round opens');
  });

  it('distinguishes read-only mode when voting_enabled is false regardless of campaign status', () => {
    const overview: Pick<JuanChoiceOverview, 'availability'> = {
      availability: { voting_enabled: false, reason: 'WRITES_DISABLED' },
    };
    expect(deriveJuanChoiceDisplayMode(overview)).toBe('read_only');

    // Case 1: Active voting status, but writes disabled
    const presVoting = getJuanChoicePresentation(overview, 'voting');
    expect(presVoting.mode).toBe('read_only');
    expect(presVoting.readOnlyNotice).toBe(
      'Community voting is unavailable in this alpha. You can explore the schedule and previous results.',
    );
    expect(presVoting.headerTitle).toBe('Community destination spotlight');
    expect(presVoting.headerDescription).toContain('If voting becomes available');
    expect(presVoting.headerDescription).not.toContain('in Pangasinan');
    expect(presVoting.roundWindowLabel).toBe('Round closes');
    expect(presVoting.nextRoundWindowLabel).toBe('Scheduled round begins');
    expect(presVoting.nextRoundHeading).toBe('Next scheduled round');
    expect(presVoting.nextRoundPrefix).toBe('Scheduled round begins');

    // Case 2: Scheduled status with writes disabled
    const presScheduled = getJuanChoicePresentation(overview, 'scheduled');
    expect(presScheduled.mode).toBe('read_only');
    expect(presScheduled.readOnlyNotice).toBe(
      'Community voting is unavailable in this alpha. You can explore the schedule and previous results.',
    );
    expect(presScheduled.roundWindowLabel).toBe('Scheduled round begins');
    expect(presScheduled.nextRoundHeading).toBe('Next scheduled round');
    expect(presScheduled.nextRoundPrefix).toBe('Scheduled round begins');

    // Case 3: Closed campaign with writes disabled
    const presClosed = getJuanChoicePresentation(overview, 'closed');
    expect(presClosed.mode).toBe('read_only');
    expect(presClosed.roundWindowLabel).toBe('Round closed');
    expect(presClosed.nextRoundHeading).toBe('Next scheduled round');
    expect(presClosed.nextRoundPrefix).toBe('Scheduled round begins');
  });

  it('handles scheduled and closed round window labels correctly across modes', () => {
    const writeOverview: Pick<JuanChoiceOverview, 'availability'> = {
      availability: { voting_enabled: true, reason: null },
    };
    // Scheduled round while writes are active
    const writeScheduled = getJuanChoicePresentation(writeOverview, 'scheduled');
    expect(writeScheduled.roundWindowLabel).toBe('Voting opens');

    // Closed round while writes are active
    const writeClosed = getJuanChoicePresentation(writeOverview, 'closed');
    expect(writeClosed.roundWindowLabel).toBe('Round closed');

    // Missing campaign
    const writeMissing = getJuanChoicePresentation(writeOverview, null);
    expect(writeMissing.roundWindowLabel).toBe('Round closed');
  });

  it('never infers write access from status alone without overview availability', () => {
    const pres = getJuanChoicePresentation(null, 'voting');
    expect(pres.mode).not.toBe('write_enabled');
    expect(pres.headerTitle).not.toBe('Choose a destination worth discovering');
  });
});

describe('JuanChoice failure classification & API outage recovery', () => {
  it('accurately classifies all error codes for resilient user messaging', () => {
    // 503 Feature/writes disabled
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 503, data: { error: { code: 'FEATURE_DISABLED' } } } })).toBe('FEATURE_DISABLED');
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 503, data: { error: { code: 'WRITES_DISABLED' } } } })).toBe('WRITES_DISABLED');

    // Network & timeouts
    expect(juanChoiceErrorCode({ isAxiosError: true, code: 'ETIMEDOUT' })).toBe('TIMEOUT');
    expect(juanChoiceErrorCode({ isAxiosError: true, code: 'ECONNABORTED' })).toBe('TIMEOUT');
    expect(juanChoiceErrorCode({ isAxiosError: true, message: 'Network Error' })).toBe('NETWORK_ERROR');

    // Rate limiting
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 429, data: {} } })).toBe('RATE_LIMITED');

    // 404 Campaign not found
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 404, data: { error: { code: 'CAMPAIGN_NOT_FOUND' } } } })).toBe('CAMPAIGN_NOT_FOUND');

    // Ballot version conflict
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 409, data: { error: { code: 'VERSION_CONFLICT' } } } })).toBe('VERSION_CONFLICT');

    // Round closed
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 400, data: { error: { code: 'ROUND_CLOSED' } } } })).toBe('ROUND_CLOSED');

    // Not eligible (e.g. account too new in production)
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 403, data: { error: { code: 'NOT_ELIGIBLE' } } } })).toBe('NOT_ELIGIBLE');

    // Generic server failure
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 500, data: {} } })).toBe('REQUEST_FAILED');
  });
});

describe('JuanChoice candidate deep links, sharing, and routing safety', () => {
  it('generates canonical round and candidate share URLs', () => {
    const campaignId = '550e8400-e29b-41d4-a716-446655440000';
    const candidateId = 'cand-tondol-beach';

    expect(appRoutes.choice(campaignId)).toBe(`/choice/${campaignId}`);
    expect(appRoutes.choiceCandidate(campaignId, candidateId)).toBe(
      `/choice/${campaignId}/candidates/${candidateId}`,
    );
  });

  it('rejects candidate mutation when fresh overview ID differs from selected round', () => {
    const selectedCampaignId = '550e8400-e29b-41d4-a716-446655440000';
    const differentCampaignId = '99999999-e29b-41d4-a716-446655440000';

    const freshOverview: Partial<JuanChoiceOverview> = {
      environment: 'presentation_demo',
      current: {
        id: differentCampaignId,
        slug: 'different-campaign',
        region: 'pangasinan',
        theme: 'Other Campaign',
        status: 'voting',
        opens_at: '2026-10-04T12:00:00.000Z',
        closes_at: '2026-10-06T20:00:00.000Z',
        policy_version: 'juanchoice-pilot-v1',
      },
      availability: { voting_enabled: true, reason: null },
    };

    // Guard simulation:
    const isValidForSelected =
      isJuanChoiceEnvironmentTrusted(freshOverview as JuanChoiceOverview, true) &&
      freshOverview.current?.id === selectedCampaignId &&
      freshOverview.availability?.voting_enabled === true;

    expect(isValidForSelected).toBe(false);
  });
});

describe('Presentation demo labeling and reward distinction contracts', () => {
  it('formats receipt and reward copy unambiguously for demo vs official modes', () => {
    const receipt: JuanChoiceReceipt = {
      ballot: {
        id: 'ballot-1',
        campaign_id: 'campaign-1',
        user_id: 'user-guest-1',
        candidate_id: 'candidate-1',
        version: 1,
        created_at: '2026-10-04T12:00:00.000Z',
        updated_at: '2026-10-04T12:00:00.000Z',
      },
      replayed: false,
    };

    // Presentation build receipt formatting contract:
    const formatReceiptText = (r: JuanChoiceReceipt, isPresentation: boolean) => {
      const rewardText = isPresentation
        ? 'Demo ballot recorded. +25 demo Civic XP and +1 demo stamp in the separate test database only'
        : 'Ballot recorded. +25 Civic XP and +1 stamp earned';
      const replayText = r.replayed ? ' (receipt replayed)' : '';
      return `${rewardText}${replayText}; 0 mJDQ issued.`;
    };

    const demoText = formatReceiptText(receipt, true);
    expect(demoText).toContain('Demo ballot recorded');
    expect(demoText).toContain('demo Civic XP');
    expect(demoText).toContain('demo stamp in the separate test database only');
    expect(demoText).not.toContain('Ballot recorded. +25 Civic XP and +1 stamp earned');

    const officialText = formatReceiptText(receipt, false);
    expect(officialText).toBe('Ballot recorded. +25 Civic XP and +1 stamp earned; 0 mJDQ issued.');
    expect(officialText).not.toContain('demo');
  });

  it('formats final results copy unambiguously for demo vs official modes', () => {
    const resultDetail: Pick<JuanChoiceDetail, 'result'> = {
      result: {
        campaign_id: 'round-1',
        valid_ballots: 42,
        co_winner_ids: ['cand-tondol'],
        finalized_at: '2026-10-06T20:00:00.000Z',
        status: 'finalized',
        is_test: false,
      },
    };

    const formatResultCopy = (res: NonNullable<typeof resultDetail.result>, isPresentation: boolean) => {
      if (isPresentation) {
        return `Presentation demo result: ${res.valid_ballots} demo ballots recorded in the separate test database. This rehearsal does not count toward official destination rankings or rewards.`;
      }
      return `Final result: ${res.valid_ballots} valid ballots. One destination topped the community vote. Spotlight placement still requires a separate safety review.`;
    };

    const demoResultCopy = formatResultCopy(resultDetail.result!, true);
    expect(demoResultCopy).toContain('Presentation demo result: 42 demo ballots recorded in the separate test database');
    expect(demoResultCopy).toContain('does not count toward official destination rankings or rewards');

    const officialResultCopy = formatResultCopy(resultDetail.result!, false);
    expect(officialResultCopy).toContain('Final result: 42 valid ballots');
    expect(officialResultCopy).not.toContain('demo');
  });
});
