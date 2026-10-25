// UI navigation only; API authorization remains server-side. Email and Google
// accounts are issued `usr-*` identities; admin roles must remain in the dashboard.
export const isTravelerSession = (user: { seedId: string; role?: string } | null | undefined): boolean =>
  Boolean(user && user.role !== 'admin' && (
    user.seedId.startsWith('wallet:') || user.seedId.startsWith('guest:') || user.seedId.startsWith('usr-')
  ));
