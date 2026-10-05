export const BASE_SEPOLIA_CHAIN_ID = '0x14a34';
export const BASE_SEPOLIA_NETWORK = {
  chainId: BASE_SEPOLIA_CHAIN_ID,
  chainName: 'Base Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia-explorer.base.org'],
};

export type EvmProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function isBaseSepolia(chainId: unknown): boolean {
  return typeof chainId === 'string' && chainId.toLowerCase() === BASE_SEPOLIA_CHAIN_ID;
}

export async function switchToBaseSepolia(provider: EvmProvider): Promise<void> {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }] });
  } catch (error) {
    if ((error as { code?: number })?.code !== 4902) throw error;
    await provider.request({ method: 'wallet_addEthereumChain', params: [BASE_SEPOLIA_NETWORK] });
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }] });
  }
  const actual = await provider.request({ method: 'eth_chainId' });
  if (!isBaseSepolia(actual)) throw new Error('Wallet did not switch to Base Sepolia.');
}

export function formatTestEth(hexWei: unknown): string {
  if (typeof hexWei !== 'string' || !/^0x[0-9a-f]+$/i.test(hexWei)) throw new Error('Invalid wallet balance response.');
  const wei = BigInt(hexWei);
  const unit = BigInt(10) ** BigInt(18);
  const fraction = ((wei % unit) / (BigInt(10) ** BigInt(14))).toString().padStart(4, '0');
  return `${wei / unit}.${fraction}`;
}
