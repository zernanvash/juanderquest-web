import { afterEach, describe, expect, it, vi } from 'vitest';
import { appOnlyFeatureFor, appOnlyRedirects } from '@/config/appOnlyRoutes';
import { loadSukiProgram, safeLogoUrl } from './loader';

describe('Plan 107 Suki landing loader', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the program from the public API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
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
            status: 'active',
            merchant: { id: 'm1', name: 'Aling Nena Cafe', municipality: 'Dagupan City', logo_url: null },
          },
          my_card: null,
          rewards: [],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await loadSukiProgram('suki_abc');
    expect(result.kind).toBe('found');
    expect(result.kind === 'found' && result.program.merchant.name).toBe('Aling Nena Cafe');
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/suki\/programs\/suki_abc$/);
  });

  it('tells "coming soon" (503 SUKI_DISABLED) apart from a missing card', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ success: false, error: { code: 'SUKI_DISABLED', message: 'Suki Cards are coming soon.' } }),
      }),
    );
    expect(await loadSukiProgram('suki_off')).toEqual({ kind: 'disabled' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ success: false, error: { code: 'SUKI_NOT_FOUND' } }) }),
    );
    expect(await loadSukiProgram('suki_missing')).toEqual({ kind: 'missing' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => { throw new Error('html'); } }));
    expect(await loadSukiProgram('suki_html')).toEqual({ kind: 'missing' });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await loadSukiProgram('suki_down')).toEqual({ kind: 'missing' });
    expect(await loadSukiProgram('../etc')).toEqual({ kind: 'missing' });
  });

  it('shows only http(s) logos', () => {
    expect(safeLogoUrl('https://cdn.example/logo.png')).toBe('https://cdn.example/logo.png');
    expect(safeLogoUrl('javascript:alert(1)')).toBeNull();
    expect(safeLogoUrl(null)).toBeNull();
  });

  it('keeps /suki/* on the web (not an app-only redirect)', () => {
    expect(appOnlyFeatureFor('/suki/suki_abc')).toBeNull();
    expect(appOnlyRedirects().some((r) => r.source.startsWith('/suki'))).toBe(false);
  });
});
