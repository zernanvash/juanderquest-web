// UI navigation only; API authorization remains server-side. Email/Google
// travelers are normal `user` roles; legacy `usr-*` identities stay supported.
// Admins who sign in with a wallet stay in the traveler app (owner, 2026-10-27);
// other admin identities need the explicit app view.
export const isTravelerSession = (user: { seedId: string; role?: string } | null | undefined, allowAdminInTravelerApp = false): boolean =>
  Boolean(user && (user.role === 'admin' ? allowAdminInTravelerApp || user.seedId.startsWith('wallet:') : (
    user.seedId.startsWith('wallet:') ||
    user.seedId.startsWith('guest:') ||
    user.seedId.startsWith('usr-') ||
    user.role === 'user'
  )));

// Plan 67: a wallet is needed only for shop purchases and on-chain actions,
// never to sign in or play.
export const hasConnectedWallet = (user: { walletAddress?: string | null } | null | undefined): boolean =>
  Boolean(user && typeof user.walletAddress === 'string' && user.walletAddress.trim().length > 0);
