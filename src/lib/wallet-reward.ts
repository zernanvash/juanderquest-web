export interface WalletRewardToast {
  diff: number;
  total: number;
}

export function walletRewardFromBalanceChange(previous: number | null, next: number): WalletRewardToast | null {
  if (previous === null || !Number.isFinite(previous) || !Number.isFinite(next) || next <= previous) return null;
  return { diff: next - previous, total: next };
}
