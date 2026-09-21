import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicJuanChoiceMetadata } from './juanchoice-metadata';

const campaignId = 'babb8d2c-91a9-400d-a8d4-0b45f42615c0';
const candidateId = '8167ef1f-0e55-47e4-93d4-f7cc358313ab';

afterEach(() => vi.unstubAllGlobals());

describe('public JuanChoice share metadata', () => {
  it('never fetches malformed identifiers', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const result = await publicJuanChoiceMetadata('not-a-campaign');
    expect(result.robots).toEqual({ index: false, follow: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps unavailable rounds out of search and generic in shares', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const result = await publicJuanChoiceMetadata(campaignId);
    expect(result.robots).toEqual({ index: false, follow: false });
    expect(result.openGraph).toBeUndefined();
  });

  it('uses only public campaign and candidate names in social previews', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {
      campaign: { id: campaignId, theme: 'Hidden Pangasinan Gems' },
      standings: [{ candidate_id: candidateId, spot_name: 'Quiet Cove' }], result: null,
    } }) });
    vi.stubGlobal('fetch', fetchMock);
    const result = await publicJuanChoiceMetadata(campaignId, candidateId);
    expect(result.title).toContain('Quiet Cove');
    expect(result.openGraph?.title).toContain('Hidden Pangasinan Gems');
    expect(result.robots).toBeUndefined();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });
});
