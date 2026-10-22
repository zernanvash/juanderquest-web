/**
 * The JuanDerQuest test network (Plan 49): Polygon Amoy. Test-only tokens and
 * badges; nothing here has real-money value.
 */
export const JDQ_CHAIN = {
  id: 80002,
  idHex: '0x13882',
  name: 'Polygon Amoy',
  currency: 'POL',
  explorer: 'https://amoy.polygonscan.com',
  contracts: {
    token: '0x575c4B5b2E046AcCb003ba852dF185126d6197b9',
    distributor: '0x3542402bcB93e142437779EEEa9e16D7163854ce',
    badge: '0xC9b1Cc4f980edf71daCa182944ECb67E494B3E9b',
  },
} as const;

/** `wallet_addEthereumChain` parameters (EIP-3085). */
export const JDQ_CHAIN_NETWORK = {
  chainId: JDQ_CHAIN.idHex,
  chainName: JDQ_CHAIN.name,
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: ['https://polygon-amoy-bor-rpc.publicnode.com', 'https://polygon-amoy.drpc.org'],
  blockExplorerUrls: [JDQ_CHAIN.explorer],
};

export type EvmProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function isJdqChain(chainId: unknown): boolean {
  return typeof chainId === 'string' && chainId.toLowerCase() === JDQ_CHAIN.idHex;
}

export async function switchToJdqChain(provider: EvmProvider): Promise<void> {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: JDQ_CHAIN.idHex }] });
  } catch (error) {
    if ((error as { code?: number })?.code !== 4902) throw error;
    await provider.request({ method: 'wallet_addEthereumChain', params: [JDQ_CHAIN_NETWORK] });
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: JDQ_CHAIN.idHex }] });
  }
  const actual = await provider.request({ method: 'eth_chainId' });
  if (!isJdqChain(actual)) throw new Error(`Wallet did not switch to ${JDQ_CHAIN.name}.`);
}

/** Formats a hex wei balance with 4 decimals, without floating-point conversion. */
export function formatTestNative(hexWei: unknown): string {
  if (typeof hexWei !== 'string' || !/^0x[0-9a-f]+$/i.test(hexWei)) throw new Error('Invalid wallet balance response.');
  const wei = BigInt(hexWei);
  const unit = BigInt(10) ** BigInt(18);
  const fraction = ((wei % unit) / (BigInt(10) ** BigInt(14))).toString().padStart(4, '0');
  return `${wei / unit}.${fraction}`;
}

export const explorerAddress = (address: string) => `${JDQ_CHAIN.explorer}/address/${address}`;
