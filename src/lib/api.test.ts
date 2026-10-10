import { describe, expect, it } from 'vitest';
import {
  buildProposalVotePayload,
  buildSubmissionPayload,
  computeVoteFeeSplit,
  isUnauthorizedError,
  normalizeQuest,
  normalizeSubmission,
} from './api';

describe('API helpers', () => {
  it('recognizes Axios 401 responses without treating other errors as expired sessions', () => {
    expect(isUnauthorizedError({ isAxiosError: true, response: { status: 401 } })).toBe(true);
    expect(isUnauthorizedError({ isAxiosError: true, response: { status: 500 } })).toBe(false);
    expect(isUnauthorizedError(new Error('network'))).toBe(false);
  });

  it('normalizes backend quest and submission fields', () => {
    expect(normalizeQuest({ id: 'q1', title: 'Quest', description: 'Visit', category: 'eco', location_name: 'Pangasinan', gps_lat: 16.1, gps_lng: 120.3, radius_meters: 50, reward_points: 25 }).locationName).toBe('Pangasinan');
    expect(normalizeSubmission({ id: 's1', quest_id: 'q1', status: 'pending', captured_lat: 16.1, captured_lng: 120.3, created_at: '2026-08-03' })).toMatchObject({ questId: 'q1', questTitle: 'Unknown Quest', rewardPoints: 0 });
  });

  it('builds the backend submission payload from a server challenge token only', () => {
    expect(() =>
      buildSubmissionPayload({ id: 'q1' }, { lat: 16.1, lng: 120.3, accuracy: 8 })
    ).toThrow(/challenge token is required/i);

    const payload = buildSubmissionPayload({ id: 'q1', challengeToken: 'CHAL_TOKEN' }, { lat: 16.1, lng: 120.3, accuracy: 8 });
    expect(payload).toMatchObject({ quest_id: 'q1', challenge_token: 'CHAL_TOKEN', captured_lat: 16.1, captured_lng: 120.3, captured_accuracy: 8 });
    expect(payload.idempotency_key).toMatch(/^[0-9a-f-]{36}$/i);
    expect(payload).not.toHaveProperty('scanned_marker_code');
  });

  it('splits the configured fee without creating fractional mJDQ', () => {
    expect(computeVoteFeeSplit({ proposalVoteFeeMjdq: 1000, burnBps: 2500 })).toEqual({ fee: 1000, burn: 250, escrow: 750, feeJdq: 1 });
  });

  it('builds the paid proposal vote contract with an idempotency key', () => {
    const payload = buildProposalVotePayload('yes');
    expect(payload.choice).toBe('yes');
    expect(payload.idempotency_key).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
