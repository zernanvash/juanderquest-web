import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSukiProgram } from './loader';

describe('Plan 107 Suki landing loader', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the program from the public API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          program: {
            id: 'suki_abc',
            title: 'Kape Suki',
            reward_text: 'Free iced coffee',
            reward_tag: 'FREE',
            visits_required: 10,
            mode: 'standee',
            merchant: { id: 'm1', name: 'Aling Nena Cafe', municipality: 'Dagupan City', logo_url: null },
          },
          my_card: null,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const program = await loadSukiProgram('suki_abc');
    expect(program?.merchant.name).toBe('Aling Nena Cafe');
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/suki\/programs\/suki_abc$/);
  });

  it('returns null for a missing card, a server error or a bad id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    expect(await loadSukiProgram('suki_missing')).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await loadSukiProgram('suki_down')).toBeNull();
    expect(await loadSukiProgram('../etc')).toBeNull();
  });
});
