// UI navigation only; API authorization remains server-side. A verified email
// traveler is a normal `user` role and must be able to use traveler routes too.
// Keep QA/admin identities out of the traveler shell.
export const isTravelerSession = (user: { seedId: string; role?: string } | null | undefined): boolean =>
  Boolean(user && (
    user.seedId.startsWith('wallet:') ||
    user.seedId.startsWith('guest:') ||
    user.role === 'user'
  ));
