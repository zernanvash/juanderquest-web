import { describe, expect, it } from 'vitest';
import {
  buildProposalVotePayload,
  buildSubmissionPayload,
  computeVoteFeeSplit,
  normalizeQuest,
  normalizeSubmission,
} from './api';

describe('API helpers', () => {
  it('normalizes backend quest and submission fields', () => {
    expect(normalizeQuest({ id: 'q1', title: 'Quest', description: 'Visit', category: 'eco', location_name: 'Pangasinan', gps_lat: 16.1, gps_lng: 120.3, radius_meters: 50, reward_points: 25 }).locationName).toBe('Pangasinan');
    expect(normalizeSubmission({ id: 's1', quest_id: 'q1', status: 'pending', captured_lat: 16.1, captured_lng: 120.3, created_at: '2026-08-03' })).toMatchObject({ questId: 'q1', questTitle: 'Unknown Quest', rewardPoints: 0 });
  });

  it('builds the backend submission payload', () => {
    const payload = buildSubmissionPayload({ id: 'q1', markerCode: 'MARKER' }, { lat: 16.1, lng: 120.3, accuracy: 8 });
    expect(payload).toMatchObject({ quest_id: 'q1', scanned_marker_code: 'MARKER', captured_lat: 16.1, captured_lng: 120.3, captured_accuracy: 8 });
    expect(payload.idempotency_key).toMatch(/^[0-9a-f-]{36}$/i);
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
