'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Navigation } from './Navigation';
import { useAuth } from '@/lib/auth';
import { uuid } from '@/lib/api';
import { appRoutes } from '@/lib/routes';
import { effectiveJuanChoiceStatus, getJuanChoiceCampaign, getJuanChoiceOverview, getMyJuanChoiceState, juanChoiceErrorCode, putJuanChoiceBallot, serverAlignedNow, JuanChoiceBallot, JuanChoiceDetail, JuanChoiceMyState, JuanChoiceOverview, JuanChoiceReceipt } from '@/lib/juanchoice';

import { getJuanChoicePresentation, isJuanChoiceEnvironmentTrusted } from '@/lib/juanchoice-presentation';
import { triggerCelebration } from './CelebrationEffects';

type PendingVote = { candidateId: string; expectedVersion: number; key: string };

export function JuanChoiceExperience({
  campaignId,
  focusCandidateId,
  isPresentation,
}: {
  campaignId?: string;
  focusCandidateId?: string;
  isPresentation?: boolean;
}) {
  const presentationBuild = isPresentation ?? (process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE === 'true');
  const { user, isLoading: authLoading, isPreviewActive } = useAuth();
  const [overview, setOverview] = useState<(JuanChoiceOverview & { receivedAtMono: number }) | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(campaignId ?? null);
  const [detail, setDetail] = useState<JuanChoiceDetail | null>(null);
  const [ballot, setBallot] = useState<JuanChoiceBallot | null>(null);
  const [myState, setMyState] = useState<JuanChoiceMyState | null>(null);
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
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getJuanChoiceOverview(controller.signal).then(value => {
      const receivedAtMono = performance.now();
      setOverview({ ...value, receivedAtMono });
      setClock(receivedAtMono);
      if (!campaignId) { setSelectedId(value.current?.id ?? null); if (!value.current) setDetail(null); }
      setError('');
    }).catch(err => {
      if (!controller.signal.aborted) setError(juanChoiceErrorCode(err) === 'FEATURE_DISABLED' ? 'JuanChoice is not open yet. Check back when the pilot begins.' : 'Campaigns could not be loaded. Please retry.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [campaignId]);

  const refresh = useCallback(async (id: string, signal?: AbortSignal) => {
    const [nextDetail, nextMine] = await Promise.all([getJuanChoiceCampaign(id, signal), user ? getMyJuanChoiceState(id, signal) : Promise.resolve(null)]);
    if (signal?.aborted) return;
    setDetail(nextDetail); setMyState(nextMine); setBallot(nextMine?.ballot ?? null); setError('');
  }, [user]);

  useEffect(() => {
    if (!selectedId || authLoading) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setDetail(null); setBallot(null); setMyState(null); setReceipt(null); setPending(null); setVoteError(''); setLoading(true);
      }
    });
    void refresh(selectedId, controller.signal).catch(err => {
      if (!controller.signal.aborted) setError(juanChoiceErrorCode(err) === 'CAMPAIGN_NOT_FOUND' ? 'This campaign is unavailable.' : 'Campaign details could not be loaded. Please retry.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedId, authLoading, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setClock(performance.now());
      if (!campaignId) void getJuanChoiceOverview().then(value => {
        const receivedAtMono = performance.now();
        setOverview({ ...value, receivedAtMono });
        setClock(receivedAtMono);
        setSelectedId(value.current?.id ?? null);
        if (!value.current) setDetail(null);
      }).catch(() => {});
      if (selectedId && !submitting) void getJuanChoiceCampaign(selectedId).then(setDetail).catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [campaignId,selectedId, submitting]);
  useEffect(() => { if (pending) confirmRef.current?.focus(); }, [pending]);
  useEffect(() => { if (!pending) returnFocusRef.current?.focus(); }, [pending]);
  useEffect(() => { if (focusCandidateId && detail && scrolledCandidateRef.current !== focusCandidateId) { document.getElementById(`choice-candidate-${focusCandidateId}`)?.scrollIntoView({block:'center'}); scrolledCandidateRef.current=focusCandidateId; } }, [focusCandidateId,detail]);

  const submitVote = async () => {
    if (!selectedId || !pending || submitting) return;
    setSubmitting(true); setVoteError('');
    try {
      const freshOverview = await getJuanChoiceOverview();
      if (!isJuanChoiceEnvironmentTrusted(freshOverview, presentationBuild) ||
          freshOverview.current?.id !== selectedId || !freshOverview.availability.voting_enabled) {
        throw new Error('PRESENTATION_ENVIRONMENT_MISMATCH');
      }
      const receivedAtMono = performance.now();
      setOverview({ ...freshOverview, receivedAtMono });
      const result = await putJuanChoiceBallot(selectedId, pending.candidateId, pending.expectedVersion, pending.key);
      setReceipt(result); setBallot(result.ballot); setMyState(null); setPending(null);
      triggerCelebration({ type: 'poppers', playAudio: true });
      void refresh(selectedId).catch(() => {});
    } catch (err) {
      if (err instanceof Error && err.message === 'PRESENTATION_ENVIRONMENT_MISMATCH') {
        setVoteError('The voting environment changed or this round is unavailable. No ballot was sent. Please refresh.');
        setPending(null);
        return;
      }
      const code = juanChoiceErrorCode(err);
      if (code === 'VERSION_CONFLICT') {
        setVoteError('Your ballot changed in another session. Review the latest selection before trying again.'); setPending(null);
        void refresh(selectedId).catch(() => {});
      } else if (code === 'ROUND_CLOSED') {
        setVoteError('This round has closed. No new ballot was submitted.'); setPending(null);
        void refresh(selectedId).catch(() => {});
      } else if (code === 'NOT_ELIGIBLE') {
        setVoteError('Voting unlocks after your account is 72 hours old or you complete one verified visit.'); setPending(null);
      } else if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || code === 'REQUEST_FAILED') {
        setVoteError('The result is uncertain. Retry uses the same receipt key, so it cannot double-count your vote.');
      } else {
        setVoteError('Vote could not be submitted. Please review the round and try again.'); setPending(null);
      }
    } finally { setSubmitting(false); }
  };

  const campaign = detail?.campaign;
  const serverNow = overview ? serverAlignedNow(overview.server_time, overview.receivedAtMono, clock) : null;
  const status = campaign ? serverNow === null ? campaign.status : effectiveJuanChoiceStatus(campaign, serverNow) : null;
  const environmentTrusted = isJuanChoiceEnvironmentTrusted(overview, presentationBuild);
  const trustedOverview = environmentTrusted ? overview : overview
    ? { ...overview, availability: { voting_enabled: false, reason: 'ENVIRONMENT_MISMATCH' } }
    : null;
  const presentation = getJuanChoicePresentation(trustedOverview, status);
  const canVote = serverNow !== null && status === 'voting' && overview?.current?.id === campaign?.id
    && environmentTrusted && overview?.availability.voting_enabled === true && !isPreviewActive && myState?.can_vote_now === true;
  const currentUrl = selectedId ? appRoutes.choice(selectedId) : '/choice';
  const formatDate = (value:string) => new Date(value).toLocaleString('en-PH',{
    timeZone:overview?.region.timezone ?? 'Asia/Manila',dateStyle:'long',timeStyle:'short',
  });

  return <Navigation><div className="w-full space-y-5">
    {presentationBuild && <div role="status" className="rounded-2xl border-2 border-amber-500 bg-amber-100 p-4 text-sm font-bold text-amber-950">
      Presentation demo — votes and Civic XP/stamps stay in a separate test database. They do not count toward official rankings or rewards.
    </div>}
    {overview && !environmentTrusted && <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      Voting configuration mismatch. Ballots are disabled here. Reload the page or ask the team to check the demo API.
    </div>}
    <header className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 sm:p-8">
      <p className="text-xs font-black uppercase tracking-widest text-amber-700">JuanChoice · community spotlight</p>
      <h1 className="mt-2 text-3xl font-black text-[#582F0E]">{presentation.headerTitle}</h1>
      <p className="mt-3 max-w-2xl text-sm text-[#514532]">{presentation.headerDescription}</p>
    </header>
    {presentation.readOnlyNotice && (
      <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 shadow-xs">
        {presentationBuild ? 'Demo voting is not open yet. You can inspect the presentation round without creating an official ballot.' : presentation.readOnlyNotice}
      </div>
    )}
    {loading && <p role="status" className="rounded-2xl bg-white p-6 text-[#514532]">Loading the current round…</p>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error} <button className="underline" onClick={() => window.location.reload()}>Retry</button></div>}
    {!loading && !error && !campaign && <section className="rounded-2xl border border-[#E3DFD5] bg-white p-5 sm:p-6" aria-labelledby="next-round-heading">
      <h2 id="next-round-heading" className="text-xl font-black text-[#2C221E]">{presentation.nextRoundHeading}</h2>
      {overview?.next ? <p className="mt-2 text-sm text-[#514532]">{presentation.nextRoundWindowLabel} <time dateTime={overview.next.opens_at}>{formatDate(overview.next.opens_at)} PHT</time> and closes <time dateTime={overview.next.closes_at}>{formatDate(overview.next.closes_at)} PHT</time>{overview.next.theme ? ` · ${overview.next.theme}` : ''}.</p>
        : <p className="mt-2 text-sm text-[#514532]">The next voting date has not been confirmed yet.</p>}
      <p className="mt-2 text-sm text-[#514532]">{presentation.educationalRewardCopy}</p>
      {overview?.notice && <p role="status" className="mt-3 text-sm text-[#514532]">{overview.notice.message}</p>}
    </section>}
    {campaign && overview?.next && <p className="rounded-2xl border border-[#E3DFD5] bg-white p-4 text-sm text-[#514532]">{presentation.nextRoundPrefix} <time dateTime={overview.next.opens_at}>{formatDate(overview.next.opens_at)} PHT</time>.</p>}
    {campaign && <section className="space-y-5" aria-labelledby="round-heading">
      <div className="rounded-2xl border border-[#E3DFD5] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#7D5800]">{campaign.region} · {status}</p><h2 id="round-heading" className="mt-1 text-2xl font-black text-[#2C221E]">{campaign.theme}</h2></div><Link href={currentUrl} className="rounded-full border border-[#E3DFD5] px-3 py-2 text-sm font-semibold text-[#3F6653]">Share round</Link></div>
        <p className="mt-3 text-sm text-[#514532]">{presentation.roundWindowLabel}: <time dateTime={status === 'scheduled' ? campaign.opens_at : campaign.closes_at}>{new Date(status === 'scheduled' ? campaign.opens_at : campaign.closes_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT</time></p>
        {isPreviewActive && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Evaluator preview is read-only. Exit preview before voting.</p>}
        {!user && !authLoading && status === 'voting' && presentation.mode === 'write_enabled' && <p className="mt-3 text-sm text-[#514532]">Browse freely; <Link className="font-bold text-[#3F6653] underline" href={`/login?redirect=${encodeURIComponent(currentUrl)}`}>sign in</Link> to vote.</p>}
        {user && presentation.mode === 'write_enabled' && myState?.eligibility.reason === 'ACCOUNT_TOO_NEW' && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Voting unlocks after {myState.eligibility.eligible_at ? formatDate(myState.eligibility.eligible_at) : 'your account is 72 hours old'} or after one approved destination visit.</p>}
        {user && presentation.mode === 'write_enabled' && myState?.eligibility.reason === 'UNAVAILABLE' && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Voting eligibility could not be confirmed. Please try again later.</p>}
        {ballot && <p className="mt-3 text-sm font-semibold text-[#2D6A4F]">Your ballot: {detail.standings.find(item => item.candidate_id === ballot.candidate_id)?.spot_name ?? 'Previously selected destination'} · version {ballot.version}</p>}
        {receipt && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{presentationBuild ? 'Demo ballot recorded. +25 demo Civic XP and +1 demo stamp in the separate test database only' : 'Ballot recorded. +25 Civic XP and +1 stamp earned'}{receipt.replayed ? ' (receipt replayed)' : ''}; 0 mJDQ issued.</p>}
        {voteError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{voteError}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">{detail.standings.map((item, index) => <article key={item.candidate_id} id={`choice-candidate-${item.candidate_id}`} className={`rounded-2xl border bg-white p-5 flex flex-col justify-between ${focusCandidateId === item.candidate_id ? 'border-[#FFB703] ring-2 ring-amber-200' : 'border-[#E3DFD5]'}`}>
        <div>
          <p className="text-xs font-bold uppercase text-[#837560]">#{index + 1} · {presentationBuild ? 'demo support' : 'community support'}</p><h3 className="mt-1 text-xl font-black text-[#2C221E]">{item.spot_name ?? item.spot_id}</h3>
          <p className="mt-2 text-sm text-[#514532]">{item.votes} {presentationBuild ? (item.votes === 1 ? 'demo ballot' : 'demo ballots') : (item.votes === 1 ? 'ballot' : 'ballots')} · popularity, not a visitor rating</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{item.spot_id && <Link href={appRoutes.spot(item.spot_id)} className="rounded-lg border border-[#E3DFD5] px-3.5 py-1.5 text-xs font-semibold text-[#3F6653]">View place</Link>}<Link href={appRoutes.choiceCandidate(campaign.id, item.candidate_id)} className="rounded-lg border border-[#E3DFD5] px-3.5 py-1.5 text-xs font-semibold text-[#3F6653]">Share</Link>{canVote && user && <button type="button" onClick={event => { returnFocusRef.current=event.currentTarget; setVoteError(''); setPending({candidateId:item.candidate_id,expectedVersion:ballot?.version ?? 0,key:uuid()}); }} className="rounded-lg bg-[#3F6653] px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer active:scale-95">{ballot ? 'Change vote' : 'Vote for this place'}</button>}</div>
      </article>)}</div>
      {detail.standings.length === 0 && <p className="rounded-2xl bg-white p-6 text-[#514532]">No eligible destinations are listed for this round.</p>}
      {detail.result && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-[#582F0E]">{presentationBuild ? `Presentation demo result: ${detail.result.valid_ballots} demo ballots recorded in the separate test database. This rehearsal does not count toward official destination rankings or rewards.` : `Final result: ${detail.result.valid_ballots} valid ballots. ${detail.result.co_winner_ids.length === 0 ? 'No winner was declared.' : detail.result.co_winner_ids.length > 1 ? 'The round ended in a tie; all co-winners are preserved.' : 'One destination topped the community vote. Spotlight placement still requires a separate safety review.'}`}</p>}
    </section>}
    {overview?.previous && <section className="rounded-2xl border border-[#E3DFD5] bg-white p-5 sm:p-6" aria-labelledby="previous-results-heading">
      <p className="text-xs font-bold uppercase tracking-wide text-[#7D5800]">{overview.previous.period_label}</p>
      <h2 id="previous-results-heading" className="mt-1 text-xl font-black text-[#2C221E]">{presentationBuild ? 'Previous demo results' : 'Previous results'}</h2>
      <p className="mt-2 text-sm text-[#514532]">{presentationBuild ? `Presentation demo: ${overview.previous.valid_ballots} demo ballots in test database. Not official rankings.` : `${overview.previous.valid_ballots} valid ${overview.previous.valid_ballots === 1 ? 'ballot' : 'ballots'} · ${overview.previous.co_winner_ids.length === 0 ? 'No winner this round' : overview.previous.co_winner_ids.length > 1 ? 'Co-winners' : 'Community winner'}. Community support is popularity, not a visitor rating.`}</p>
      <ol className="mt-4 space-y-2">{overview.previous.standings.map(item => <li key={item.candidate_id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3DFD5] pt-2 text-sm text-[#514532]">
        <span>{overview.previous!.co_winner_ids.includes(item.candidate_id) ? '★ ' : ''}{item.spot_name ?? 'Destination unavailable'}</span><span>{item.votes} {item.votes===1?'vote':'votes'}</span>
      </li>)}</ol>
    </section>}
    {!loading && !error && !overview?.previous && campaign && <section className="rounded-2xl border border-[#E3DFD5] bg-white p-5 sm:p-6" aria-labelledby="previous-results-heading">
      <h2 id="previous-results-heading" className="text-xl font-black text-[#2C221E]">{presentationBuild ? 'Previous demo results' : 'Previous results'}</h2>
      <p className="mt-2 text-sm text-[#514532]">{presentationBuild
        ? 'No previous demo rounds in this isolated test database.'
        : overview?.notice?.code === 'RESULTS_PENDING'
          ? 'Voting has closed. Results are being finalized.'
          : 'Our first round is underway. Results will appear after voting ends and the result is finalized.'}</p>
    </section>}
    {pending && <div role="dialog" aria-modal="true" aria-labelledby="vote-confirm-title" onKeyDown={event => { if (event.key === 'Escape' && !submitting) setPending(null); if (event.key === 'Tab') { if (event.shiftKey && document.activeElement === confirmRef.current) { event.preventDefault(); cancelRef.current?.focus(); } else if (!event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); confirmRef.current?.focus(); } } }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="vote-confirm-title" className="text-xl font-black text-[#2C221E]">Confirm your JuanChoice ballot</h2><p className="mt-3 text-sm text-[#514532]">Vote for {detail?.standings.find(item => item.candidate_id === pending.candidateId)?.spot_name ?? 'this destination'}? This is free. {presentationBuild ? 'This is a presentation demo: the ballot and participation XP/stamp stay in the separate test database and do not count officially.' : 'Your participation reward is the same regardless of the result.'}</p><div className="mt-5 flex flex-wrap gap-3"><button ref={confirmRef} type="button" onClick={() => void submitVote()} disabled={submitting} className="rounded-lg bg-[#3F6653] px-5 py-3 font-bold text-white disabled:opacity-60">{submitting ? 'Recording…' : voteError ? 'Retry same vote' : 'Confirm vote'}</button><button ref={cancelRef} type="button" disabled={submitting} onClick={() => setPending(null)} className="rounded-lg border border-[#E3DFD5] px-5 py-3 font-semibold text-[#514532]">Cancel</button></div></div></div>}
  </div></Navigation>;
}
