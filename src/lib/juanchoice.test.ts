import { describe, expect, it } from 'vitest';
import { effectiveJuanChoiceStatus, juanChoiceErrorCode, normalizeMyJuanChoiceState, planJuanChoicePlacement, serverAlignedNow, JuanChoiceCampaign, JuanChoiceSpotlight } from './juanchoice';

describe('JuanChoice failure classification', () => {
  it('keeps disabled, timeout, rate limiting, and generic server failures distinct', () => {
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 503, data: { error: { code: 'FEATURE_DISABLED' } } } })).toBe('FEATURE_DISABLED');
    expect(juanChoiceErrorCode({ isAxiosError: true, code: 'ETIMEDOUT' })).toBe('TIMEOUT');
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 429, data: {} } })).toBe('RATE_LIMITED');
    expect(juanChoiceErrorCode({ isAxiosError: true, response: { status: 500, data: {} } })).toBe('REQUEST_FAILED');
  });
});

const campaign: JuanChoiceCampaign = {
  id: 'round', slug: 'round', region: 'Pangasinan', theme: 'Hidden gems',
  status: 'scheduled', opens_at: '2026-09-17T00:00:00.000Z', closes_at: '2026-09-24T00:00:00.000Z', policy_version: 'juanchoice-pilot-v1',
};

describe('JuanChoice display state', () => {
  it('fails closed when an older API omits eligibility', () => {
    expect(normalizeMyJuanChoiceState({ ballot: null }).can_vote_now).toBe(false);
    expect(normalizeMyJuanChoiceState({ ballot: null }).eligibility.reason).toBe('UNAVAILABLE');
  });
  it('uses server time and monotonic elapsed time even when the device clock is wrong', () => {
    const receivedAtMono = 1000;
    const opensAt = Date.parse(campaign.opens_at);
    expect(serverAlignedNow(new Date(opensAt - 500).toISOString(), receivedAtMono, receivedAtMono)).toBe(opensAt - 500);
    expect(effectiveJuanChoiceStatus(campaign, serverAlignedNow(new Date(opensAt - 500).toISOString(), receivedAtMono, 1500)!)).toBe('voting');
    expect(serverAlignedNow(new Date(opensAt - 500).toISOString(), receivedAtMono, 900)).toBe(opensAt - 500);
  });
  it('fails closed when the server timestamp is invalid', () => {
    expect(serverAlignedNow('invalid', 1000, 2000)).toBeNull();
    expect(serverAlignedNow(campaign.opens_at, Number.NaN, 2000)).toBeNull();
  });
  it('uses an inclusive opening and exclusive closing boundary', () => {
    expect(effectiveJuanChoiceStatus(campaign, Date.parse(campaign.opens_at) - 1)).toBe('scheduled');
    expect(effectiveJuanChoiceStatus(campaign, Date.parse(campaign.opens_at))).toBe('voting');
    expect(effectiveJuanChoiceStatus(campaign, Date.parse(campaign.closes_at))).toBe('closed');
  });
  it('never reopens a cancelled or finalized round', () => {
    expect(effectiveJuanChoiceStatus({...campaign,status:'cancelled'},Date.parse(campaign.opens_at))).toBe('cancelled');
    expect(effectiveJuanChoiceStatus({...campaign,status:'finalized'},Date.parse(campaign.opens_at))).toBe('finalized');
  });
  it('does not trust a stale voting status before the server opening time', () => {
    expect(effectiveJuanChoiceStatus({ ...campaign, status: 'voting' }, Date.parse(campaign.opens_at) - 1)).toBe('scheduled');
  });
});

describe('JuanChoice feed placement', () => {
  const spotlight: JuanChoiceSpotlight = {
    kind:'juanchoice_spotlight',campaign_id:'round',theme:'Hidden gems',region:'Pangasinan',valid_ballots:12,
    finalized_at:'2026-09-17T00:00:00.000Z',expires_at:'2026-09-24T00:00:00.000Z',
    winners:[{candidate_id:'winner',spot_id:'spot-2',spot_slug:'quiet-cove',spot_name:'Quiet Cove',municipality:'Bolinao'}],
  };
  it('inserts one typed card after at most three ordinary posts and removes the duplicated destination', () => {
    const planned=planJuanChoicePlacement(['spot-1','spot-2','spot-3','spot-4','spot-5'].map(id=>({id})),spotlight,Date.parse('2026-09-18'));
    expect(planned.ordinary.map(item=>item.id)).toEqual(['spot-1','spot-3','spot-4','spot-5']);
    expect(planned.insertionIndex).toBe(3);
  });
  it('does not place expired or absent promotions', () => {
    const items=[{id:'spot-2'}];
    expect(planJuanChoicePlacement(items,spotlight,Date.parse(spotlight.expires_at)).spotlight).toBeNull();
    expect(planJuanChoicePlacement(items,null).ordinary).toBe(items);
  });
});
