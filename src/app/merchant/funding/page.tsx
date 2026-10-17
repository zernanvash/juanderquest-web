'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, LoaderCircle, RefreshCw, Store } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import { fetchMerchantMe, type MerchantMeModel } from '@/lib/api';
import {
  buyMerchantPoints,
  counterSponsorship,
  getMerchantPoints,
  getMerchantSponsorships,
  getMerchantVouchers,
  respondToSponsorship,
  topUpSponsoredPlan,
  type MerchantPointSummary,
  type MerchantSponsorship,
  type MerchantVoucher,
} from '@/lib/merchant-funding-api';

const packages = [500, 1000, 2500, 5000] as const;
type CounterTerms = { points: string; voucherId: string; voucherQty: string; promo: boolean; message: string };

export default function MerchantFundingPage() {
  const { user, isLoading } = useAuth();
  const [identity, setIdentity] = useState<MerchantMeModel | null>(null);
  const [points, setPoints] = useState<MerchantPointSummary | null>(null);
  const [requests, setRequests] = useState<MerchantSponsorship[]>([]);
  const [vouchers, setVouchers] = useState<MerchantVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [counterValues, setCounterValues] = useState<Record<string, CounterTerms>>({});
  const [topUps, setTopUps] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await fetchMerchantMe();
      setIdentity(me);
      if (me.has_merchant) {
        const [balance, inbox, inventory] = await Promise.all([
          getMerchantPoints(),
          getMerchantSponsorships(),
          getMerchantVouchers(),
        ]);
        setPoints(balance);
        setRequests(inbox.items);
        setVouchers(inventory.items);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Merchant funding workspace is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) void load();
    else if (!isLoading) setLoading(false);
  }, [isLoading, user, load]);

  const action = async (key: string, fn: () => Promise<unknown>, message: string) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(message);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That merchant funding action failed.');
    } finally {
      setBusy('');
    }
  };

  if (isLoading || loading) return <Navigation><main className="mx-auto max-w-4xl px-4 py-20 text-center"><LoaderCircle className="mx-auto animate-spin" />Loading merchant funding…</main></Navigation>;
  if (!user) return <Navigation><main className="mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-bold">Sign in to continue</h1><Link href="/login" className="mt-4 inline-flex rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-white">Sign in</Link></main></Navigation>;
  if (!identity?.has_merchant) return <Navigation><main className="mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-bold">Merchant workspace required</h1><p className="mt-2 text-sm">Apply for merchant affiliation before sponsoring Eco-Quests.</p><Link href="/affiliate" className="mt-4 inline-flex rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-white">Apply</Link></main></Navigation>;

  const owner = identity.membership?.role === 'owner';
  const setCounter = (row: MerchantSponsorship, patch: Partial<CounterTerms>) => {
    const current = counterValues[row.id] ?? {
      points: String(row.points),
      voucherId: row.voucher_id ?? '',
      voucherQty: String(row.voucher_qty ?? 0),
      promo: row.promo,
      message: '',
    };
    setCounterValues(values => ({ ...values, [row.id]: { ...current, ...patch } }));
  };

  return <Navigation><main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-12">
    <Link href="/merchant" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-primary)]"><ArrowLeft size={16} />Merchant workspace</Link>
    <header><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-brand-primary)]">Partner tools</p><h1 className="mt-2 text-3xl font-bold">Points & quest sponsorships</h1><p className="mt-2 text-sm text-[var(--color-text-muted)]">Merchant points are simulated, capped prototype credits—not cash, cryptocurrency, or a payment balance.</p></header>
    {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}

    <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-[var(--color-text-muted)]">Available simulated points</p><p className="mt-1 text-4xl font-black">{points?.balance_points ?? 0}</p></div><button type="button" onClick={() => void load()} className="rounded-xl border px-3 py-2 text-sm font-semibold"><RefreshCw className="mr-1 inline" size={15} />Refresh</button></div>
      <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-950">Simulated purchase only—no real payment is taken. Daily and monthly prototype issuance limits apply.</p>
      {owner ? <div className="mt-4 flex flex-wrap gap-2">{packages.map(value => <button key={value} type="button" disabled={!!busy} onClick={() => void action(`buy-${value}`, () => buyMerchantPoints(value), `${value} simulated points added.`)} className="rounded-xl bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Add {value.toLocaleString()} points</button>)}</div> : <p className="mt-3 text-xs text-[var(--color-text-muted)]">Staff access is read-only. An owner must purchase points or respond to sponsorships.</p>}
      <div className="mt-5 space-y-2"><h2 className="text-sm font-bold">Point history</h2>{points?.history?.length ? points.history.slice(0, 10).map(row => <div key={row.id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm"><span>{row.source.replaceAll('_', ' ')} · {row.reference}</span><span className="font-semibold">{row.points > 0 ? '+' : ''}{row.points} pts</span></div>) : <p className="text-sm text-[var(--color-text-muted)]">No point credits yet.</p>}</div>
    </section>

    <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center gap-2"><Store size={18} /><h2 className="text-lg font-bold">Quest sponsorship inbox</h2></div>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Review author requests, negotiate points, voucher perks or promotion, and add points to an active sponsored round.</p>
      {requests.length === 0 ? <p className="mt-5 rounded-xl bg-[var(--color-bg-subtle)] p-4 text-sm">No sponsorship requests at this time.</p> : <div className="mt-5 space-y-4">{requests.map(row => {
        const values = counterValues[row.id] ?? { points: String(row.points), voucherId: row.voucher_id ?? '', voucherQty: String(row.voucher_qty ?? 0), promo: row.promo, message: '' };
        const canCounter = owner && row.status === 'requested';
        const canTopUp = owner && row.status === 'accepted' && row.plan_status === 'active';
        const voucherTitle = vouchers.find(voucher => voucher.id === row.voucher_id)?.title;
        return <article key={row.id} className="rounded-xl border p-4 sm:p-5">
          <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold">{row.quest_title}</h3><p className="text-xs text-[var(--color-text-muted)]">{row.spot_name || 'Destination quest'} · {row.status.replaceAll('_', ' ')} · expires {new Date(row.expires_at).toLocaleDateString()}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold">{row.points} points requested</span></div>
          {row.message && <p className="mt-3 text-sm">“{row.message}”</p>}
          {row.voucher_qty > 0 && <p className="mt-2 text-sm">Voucher offer: {row.voucher_qty} × {voucherTitle ?? 'your active voucher'} per completing traveler.</p>}
          {row.promo && <p className="mt-2 text-sm">Includes a sponsored-by placement.</p>}
          {row.status === 'countered' && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">Your counter: {row.counter_points ?? 0} points{(row.counter_voucher_qty ?? 0) > 0 ? ` · ${row.counter_voucher_qty} voucher(s)` : ''}{row.counter_promo ? ' · promotional placement' : ''}. Waiting for the destination author.</p>}
          {owner && row.status === 'requested' && <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold">Counter points<input type="number" min="0" value={values.points} onChange={event => setCounter(row, { points: event.target.value })} aria-label={`Counter points for ${row.quest_title}`} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold">Optional voucher<select value={values.voucherId} onChange={event => setCounter(row, { voucherId: event.target.value, voucherQty: event.target.value ? (values.voucherQty === '0' ? '1' : values.voucherQty) : '0' })} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"><option value="">No voucher included</option>{vouchers.map(voucher => <option value={voucher.id} key={voucher.id}>{voucher.title}</option>)}</select></label>
              {values.voucherId && <label className="text-xs font-semibold">Vouchers per completing traveler<input type="number" min="1" max="100000" value={values.voucherQty} onChange={event => setCounter(row, { voucherQty: event.target.value })} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" /></label>}
              <label className="flex items-center gap-2 self-end pb-2 text-xs"><input type="checkbox" checked={values.promo} onChange={event => setCounter(row, { promo: event.target.checked })} />Include promotional placement</label>
              <input maxLength={500} value={values.message} onChange={event => setCounter(row, { message: event.target.value })} aria-label={`Counter message for ${row.quest_title}`} placeholder="Optional counter message" className="min-w-0 rounded-lg border px-3 py-2 text-sm sm:col-span-2" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><button disabled={!!busy} onClick={() => void action(row.id, () => respondToSponsorship(row.id, 'accept', row.terms_version), 'Sponsorship accepted.')} className="rounded-lg bg-[var(--color-brand-primary)] px-3 py-2 text-sm font-bold text-white">Accept request</button><button disabled={!!busy} onClick={() => void action(row.id, () => respondToSponsorship(row.id, 'decline', row.terms_version), 'Sponsorship declined.')} className="rounded-lg border px-3 py-2 text-sm font-semibold">Decline</button><button disabled={!!busy || (!Number(values.points) && !(values.voucherId && Number(values.voucherQty) > 0) && !values.promo)} onClick={() => void action(row.id, () => counterSponsorship(row.id, row.terms_version, Number(values.points || 0), values.voucherId || null, values.voucherId ? Number(values.voucherQty || 0) : 0, values.promo, values.message || undefined), 'Counter-offer sent.')} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">Send counter-offer</button></div>
          </>}
          {canTopUp && <div className="mt-4 rounded-lg bg-[var(--color-bg-subtle)] p-3"><label className="block text-xs font-semibold">Add points to this active round<input type="number" min="1" value={topUps[row.plan_id] ?? ''} onChange={event => setTopUps(values => ({ ...values, [row.plan_id]: event.target.value }))} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs" /></label><button disabled={!!busy || !Number(topUps[row.plan_id])} onClick={() => void action(`topup-${row.plan_id}`, () => topUpSponsoredPlan(row.plan_id, Number(topUps[row.plan_id])), 'Points added to the active sponsored round.')} className="mt-3 rounded-lg bg-[var(--color-brand-primary)] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Add sponsor points</button></div>}
        </article>;
      })}</div>}
    </section>
    <p className="text-xs text-[var(--color-text-muted)]"><Coins className="mr-1 inline" size={14} />A request is not a charge. Budget-mode points move only on acceptance. Window-mode points are reserved per traveler start and never exceed your available balance.</p>
  </main></Navigation>;
}
