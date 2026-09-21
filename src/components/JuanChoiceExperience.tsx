'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Navigation } from './Navigation';
import { useAuth } from '@/lib/auth';
import { uuid } from '@/lib/api';
import { effectiveJuanChoiceStatus, getJuanChoiceCampaign, getMyJuanChoiceBallot, juanChoiceErrorCode, listJuanChoiceCampaigns, putJuanChoiceBallot, JuanChoiceBallot, JuanChoiceCampaign, JuanChoiceDetail, JuanChoiceReceipt } from '@/lib/juanchoice';

type PendingVote = { candidateId: string; expectedVersion: number; key: string };

export function JuanChoiceExperience({ campaignId, focusCandidateId }: { campaignId?: string; focusCandidateId?: string }) {
  const { user, isLoading: authLoading, isPreviewActive } = useAuth();
  const [campaigns, setCampaigns] = useState<JuanChoiceCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(campaignId ?? null);
  const [detail, setDetail] = useState<JuanChoiceDetail | null>(null);
  const [ballot, setBallot] = useState<JuanChoiceBallot | null>(null);
  const [receipt, setReceipt] = useState<JuanChoiceReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voteError, setVoteError] = useState('');
  const [pending, setPending] = useState<PendingVote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  const scrolledCandidateRef = useRef<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    listJuanChoiceCampaigns(controller.signal).then(items => {
      setCampaigns(items);
      if (!campaignId) setSelectedId(items.find(item => effectiveJuanChoiceStatus(item) === 'voting')?.id ?? items[0]?.id ?? null);
      setError('');
    }).catch(err => {
      if (!controller.signal.aborted) setError(juanChoiceErrorCode(err) === 'FEATURE_DISABLED' ? 'JuanChoice is not open yet. Check back when the pilot begins.' : 'Campaigns could not be loaded. Please retry.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [campaignId]);

  const refresh = useCallback(async (id: string, signal?: AbortSignal) => {
    const [nextDetail, nextBallot] = await Promise.all([getJuanChoiceCampaign(id, signal), user ? getMyJuanChoiceBallot(id, signal) : Promise.resolve(null)]);
    if (signal?.aborted) return;
    setDetail(nextDetail); setBallot(nextBallot); setError('');
  }, [user]);

  useEffect(() => {
    if (!selectedId || authLoading) return;
    const controller = new AbortController();
    setDetail(null); setBallot(null); setReceipt(null); setPending(null); setVoteError(''); setLoading(true);
    void refresh(selectedId, controller.signal).catch(err => {
      if (!controller.signal.aborted) setError(juanChoiceErrorCode(err) === 'CAMPAIGN_NOT_FOUND' ? 'This campaign is unavailable.' : 'Campaign details could not be loaded. Please retry.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedId, authLoading, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setClock(Date.now());
      if (selectedId && !submitting) void getJuanChoiceCampaign(selectedId).then(setDetail).catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [selectedId, submitting]);
  useEffect(() => { if (pending) confirmRef.current?.focus(); }, [pending]);
  useEffect(() => { if (!pending) returnFocusRef.current?.focus(); }, [pending]);
  useEffect(() => { if (focusCandidateId && detail && scrolledCandidateRef.current !== focusCandidateId) { document.getElementById(`choice-candidate-${focusCandidateId}`)?.scrollIntoView({block:'center'}); scrolledCandidateRef.current=focusCandidateId; } }, [focusCandidateId,detail]);

  const submitVote = async () => {
    if (!selectedId || !pending || submitting) return;
    setSubmitting(true); setVoteError('');
    try {
      const result = await putJuanChoiceBallot(selectedId, pending.candidateId, pending.expectedVersion, pending.key);
      setReceipt(result); setBallot(result.ballot); setPending(null);
      void refresh(selectedId).catch(() => {});
    } catch (err) {
      const code = juanChoiceErrorCode(err);
      if (code === 'VERSION_CONFLICT') {
        setVoteError('Your ballot changed in another session. Review the latest selection before trying again.'); setPending(null);
        void refresh(selectedId).catch(() => {});
      } else if (code === 'ROUND_CLOSED') {
        setVoteError('This round has closed. No new ballot was submitted.'); setPending(null);
        void refresh(selectedId).catch(() => {});
      } else if (code === 'NOT_ELIGIBLE') {
        setVoteError('Voting unlocks after your account is 72 hours old or you complete one verified visit.'); setPending(null);
      } else if (code === 'NETWORK_ERROR' || code === 'REQUEST_FAILED') {
        setVoteError('The result is uncertain. Retry uses the same receipt key, so it cannot double-count your vote.');
      } else {
        setVoteError('Vote could not be submitted. Please review the round and try again.'); setPending(null);
      }
    } finally { setSubmitting(false); }
  };

  const campaign = detail?.campaign;
  const status = campaign ? effectiveJuanChoiceStatus(campaign, clock) : null;
  const canVote = status === 'voting' && !isPreviewActive;
  const currentUrl = selectedId ? `/choice/${selectedId}` : '/choice';

  return <Navigation><div className="mx-auto w-full max-w-5xl space-y-5 px-3 py-6 sm:px-6">
    <header className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-amber-700">JuanChoice · community spotlight</p>
      <h1 className="mt-2 text-3xl font-black text-[#582F0E]">Choose a Pangasinan destination worth discovering</h1>
      <p className="mt-3 max-w-2xl text-sm text-[#514532]">One free ballot per round. Every participant earns the same 25 Civic XP and one stamp, regardless of which destination wins. This is separate from governance voting and mJDQ.</p>
    </header>
    {campaigns.length > 1 && !campaignId && <nav aria-label="JuanChoice rounds" className="flex flex-wrap gap-2">{campaigns.map(item => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} aria-current={selectedId === item.id ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedId === item.id ? 'bg-[#3F6653] text-white' : 'bg-white text-[#3F6653] border border-[#E3DFD5]'}`}>{item.theme}</button>)}</nav>}
    {loading && <p role="status" className="rounded-2xl bg-white p-6 text-[#514532]">Loading the current round…</p>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error} <button className="underline" onClick={() => window.location.reload()}>Retry</button></div>}
    {!loading && !error && !campaign && <p className="rounded-2xl border border-[#E3DFD5] bg-white p-6 text-[#514532]">No JuanChoice round is available yet. No sample votes or standings are shown.</p>}
    {campaign && <section className="space-y-5" aria-labelledby="round-heading">
      <div className="rounded-2xl border border-[#E3DFD5] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#7D5800]">{campaign.region} · {status}</p><h2 id="round-heading" className="mt-1 text-2xl font-black text-[#2C221E]">{campaign.theme}</h2></div><Link href={currentUrl} className="rounded-full border border-[#E3DFD5] px-3 py-2 text-sm font-semibold text-[#3F6653]">Share round</Link></div>
        <p className="mt-3 text-sm text-[#514532]">{status === 'voting' ? 'Voting closes' : status === 'scheduled' ? 'Voting opens' : 'Round closed'}: <time dateTime={status === 'scheduled' ? campaign.opens_at : campaign.closes_at}>{new Date(status === 'scheduled' ? campaign.opens_at : campaign.closes_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT</time></p>
        {isPreviewActive && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Evaluator preview is read-only. Exit preview before voting.</p>}
        {!user && !authLoading && status === 'voting' && <p className="mt-3 text-sm text-[#514532]">Browse freely; <Link className="font-bold text-[#3F6653] underline" href={`/login?redirect=${encodeURIComponent(currentUrl)}`}>sign in</Link> to vote.</p>}
        {ballot && <p className="mt-3 text-sm font-semibold text-[#2D6A4F]">Your ballot: {detail.standings.find(item => item.candidate_id === ballot.candidate_id)?.spot_name ?? 'Previously selected destination'} · version {ballot.version}</p>}
        {receipt && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Ballot recorded. +25 Civic XP and +1 stamp {receipt.replayed ? '(receipt replayed)' : 'earned'}; 0 mJDQ issued.</p>}
        {voteError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{voteError}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{detail.standings.map((item, index) => <article key={item.candidate_id} id={`choice-candidate-${item.candidate_id}`} className={`rounded-2xl border bg-white p-5 ${focusCandidateId === item.candidate_id ? 'border-[#FFB703] ring-2 ring-amber-200' : 'border-[#E3DFD5]'}`}>
        <p className="text-xs font-bold uppercase text-[#837560]">#{index + 1} · community support</p><h3 className="mt-1 text-xl font-black text-[#2C221E]">{item.spot_name ?? item.spot_id}</h3>
        <p className="mt-2 text-sm text-[#514532]">{item.votes} {item.votes === 1 ? 'ballot' : 'ballots'} · popularity, not a visitor rating</p>
        <div className="mt-4 flex flex-wrap gap-2">{item.spot_slug && <Link href={`/spots/${item.spot_slug}`} className="rounded-lg border border-[#E3DFD5] px-4 py-2 text-sm font-semibold text-[#3F6653]">View place</Link>}<Link href={`/choice/${campaign.id}/candidates/${item.candidate_id}`} className="rounded-lg border border-[#E3DFD5] px-4 py-2 text-sm font-semibold text-[#3F6653]">Share candidate</Link>{canVote && user && <button type="button" onClick={event => { returnFocusRef.current=event.currentTarget; setVoteError(''); setPending({candidateId:item.candidate_id,expectedVersion:ballot?.version ?? 0,key:uuid()}); }} className="rounded-lg bg-[#3F6653] px-4 py-2 text-sm font-bold text-white">{ballot ? 'Change vote' : 'Vote for this place'}</button>}</div>
      </article>)}</div>
      {detail.standings.length === 0 && <p className="rounded-2xl bg-white p-6 text-[#514532]">No eligible destinations are listed for this round.</p>}
      {detail.result && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-[#582F0E]">Final result: {detail.result.valid_ballots} valid ballots. {detail.result.co_winner_ids.length === 0 ? 'No winner was declared.' : detail.result.co_winner_ids.length > 1 ? 'The round ended in a tie; all co-winners are preserved.' : 'One destination topped the community vote. Spotlight placement still requires a separate safety review.'}</p>}
    </section>}
    {pending && <div role="dialog" aria-modal="true" aria-labelledby="vote-confirm-title" onKeyDown={event => { if (event.key === 'Escape' && !submitting) setPending(null); if (event.key === 'Tab') { if (event.shiftKey && document.activeElement === confirmRef.current) { event.preventDefault(); cancelRef.current?.focus(); } else if (!event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); confirmRef.current?.focus(); } } }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="vote-confirm-title" className="text-xl font-black text-[#2C221E]">Confirm your JuanChoice ballot</h2><p className="mt-3 text-sm text-[#514532]">Vote for {detail?.standings.find(item => item.candidate_id === pending.candidateId)?.spot_name ?? 'this destination'}? This is free. Your participation reward is the same regardless of the result.</p><div className="mt-5 flex flex-wrap gap-3"><button ref={confirmRef} type="button" onClick={() => void submitVote()} disabled={submitting} className="rounded-lg bg-[#3F6653] px-5 py-3 font-bold text-white disabled:opacity-60">{submitting ? 'Recording…' : voteError ? 'Retry same vote' : 'Confirm vote'}</button><button ref={cancelRef} type="button" disabled={submitting} onClick={() => setPending(null)} className="rounded-lg border border-[#E3DFD5] px-5 py-3 font-semibold text-[#514532]">Cancel</button></div></div></div>}
  </div></Navigation>;
}
