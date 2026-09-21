import { describe, expect, it } from 'vitest';
import { effectiveJuanChoiceStatus, planJuanChoicePlacement, JuanChoiceCampaign, JuanChoiceSpotlight } from './juanchoice';

const campaign: JuanChoiceCampaign = {
  id: 'round', slug: 'round', region: 'Pangasinan', theme: 'Hidden gems',
  status: 'scheduled', opens_at: '2026-09-17T00:00:00.000Z', closes_at: '2026-09-24T00:00:00.000Z', policy_version: 'juanchoice-pilot-v1',
};

describe('JuanChoice display state', () => {
  it('uses an inclusive opening and exclusive closing boundary', () => {
    expect(effectiveJuanChoiceStatus(campaign, Date.parse(campaign.opens_at) - 1)).toBe('scheduled');
    expect(effectiveJuanChoiceStatus(campaign, Date.parse(campaign.opens_at))).toBe('voting');
    expect(effectiveJuanChoiceStatus(campaign, Date.parse(campaign.closes_at))).toBe('closed');
  });
  it('never reopens a cancelled or finalized round', () => {
    expect(effectiveJuanChoiceStatus({...campaign,status:'cancelled'},Date.parse(campaign.opens_at))).toBe('cancelled');
    expect(effectiveJuanChoiceStatus({...campaign,status:'finalized'},Date.parse(campaign.opens_at))).toBe('finalized');
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
