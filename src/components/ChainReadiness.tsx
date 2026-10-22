'use client';

import { useCallback, useEffect, useState } from 'react';
import { explorerAddress, formatTestNative, isJdqChain, JDQ_CHAIN, switchToJdqChain, type EvmProvider } from '@/lib/chain';

type NetworkState = {
  chainId: string | null;
  address: string | null;
  blockNumber: number | null;
  testBalance: string | null;
};

export function ChainReadiness({ signedInSeedId }: { signedInSeedId?: string }) {
  const [mounted, setMounted] = useState(false);
  const [provider, setProvider] = useState<EvmProvider | null>(null);
  const [state, setState] = useState<NetworkState>({ chainId: null, address: null, blockNumber: null, testBalance: null });
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
      if (!isJdqChain(chainId)) {
        setState({ chainId: String(chainId), address, blockNumber: null, testBalance: null });
        return;
      }
      const [blockHex, balanceHex] = await Promise.all([
        provider.request({ method: 'eth_blockNumber' }),
        address ? provider.request({ method: 'eth_getBalance', params: [address, 'latest'] }) : Promise.resolve(null),
      ]);
      setState({
        chainId: String(chainId), address,
        blockNumber: typeof blockHex === 'string' && /^0x[0-9a-f]+$/i.test(blockHex) ? Number.parseInt(blockHex, 16) : null,
        testBalance: balanceHex === null ? null : formatTestNative(balanceHex),
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
      await switchToJdqChain(provider);
      await refresh();
    } catch (reason) {
      setError((reason as { code?: number })?.code === 4001 ? 'Network change was cancelled in your wallet.' : `Could not switch to ${JDQ_CHAIN.name}. Check your wallet network settings.`);
    } finally {
      setBusy(false);
    }
  };

  const expectedAddress = signedInSeedId?.startsWith('wallet:') ? signedInSeedId.slice(7).toLowerCase() : null;
  const accountMismatch = Boolean(expectedAddress && state.address && expectedAddress !== state.address.toLowerCase());

  return (
    <section className="theme-card p-5 space-y-3" aria-labelledby="jdq-chain-heading">
      <div>
        <h2 id="jdq-chain-heading" className="text-base font-black text-[var(--color-brand-brown)]">{JDQ_CHAIN.name} test network</h2>
        <p className="text-xs text-[var(--color-text-muted)]">Test network — no real money. JuanDerQuest's test token and badge contracts live here; your points, votes and rewards in the app stay off-chain.</p>
      </div>
      {!mounted ? (
        <p role="status" className="text-sm">Checking browser wallet…</p>
      ) : !provider ? (
        <p role="status" className="text-sm">No browser wallet detected. Install or enable MetaMask (or another EVM wallet) to connect to the test network.</p>
      ) : (
        <>
          <p role="status" className="text-sm font-semibold text-[var(--color-text-primary)]">
            {isJdqChain(state.chainId) ? `Connected to ${JDQ_CHAIN.name} (chain ${JDQ_CHAIN.id})` : `Wallet is not on ${JDQ_CHAIN.name}`}
            {state.blockNumber !== null ? ` · block ${state.blockNumber}` : ''}
          </p>
          {state.address && <p className="text-xs break-all">Browser wallet: {state.address}</p>}
          {accountMismatch && <p className="text-xs text-amber-900" role="alert">This browser wallet differs from your signed-in JuanDerQuest account. Switch accounts and sign in again before testing identity-linked features.</p>}
          {state.testBalance !== null && <p className="text-xs">Test {JDQ_CHAIN.currency}: {state.testBalance} {JDQ_CHAIN.currency}. Test-network gas only — no real-money value.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleSwitch} disabled={busy} className="min-h-11 rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60 cursor-pointer">
              {busy ? 'Checking wallet…' : `Switch to ${JDQ_CHAIN.name}`}
            </button>
            <button type="button" onClick={() => void refresh()} className="min-h-11 rounded-xl border border-[var(--color-border-default)] px-4 py-2 text-xs font-bold cursor-pointer">Refresh status</button>
          </div>
          <ul className="text-xs space-y-1" aria-label="Test contracts">
            <li>Test token (tJDQ): <a className="underline break-all" href={explorerAddress(JDQ_CHAIN.contracts.token)} target="_blank" rel="noreferrer">{JDQ_CHAIN.contracts.token}</a></li>
            <li>Soulbound badge (tJDB): <a className="underline break-all" href={explorerAddress(JDQ_CHAIN.contracts.badge)} target="_blank" rel="noreferrer">{JDQ_CHAIN.contracts.badge}</a></li>
          </ul>
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </>
      )}
    </section>
  );
}
