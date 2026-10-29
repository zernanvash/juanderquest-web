import { api } from './api';

// Plan 67: one place that asks the browser wallet for an address and a signed
// JuanDerQuest challenge. Used by /login (wallet sign-in) and /wallet/connect (bind).

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export class WalletSignError extends Error {}

const rejected = (err: unknown) => {
  const e = err as { code?: number; message?: string } | null;
  return e?.code === 4001 || Boolean(e?.message?.includes('User rejected'));
};

export async function signWalletChallenge(): Promise<{ address: string; signature: string }> {
  const provider = typeof window === 'undefined' ? undefined : window.ethereum;
  if (!provider) throw new WalletSignError('No browser wallet (MetaMask, Coinbase, Brave, etc.) was found.');
  let address: string | undefined;
  try {
    address = ((await provider.request({ method: 'eth_requestAccounts' })) as string[])[0];
  } catch (err) {
    throw new WalletSignError(rejected(err) ? 'Wallet connection was rejected.' : 'The wallet did not share an address.');
  }
  if (!address) throw new WalletSignError('No wallet account was selected.');

  const challenge = await api.post('/auth/wallet/challenge', { address });
  const message = challenge.data?.data?.message as string | undefined;
  if (!challenge.data?.success || !message) throw new WalletSignError('Could not get a sign-in challenge from the server.');

  try {
    return { address, signature: (await provider.request({ method: 'personal_sign', params: [message, address] })) as string };
  } catch (err) {
    if (rejected(err)) throw new WalletSignError('The signature request was rejected in your wallet.');
    // Some wallets only accept a hex-encoded UTF-8 message for personal_sign.
    const hex = '0x' + Array.from(new TextEncoder().encode(message)).map((b) => b.toString(16).padStart(2, '0')).join('');
    try {
      return { address, signature: (await provider.request({ method: 'personal_sign', params: [hex, address] })) as string };
    } catch (retryErr) {
      throw new WalletSignError(rejected(retryErr) ? 'The signature request was rejected in your wallet.' : 'The wallet could not sign the request.');
    }
  }
}

export const shortAddress = (address: string) =>
  address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
