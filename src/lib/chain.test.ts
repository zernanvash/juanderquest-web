import { describe, expect, it, vi } from 'vitest';
import { explorerAddress, formatTestNative, isJdqChain, JDQ_CHAIN, JDQ_CHAIN_NETWORK, switchToJdqChain } from './chain';

describe('JuanDerQuest test network (Polygon Amoy)', () => {
  it('is Polygon Amoy, chain 80002', () => {
    expect(JDQ_CHAIN.id).toBe(80002);
    expect(JDQ_CHAIN.idHex).toBe('0x13882');
    expect(Number.parseInt(JDQ_CHAIN.idHex, 16)).toBe(JDQ_CHAIN.id);
    expect(JDQ_CHAIN_NETWORK.nativeCurrency.symbol).toBe('POL');
  });

  it('recognizes only Amoy', () => {
    expect(isJdqChain('0x13882')).toBe(true);
    expect(isJdqChain('0x13882'.toUpperCase().replace('0X', '0x'))).toBe(true);
    expect(isJdqChain('0x14a34')).toBe(false); // Base Sepolia (previous test chain)
    expect(isJdqChain('0x89')).toBe(false); // Polygon mainnet
    expect(isJdqChain(80002)).toBe(false);
  });

  it('switches to an existing network and verifies the result', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => method === 'eth_chainId' ? JDQ_CHAIN.idHex : null);
    await switchToJdqChain({ request });
    expect(request).toHaveBeenCalledWith({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x13882' }] });
  });

  it('adds the network only when the wallet reports 4902', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'wallet_switchEthereumChain' && request.mock.calls.filter(([arg]) => arg.method === method).length === 1) {
        throw { code: 4902 };
      }
      return method === 'eth_chainId' ? JDQ_CHAIN.idHex : null;
    });
    await switchToJdqChain({ request });
    expect(request).toHaveBeenCalledWith({ method: 'wallet_addEthereumChain', params: [JDQ_CHAIN_NETWORK] });
  });

  it('does not suppress a rejected wallet request', async () => {
    const request = vi.fn(async () => { throw { code: 4001 }; });
    await expect(switchToJdqChain({ request })).rejects.toMatchObject({ code: 4001 });
  });

  it('reports a wallet that did not actually switch', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => method === 'eth_chainId' ? '0x1' : null);
    await expect(switchToJdqChain({ request })).rejects.toThrow('Wallet did not switch to Polygon Amoy.');
  });

  it('formats balances without floating-point conversion', () => {
    expect(formatTestNative('0xde0b6b3a7640000')).toBe('1.0000');
    expect(formatTestNative('0x0')).toBe('0.0000');
    expect(() => formatTestNative('nope')).toThrow();
  });

  it('links contracts to the Amoy explorer', () => {
    expect(explorerAddress(JDQ_CHAIN.contracts.badge)).toBe('https://amoy.polygonscan.com/address/0xC9b1Cc4f980edf71daCa182944ECb67E494B3E9b');
  });
});
