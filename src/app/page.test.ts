import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ headers: vi.fn(), redirect: vi.fn() }));

vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import RootPage from './page';

describe('root entry routing', () => {
  beforeEach(() => {
    mocks.headers.mockReset();
    mocks.redirect.mockReset();
  });

  it('routes Android visitors to the app download page', async () => {
    mocks.headers.mockResolvedValue({ get: () => 'Mozilla/5.0 (Linux; Android 14) Mobile' });

    await RootPage();

    expect(mocks.redirect).toHaveBeenCalledWith('/download');
  });

  it('keeps non-Android visitors on the normal app entry', async () => {
    mocks.headers.mockResolvedValue({ get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });

    await RootPage();

    expect(mocks.redirect).toHaveBeenCalledWith('/dashboard');
  });
});
