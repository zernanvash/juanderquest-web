// UI navigation only; API authorization remains server-side. Email/Google
// travelers are normal `user` roles; legacy `usr-*` identities stay supported.
// Admin identities remain in the dashboard even if they have a wallet prefix.
export const isTravelerSession = (user: { seedId: string; role?: string } | null | undefined, allowAdminInTravelerApp = false): boolean =>
  Boolean(user && (user.role === 'admin' ? allowAdminInTravelerApp : (
    user.seedId.startsWith('wallet:') ||
    user.seedId.startsWith('guest:') ||
    user.seedId.startsWith('usr-') ||
    user.role === 'user'
  )));
