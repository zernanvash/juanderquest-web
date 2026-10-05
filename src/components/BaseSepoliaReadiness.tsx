'use client';

import { useCallback, useEffect, useState } from 'react';
import { BASE_SEPOLIA_CHAIN_ID, formatTestEth, isBaseSepolia, switchToBaseSepolia, type EvmProvider } from '@/lib/base-sepolia';

type NetworkState = {
  chainId: string | null;
  address: string | null;
  blockNumber: number | null;
  testEth: string | null;
};

export function BaseSepoliaReadiness({ signedInSeedId }: { signedInSeedId?: string }) {
  const [mounted, setMounted] = useState(false);
  const [provider, setProvider] = useState<EvmProvider | null>(null);
  const [state, setState] = useState<NetworkState>({ chainId: null, address: null, blockNumber: null, testEth: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProvider(window.ethereum ?? null);
    setMounted(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!provider) return;
    try {
      const [chainId, accounts] = await Promise.all([
        provider.request({ method: 'eth_chainId' }),
        provider.request({ method: 'eth_accounts' }),
      ]);
      const address = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null;
      if (!isBaseSepolia(chainId)) {
        setState({ chainId: String(chainId), address, blockNumber: null, testEth: null });
        return;
      }
      const [blockHex, balanceHex] = await Promise.all([
        provider.request({ method: 'eth_blockNumber' }),
        address ? provider.request({ method: 'eth_getBalance', params: [address, 'latest'] }) : Promise.resolve(null),
      ]);
      setState({
        chainId: String(chainId), address,
        blockNumber: typeof blockHex === 'string' && /^0x[0-9a-f]+$/i.test(blockHex) ? Number.parseInt(blockHex, 16) : null,
        testEth: balanceHex === null ? null : formatTestEth(balanceHex),
      });
      setError(null);
    } catch {
      setError('Could not read your wallet network. Unlock the wallet and retry.');
    }
  }, [provider]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleSwitch = async () => {
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      await switchToBaseSepolia(provider);
      await refresh();
    } catch (reason) {
      setError((reason as { code?: number })?.code === 4001 ? 'Network change was cancelled in your wallet.' : 'Could not switch to Base Sepolia. Check your wallet network settings.');
    } finally {
      setBusy(false);
    }
  };

  const expectedAddress = signedInSeedId?.startsWith('wallet:') ? signedInSeedId.slice(7).toLowerCase() : null;
  const accountMismatch = Boolean(expectedAddress && state.address && expectedAddress !== state.address.toLowerCase());

  return (
    <section className="theme-card p-5 space-y-3" aria-labelledby="base-sepolia-heading">
      <div>
        <h2 id="base-sepolia-heading" className="text-base font-black text-[var(--color-brand-brown)]">Base Sepolia testnet check</h2>
        <p className="text-xs text-[var(--color-text-muted)]">Optional wallet-network test only. JuanDerQuest points, votes, and badges are still off-chain; no JDQ contract is deployed.</p>
      </div>
      {!mounted ? (
        <p role="status" className="text-sm">Checking browser wallet…</p>
      ) : !provider ? (
        <p role="status" className="text-sm">No browser EVM wallet detected. Install or enable your wallet extension to test Base Sepolia.</p>
      ) : (
        <>
          <p role="status" className="text-sm font-semibold text-[var(--color-text-primary)]">
            {isBaseSepolia(state.chainId) ? `Connected to Base Sepolia (chain ${Number.parseInt(BASE_SEPOLIA_CHAIN_ID, 16)})` : 'Wallet is not on Base Sepolia'}
            {state.blockNumber !== null ? ` · block ${state.blockNumber}` : ''}
          </p>
          {state.address && <p className="text-xs break-all">Browser wallet: {state.address}</p>}
          {accountMismatch && <p className="text-xs text-amber-900" role="alert">This browser wallet differs from your signed-in JuanDerQuest account. Switch accounts and sign in again before testing identity-linked features.</p>}
          {state.testEth !== null && <p className="text-xs">Testnet ETH: {state.testEth} ETH. This is not JDQ or spendable mainnet ETH.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleSwitch} disabled={busy} className="min-h-11 rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60 cursor-pointer">
              {busy ? 'Checking wallet…' : 'Switch to Base Sepolia'}
            </button>
            <button type="button" onClick={() => void refresh()} className="min-h-11 rounded-xl border border-[var(--color-border-default)] px-4 py-2 text-xs font-bold cursor-pointer">Refresh status</button>
          </div>
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </>
      )}
    </section>
  );
}
