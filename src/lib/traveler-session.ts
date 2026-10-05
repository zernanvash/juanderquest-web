// UI navigation only; API authorization remains server-side.
export const isTravelerSession = (user: { seedId: string } | null | undefined): boolean =>
  Boolean(user && (user.seedId.startsWith('wallet:') || user.seedId.startsWith('guest:')));
