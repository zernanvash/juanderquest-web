'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, ExternalLink, Link2, Loader2, Unlink } from 'lucide-react';
import { api } from '@/lib/api';
import { JDQ_CHAIN, type EvmProvider } from '@/lib/chain';
import { useGSAP, prefersReducedMotion } from '@/lib/animations/gsap';
import gsap from 'gsap';
import { triggerCelebration } from './CelebrationEffects';

export type OnChainBadgeState = 'test_only' | 'revoked' | 'pending_wallet' | 'queued' | 'minting' | 'on_chain' | 'failed';

export interface OnChainBadge {
  awardId: string;
  title: string;
  description: string;
  track: string;
  awardedAt: string;
  state: OnChainBadgeState;
  tokenId: string | null;
  txUrl: string | null;
  tokenUrl: string | null;
}

interface BadgesResponse {
  walletAddress: string | null;
  mintingEnabled: boolean;
  badges: OnChainBadge[];
}

const STATE_LABEL: Record<OnChainBadgeState, { text: string; tone: string }> = {
  on_chain: { text: 'On-chain', tone: 'bg-emerald-100 text-emerald-800' },
  minting: { text: 'Minting…', tone: 'bg-amber-100 text-amber-900' },
  queued: { text: 'Queued', tone: 'bg-amber-50 text-amber-900' },
  pending_wallet: { text: 'Link a wallet', tone: 'bg-stone-100 text-stone-700' },
  failed: { text: 'Delayed', tone: 'bg-red-50 text-red-700' },
  revoked: { text: 'Revoked', tone: 'bg-red-50 text-red-700' },
  test_only: { text: 'Test only', tone: 'bg-stone-100 text-stone-600' },
};

const isHexWallet = (value: string | null): value is string => Boolean(value && /^0x[0-9a-f]{40}$/i.test(value));
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const apiMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data;
  return data?.error?.message ?? fallback;
};

// Session storage key to track badges that have already completed their minting ceremony
const CELEBRATED_STORAGE_KEY = 'jdq_celebrated_badges_v1';

function getCelebratedBadgeIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(CELEBRATED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function markBadgeAsCelebrated(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getCelebratedBadgeIds();
    current.add(id);
    sessionStorage.setItem(CELEBRATED_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // sessionStorage blocked or unavailable
  }
}

/** Plan 50 & Plan 53: the traveler's achievements as soulbound badges on the test chain with GSAP minting ceremony */
export function OnChainBadges({ onWalletChanged }: { onWalletChanged?: () => void }) {
  const [data, setData] = useState<BadgesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // References for badge state tracking and ceremony animation
  const containerRef = useRef<HTMLElement | null>(null);
  const prevBadgesDataRef = useRef<OnChainBadge[] | null>(null);
  const initialLoadDoneRef = useRef(false);
  const [celebratingBadgeId, setCelebratingBadgeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/me/chain/badges');
      const nextData: BadgesResponse | null = res.data?.data ?? null;
      setData(nextData);
      setError(null);
    } catch (err) {
      setError(apiMessage(err, 'On-chain badges could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Check for badge state changes whenever data updates
  useEffect(() => {
    if (!data?.badges) return;
    const celebrated = getCelebratedBadgeIds();

    if (initialLoadDoneRef.current) {
      const prevList = prevBadgesDataRef.current ?? [];
      const prevMap = new Map(prevList.map((b) => [b.awardId, b.state]));

      for (const b of data.badges) {
        const prevState = prevMap.get(b.awardId);
        const isTransition =
          (prevState === 'queued' || prevState === 'minting') &&
          b.state === 'on_chain';

        if (isTransition && !celebrated.has(b.awardId)) {
          markBadgeAsCelebrated(b.awardId);
          setCelebratingBadgeId(b.awardId);
          break;
        }
      }
    } else {
      // First data load: mark all existing on_chain badges as already celebrated
      for (const b of data.badges) {
        if (b.state === 'on_chain') {
          markBadgeAsCelebrated(b.awardId);
        }
      }
      initialLoadDoneRef.current = true;
    }

    prevBadgesDataRef.current = data.badges;
  }, [data]);

  // Expose a custom event hook for manual testing in non-production environments
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const handleTrigger = (e: Event) => {
      const badgeId = (e as CustomEvent<{ badgeId?: string }>).detail?.badgeId;
      if (badgeId) {
        markBadgeAsCelebrated(badgeId);
        setCelebratingBadgeId(badgeId);
      }
    };
    window.addEventListener('jdq:celebrate-badge', handleTrigger);
    return () => window.removeEventListener('jdq:celebrate-badge', handleTrigger);
  }, []);

  // Refresh while something is being minted.
  const active = data?.badges.some((b) => b.state === 'queued' || b.state === 'minting');
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => { void load(); }, 20_000);
    return () => clearInterval(t);
  }, [active, load]);

  // GSAP Badge Minting Ceremony
  useGSAP(() => {
    if (!celebratingBadgeId || !containerRef.current) return;
    const card = containerRef.current.querySelector(`[data-badge-id="${celebratingBadgeId}"]`);
    if (!card) return;

    const aura = card.querySelector('.ceremony-aura');
    const shine = card.querySelector('.ceremony-shine');

    const isReduced = prefersReducedMotion();

    if (isReduced) {
      // Opacity-only crossfade <= 150ms for accessibility
      gsap.fromTo(
        card,
        { opacity: 0.3 },
        {
          opacity: 1,
          duration: 0.15,
          ease: 'power2.out',
          onComplete: () => setCelebratingBadgeId(null),
        }
      );
      return;
    }

    // Full 3D coin flip + aura pulse + shine sweep (Total duration <= 1.2s, skippable)
    const tl = gsap.timeline({
      onComplete: () => {
        setCelebratingBadgeId(null);
      },
    });

    // 1. Coin Flip & Lift (0.6s)
    tl.fromTo(
      card,
      {
        rotationY: -180,
        scale: 0.9,
        transformPerspective: 800,
        transformOrigin: 'center center',
      },
      {
        rotationY: 0,
        scale: 1,
        duration: 0.6,
        ease: 'back.out(1.6)',
      }
    );

    // 2. Aura Pulse
    if (aura) {
      tl.fromTo(
        aura,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1.15,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        },
        '-=0.4'
      );
    }

    // 3. Shine Sweep
    if (shine) {
      tl.fromTo(
        shine,
        { xPercent: -120, opacity: 0.8 },
        {
          xPercent: 120,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.inOut',
        },
        '-=0.3'
      );
    }

    // Optional trigger celebration particles if sound/effects are permitted
    triggerCelebration({ type: 'stars', particleCount: 16 });

    // Allow user to skip ceremony by clicking/tapping the card
    const handleSkip = () => {
      tl.progress(1);
    };
    card.addEventListener('click', handleSkip, { once: true });

    return () => {
      card.removeEventListener('click', handleSkip);
      tl.kill();
    };
  }, { dependencies: [celebratingBadgeId], scope: containerRef });

  const linkWallet = async () => {
    const provider = (window as unknown as { ethereum?: EvmProvider }).ethereum;
    if (!provider) { setError('No browser wallet found. Install or unlock MetaMask, or link a wallet from the mobile app.'); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null;
      if (!address) throw new Error('No wallet account selected');
      const challenge = await api.post('/auth/wallet/challenge', { address });
      const message = challenge.data?.data?.message;
      if (typeof message !== 'string') throw new Error('No challenge');
      const signature = await provider.request({ method: 'personal_sign', params: [message, address] });
      await api.post('/auth/wallet/bind', { address, signature });
      setNotice('Wallet linked. Your badges will be minted to it shortly.');
      onWalletChanged?.();
      await load();
    } catch (err) {
      const code = (err as { code?: number })?.code;
      setError(code === 4001 ? 'The request was cancelled in your wallet.' : apiMessage(err, 'The wallet could not be linked.'));
    } finally {
      setBusy(false);
    }
  };

  const unlinkWallet = async () => {
    if (!window.confirm('Unlink this wallet? Badges already minted stay in it; new badges wait until you link a wallet again.')) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.delete('/auth/wallet/unbind');
      setNotice('Wallet unlinked.');
      onWalletChanged?.();
      await load();
    } catch (err) {
      setError(apiMessage(err, 'The wallet could not be unlinked.'));
    } finally {
      setBusy(false);
    }
  };

  const wallet = data?.walletAddress ?? null;
  const badges = (data?.badges ?? []).filter((b) => b.state !== 'test_only');
  const onChain = badges.filter((b) => b.state === 'on_chain').length;

  return (
    <section ref={containerRef} className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-6 shadow-xs space-y-4" aria-labelledby="onchain-badges-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="onchain-badges-heading" className="text-sm sm:text-base font-black text-[var(--color-brand-brown)] flex items-center gap-1.5">
            <Award className="w-4 h-4" aria-hidden="true" /> On-chain badges
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Every achievement you earn is minted as a soulbound badge on {JDQ_CHAIN.name}. JuanDerQuest pays the gas; badges can&nbsp;not be sold or transferred. Test network — no real money.
          </p>
        </div>
        {badges.length > 0 && <span className="text-xs font-bold text-[var(--color-brand-primary)]">{onChain} / {badges.length} on-chain</span>}
      </div>

      <div className="rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs">
          <p className="font-bold text-[var(--color-text-primary)]">{isHexWallet(wallet) ? 'Linked wallet' : 'No wallet linked'}</p>
          <p className="text-[var(--color-text-muted)] break-all">
            {isHexWallet(wallet)
              ? <a className="underline" href={`${JDQ_CHAIN.explorer}/address/${wallet}`} target="_blank" rel="noreferrer">{short(wallet)}</a>
              : 'Link a wallet to receive your badges. Earned badges wait for you.'}
          </p>
        </div>
        {isHexWallet(wallet) ? (
          <button type="button" onClick={() => void unlinkWallet()} disabled={busy}
            className="min-h-11 rounded-xl border border-[var(--color-border-default)] px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
            <Unlink className="w-3.5 h-3.5" aria-hidden="true" /> Unlink
          </button>
        ) : (
          <button type="button" onClick={() => void linkWallet()} disabled={busy}
            className="min-h-11 rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Link2 className="w-3.5 h-3.5" aria-hidden="true" />} Link wallet
          </button>
        )}
      </div>

      {notice && <p role="status" className="text-xs font-bold text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {data && !data.mintingEnabled && badges.length > 0 && (
        <p className="text-xs text-amber-900">Minting is paused on this server; your badges are kept and will be minted later.</p>
      )}

      {loading ? (
        <p role="status" className="text-xs text-[var(--color-text-muted)]">Loading badges…</p>
      ) : badges.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">No achievements yet. Visit destinations and complete trails to earn your first badge.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Your badges">
          {badges.map((b) => {
            const label = STATE_LABEL[b.state];
            const isCelebrating = celebratingBadgeId === b.awardId;
            return (
              <li
                key={b.awardId}
                data-badge-id={b.awardId}
                className={`relative overflow-hidden rounded-xl border p-3 flex items-start justify-between gap-2 transition-colors ${
                  isCelebrating
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-md ring-2 ring-emerald-400/40'
                    : 'border-[var(--color-border-default)]'
                }`}
                style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
              >
                {/* Visual Ceremony FX Elements */}
                <span
                  className="ceremony-aura pointer-events-none absolute inset-0 rounded-xl bg-radial from-emerald-400/25 to-transparent opacity-0"
                  aria-hidden="true"
                />
                <span
                  className="ceremony-shine pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg] opacity-0"
                  aria-hidden="true"
                />

                <div className="min-w-0 z-10">
                  <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{b.title}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] capitalize">{b.track} · {new Date(b.awardedAt).toLocaleDateString()}</p>
                  {(b.tokenUrl || b.txUrl) && (
                    <a className="text-[11px] underline inline-flex items-center gap-1 mt-1" href={b.tokenUrl ?? b.txUrl!} target="_blank" rel="noreferrer">
                      {b.tokenUrl ? 'View on Polygonscan' : 'View transaction'} <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold z-10 ${label.tone}`}>{label.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
