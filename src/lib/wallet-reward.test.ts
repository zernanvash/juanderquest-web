import { describe, expect, it } from 'vitest';
import { walletRewardFromBalanceChange } from './wallet-reward';

describe('wallet reward event payload', () => {
  it('reports only a positive balance increase', () => {
    expect(walletRewardFromBalanceChange(100, 300)).toEqual({ diff: 200, total: 300 });
  });

  it('does not celebrate the initial balance, a decrease, or an unchanged balance', () => {
    expect(walletRewardFromBalanceChange(null, 100)).toBeNull();
    expect(walletRewardFromBalanceChange(300, 100)).toBeNull();
    expect(walletRewardFromBalanceChange(100, 100)).toBeNull();
  });

  it('rejects non-finite balance values', () => {
    expect(walletRewardFromBalanceChange(Number.NaN, 100)).toBeNull();
    expect(walletRewardFromBalanceChange(100, Number.POSITIVE_INFINITY)).toBeNull();
  });
});
