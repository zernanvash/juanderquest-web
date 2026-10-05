import { describe, expect, it, vi } from 'vitest';
import { BASE_SEPOLIA_CHAIN_ID, formatTestEth, isBaseSepolia, switchToBaseSepolia } from './base-sepolia';

describe('Base Sepolia readiness', () => {
  it('recognizes only the Base Sepolia chain', () => {
    expect(isBaseSepolia(BASE_SEPOLIA_CHAIN_ID)).toBe(true);
    expect(isBaseSepolia('0x2105')).toBe(false);
    expect(isBaseSepolia('0xaa36a7')).toBe(false);
  });

  it('switches to an existing network and verifies the result', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => method === 'eth_chainId' ? BASE_SEPOLIA_CHAIN_ID : null);
    await switchToBaseSepolia({ request });
    expect(request).toHaveBeenCalledWith({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }] });
  });

  it('adds a missing network only when the wallet reports 4902', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'wallet_switchEthereumChain' && request.mock.calls.filter(([arg]) => arg.method === method).length === 1) {
        throw { code: 4902 };
      }
      return method === 'eth_chainId' ? BASE_SEPOLIA_CHAIN_ID : null;
    });
    await switchToBaseSepolia({ request });
    expect(request.mock.calls.some(([arg]) => arg.method === 'wallet_addEthereumChain')).toBe(true);
  });

  it('does not suppress a rejected wallet request', async () => {
    const request = vi.fn(async () => { throw { code: 4001 }; });
    await expect(switchToBaseSepolia({ request })).rejects.toMatchObject({ code: 4001 });
  });

  it('formats test ETH without floating-point conversion', () => {
    expect(formatTestEth('0xde0b6b3a7640000')).toBe('1.0000');
    expect(formatTestEth('0x0')).toBe('0.0000');
  });
});
