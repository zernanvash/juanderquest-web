import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnChainBadges, type OnChainBadge } from './OnChainBadges';

const get = vi.fn();
const post = vi.fn();
const del = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), delete: (...a: unknown[]) => del(...a) } }));

const WALLET = '0xfadd476c10b6a93bc26a226f9b7d8e8c556f9671';
const badge = (over: Partial<OnChainBadge>): OnChainBadge => ({
  awardId: 'a1', title: 'First Footstep', description: 'd', track: 'explorer', awardedAt: '2026-10-22T08:00:00Z',
  state: 'on_chain', tokenId: '1', txUrl: 'https://amoy.polygonscan.com/tx/0x1', tokenUrl: 'https://amoy.polygonscan.com/nft/0xc/1', ...over,
});
const respond = (walletAddress: string | null, badges: OnChainBadge[], mintingEnabled = true) =>
  get.mockResolvedValue({ data: { success: true, data: { walletAddress, mintingEnabled, badges } } });

describe('OnChainBadges', () => {
  beforeEach(() => { get.mockReset(); post.mockReset(); del.mockReset(); });
  afterEach(() => { delete (window as { ethereum?: unknown }).ethereum; });

  it('lists badges with their on-chain state and a Polygonscan link', async () => {
    respond(WALLET, [badge({}), badge({ awardId: 'a2', title: 'Pangasinan Pioneer', state: 'minting', tokenUrl: null }),
      badge({ awardId: 'a3', title: 'QA', state: 'test_only' })]);
    render(<OnChainBadges />);
    expect(await screen.findByText('First Footstep')).toBeInTheDocument();
    expect(screen.getByText('On-chain')).toBeInTheDocument();
    expect(screen.getByText('Minting…')).toBeInTheDocument();
    expect(screen.queryByText('QA')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 2 on-chain')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View on Polygonscan/ })).toHaveAttribute('href', 'https://amoy.polygonscan.com/nft/0xc/1');
    expect(screen.getByRole('button', { name: /Unlink/ })).toBeInTheDocument();
  });

  it('links a wallet with a signed challenge and reloads', async () => {
    respond(null, [badge({ state: 'pending_wallet', tokenUrl: null, txUrl: null })]);
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_requestAccounts') return [WALLET];
      if (method === 'personal_sign') return '0xsig';
      return null;
    });
    (window as { ethereum?: unknown }).ethereum = { request };
    post.mockImplementation(async (path: string) => path === '/auth/wallet/challenge'
      ? { data: { data: { message: 'Sign in to JuanDerQuest' } } } : { data: { success: true } });
    const changed = vi.fn();
    render(<OnChainBadges onWalletChanged={changed} />);
    expect(await screen.findByText('Link a wallet', { selector: 'span' })).toBeInTheDocument();
    respond(WALLET, [badge({ state: 'queued', tokenUrl: null, txUrl: null })]);
    fireEvent.click(screen.getByRole('button', { name: /Link wallet/ }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/wallet/bind', { address: WALLET, signature: '0xsig' }));
    expect(request).toHaveBeenCalledWith({ method: 'personal_sign', params: ['Sign in to JuanDerQuest', WALLET] });
    expect(await screen.findByText(/Wallet linked/)).toBeInTheDocument();
    expect(changed).toHaveBeenCalled();
  });

  it('explains a cancelled signature and a missing wallet', async () => {
    respond(null, []);
    render(<OnChainBadges />);
    fireEvent.click(await screen.findByRole('button', { name: /Link wallet/ }));
    expect(await screen.findByText(/No browser wallet found/)).toBeInTheDocument();
    (window as { ethereum?: unknown }).ethereum = { request: vi.fn(async () => { throw { code: 4001 }; }) };
    fireEvent.click(screen.getByRole('button', { name: /Link wallet/ }));
    expect(await screen.findByText(/cancelled in your wallet/)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('shows the server error when the wallet belongs to another account', async () => {
    respond(null, []);
    (window as { ethereum?: unknown }).ethereum = { request: vi.fn(async ({ method }: { method: string }) => method === 'eth_requestAccounts' ? [WALLET] : '0xsig') };
    post.mockImplementation(async (path: string) => {
      if (path === '/auth/wallet/challenge') return { data: { data: { message: 'm' } } };
      throw { response: { data: { error: { message: 'This wallet address is already linked to another JuanDerQuest traveler account.' } } } };
    });
    render(<OnChainBadges />);
    fireEvent.click(await screen.findByRole('button', { name: /Link wallet/ }));
    expect(await screen.findByText(/already linked to another/)).toBeInTheDocument();
  });
});
