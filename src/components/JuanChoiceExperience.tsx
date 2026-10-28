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
import { BoostBar, PerkPills, ReigningHero } from './JuanChoiceWeekly';
import { RankMedal, RoundArena, ShareBar, VotePower, useLiveServerNow } from './JuanChoiceArena';
import { Check, ChevronDown, Crown, Zap } from 'lucide-react';

const NOT_OPEN_MESSAGE = 'JuanChoice is not open yet. Check back when the pilot begins.';

/** targetWeight/cost are set for a Plan 65 quadratic boost (points); a plain vote or switch omits them. */
type PendingVote = { candidateId: string; expectedVersion: number; key: string; targetWeight?: number; cost?: number };

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
  const { user, isLoading: authLoading, isPreviewActive, refreshProfile } = useAuth();
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
      if (!controller.signal.aborted) setError(juanChoiceErrorCode(err) === 'FEATURE_DISABLED' ? NOT_OPEN_MESSAGE : 'Campaigns could not be loaded. Please retry.');
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
      const result = await putJuanChoiceBallot(selectedId, pending.candidateId, pending.expectedVersion, pending.key, pending.targetWeight);
      setReceipt(result); setBallot(result.ballot); setMyState(null); setPending(null);
      if (result.boost) void refreshProfile().catch(() => {});
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
      } else if (code === 'INSUFFICIENT_POINTS') {
        setVoteError('Not enough points for this boost yet. Earn points through quests, then try again. Your vote still counts.'); setPending(null);
      } else if (code === 'INVALID_BOOST_DOWNGRADE' || code === 'BOOSTS_DISABLED' || code === 'BOOST_UNAVAILABLE') {
        setVoteError('Boosting is not available for this ballot right now. Your current vote still counts.'); setPending(null);
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
  const liveNow = useLiveServerNow(overview?.server_time, overview?.receivedAtMono) ?? serverNow;
  const weekly = campaign?.policy_version === 'juanchoice-weekly-v1';
  const standings = detail?.standings ?? [];
  const totalVotes = standings.reduce((sum, item) => sum + (item.votes ?? 0), 0);
  const totalVoters = standings.every(item => typeof item.voter_count === 'number')
    ? standings.reduce((sum, item) => sum + (item.voter_count ?? 0), 0) : null;
  const leaderId = !campaign?.tally_hidden && standings[0] && (standings[0].votes ?? 0) > (standings[1]?.votes ?? 0) ? standings[0].candidate_id : null;
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
    {!presentationBuild && overview?.reigning && <ReigningHero reigning={overview.reigning} nowMs={serverNow} />}
    {presentation.readOnlyNotice && (
      <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 shadow-xs">
        {presentationBuild ? 'Demo voting is not open yet. You can inspect the presentation round without creating an official ballot.' : presentation.readOnlyNotice}
      </div>
    )}
    {loading && <p role="status" className="rounded-2xl bg-white p-6 text-[#514532]">Loading the current round…</p>}
    {error && (error === NOT_OPEN_MESSAGE
      ? <div role="status" className="rounded-2xl border border-[#E3DFD5] bg-white p-5 text-sm text-[#514532]">{error}</div>
      : <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error} <button className="underline" onClick={() => window.location.reload()}>Retry</button></div>)}
    {!loading && !error && !campaign && <section className="rounded-2xl border border-[#E3DFD5] bg-white p-5 sm:p-6 space-y-4" aria-labelledby="next-round-heading">
      <div>
        <h2 id="next-round-heading" className="text-xl font-black text-[#2C221E]">{presentation.nextRoundHeading}</h2>
        {overview?.next ? <p className="mt-2 text-sm text-[#514532]">{presentation.nextRoundWindowLabel} <time dateTime={overview.next.opens_at}>{formatDate(overview.next.opens_at)} PHT</time> and closes <time dateTime={overview.next.closes_at}>{formatDate(overview.next.closes_at)} PHT</time>{overview.next.theme ? ` · ${overview.next.theme}` : ''}.</p>
          : <p className="mt-2 text-sm text-[#514532]">{overview?.notice?.message ?? 'The next voting date has not been confirmed yet.'}</p>}
        <p className="mt-2 text-sm text-[#514532]">{presentation.educationalRewardCopy}</p>
      </div>
      <div className="pt-4 border-t border-[#E3DFD5]">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#582F0E]">How JuanChoice works</h3>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3 text-xs text-[#514532]">
          <li className="rounded-xl bg-[#FAF9F5] border border-[#E8E5DE] p-3">
            <span className="font-black text-[#2D6A4F] block mb-1">1. Explore &amp; Verify</span>
            Complete one verified visit or hold an explorer account for 72 hours to unlock community voting.
          </li>
          <li className="rounded-xl bg-[#FAF9F5] border border-[#E8E5DE] p-3">
            <span className="font-black text-[#2D6A4F] block mb-1">2. Cast 1 Free Ballot</span>
            Support one Pangasinan destination per round at 0 points cost. Earn +25 Civic XP for participating.
          </li>
          <li className="rounded-xl bg-[#FAF9F5] border border-[#E8E5DE] p-3">
            <span className="font-black text-[#2D6A4F] block mb-1">3. Spotlight Rotation</span>
            Top-voted destinations enter the community spotlight after LGU safety and capacity review.
          </li>
        </ol>
      </div>
    </section>}
    {campaign && !weekly && overview?.next && <p className="rounded-2xl border border-[#E3DFD5] bg-white p-4 text-sm text-[#514532]">{presentation.nextRoundPrefix} <time dateTime={overview.next.opens_at}>{formatDate(overview.next.opens_at)} PHT</time>.</p>}
    {campaign && <section className="space-y-5" aria-labelledby="round-heading">
      <RoundArena campaign={campaign} status={status} nowMs={liveNow} totalVotes={campaign.tally_hidden ? null : totalVotes}
        totalVoters={campaign.tally_hidden ? null : totalVoters} contenders={standings.length} shareHref={currentUrl}>
        {weekly && <p className="mt-2 max-w-xl text-sm text-white/85">Vote for next week&apos;s Champion. The winner reigns for 7 days with its perks live; the runner-up becomes Minister.</p>}
      </RoundArena>
      <div className="rounded-2xl border border-[#E3DFD5] bg-white p-5 sm:p-6">
        <p className="text-sm text-[#514532]">{presentation.roundWindowLabel}: <time dateTime={status === 'scheduled' ? campaign.opens_at : campaign.closes_at}>{new Date(status === 'scheduled' ? campaign.opens_at : campaign.closes_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT</time></p>
        {isPreviewActive && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Evaluator preview is read-only. Exit preview before voting.</p>}
        {!user && !authLoading && status === 'voting' && presentation.mode === 'write_enabled' && <p className="mt-3 text-sm text-[#514532]">Browse freely; <Link className="font-bold text-[#3F6653] underline" href={`/login?redirect=${encodeURIComponent(currentUrl)}`}>sign in</Link> to vote.</p>}
        {user && presentation.mode === 'write_enabled' && myState?.eligibility.reason === 'ACCOUNT_TOO_NEW' && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Voting unlocks after {myState.eligibility.eligible_at ? formatDate(myState.eligibility.eligible_at) : 'your account is 72 hours old'} or after one approved destination visit.</p>}
        {user && presentation.mode === 'write_enabled' && myState?.eligibility.reason === 'UNAVAILABLE' && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Voting eligibility could not be confirmed. Please try again later.</p>}
        {ballot && <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-[#2D6A4F]">
          <Check className="h-4 w-4" aria-hidden="true" />Your ballot: {detail.standings.find(item => item.candidate_id === ballot.candidate_id)?.spot_name ?? 'Previously selected destination'}{ballot.vote_weight && ballot.vote_weight > 1 ? ` · counts ${ballot.vote_weight}x` : ''}
          {weekly && <VotePower weight={ballot.vote_weight ?? 1} />}<span className="text-xs font-normal text-[#6F6352]">version {ballot.version}</span></p>}
        {ballot && canVote && user && myState?.boost?.available && (myState.boost.current_weight || 1) < 5 && <BoostBar currentWeight={myState.boost.current_weight || 1}
          costByWeight={myState.boost.cost_by_weight} xpPerTier={myState.boost.civic_xp_per_tier} balance={user.points} disabled={submitting}
          onBoost={(weight, cost) => { setVoteError(''); setPending({ candidateId: ballot.candidate_id, expectedVersion: ballot.version, key: uuid(), targetWeight: weight, cost }); }} />}
        {campaign.tally_hidden && <p role="status" className="mt-3 rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-900">🔒 Final 24 hours: vote counts are hidden until the round closes (Monday 00:00 PHT). You can still vote, switch or boost.</p>}
        {receipt && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{receipt.boost
          ? `Boost recorded: your vote now counts ${receipt.ballot.vote_weight}x. ${receipt.boost.points_spent} points spent, +${receipt.boost.civic_xp} Civic XP${receipt.replayed ? ' (receipt replayed)' : ''}.`
          : <>{presentationBuild ? 'Demo ballot recorded. +25 demo Civic XP and +1 demo Civic stamp in the separate test database only' : receipt.participation ? 'Ballot recorded. +25 Civic XP and +1 Civic stamp earned (not a Passport Stamp)' : 'Ballot updated'}{receipt.replayed ? ' (receipt replayed)' : ''}; 0 points cost.</>}</p>}
        {voteError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{voteError}</p>}
      </div>
      <ol className="grid gap-3 lg:grid-cols-2" aria-label="Contenders">{detail.standings.map((item, index) => { const mine = ballot?.candidate_id === item.candidate_id; const leading = leaderId === item.candidate_id; return <li key={item.candidate_id} id={`choice-candidate-${item.candidate_id}`}
        className={`relative overflow-hidden rounded-2xl border-2 bg-white transition-shadow hover:shadow-md ${mine ? 'border-[#2D6A4F]' : leading ? 'border-amber-300 shadow-[0_0_0_4px_rgba(252,211,77,0.25)]' : focusCandidateId === item.candidate_id ? 'border-[#FFB703] ring-2 ring-amber-200' : 'border-[#E3DFD5]'}`}>
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <RankMedal rank={index + 1} hidden={campaign.tally_hidden} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase text-[#837560]">{campaign.tally_hidden ? 'Candidate' : `#${index + 1}`} · {presentationBuild ? 'demo support' : 'community support'}</p>
            <h3 className="truncate text-base font-black leading-tight text-[#2C221E] sm:text-lg">{item.spot_name ?? item.spot_id}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {mine && <span className="inline-flex items-center gap-1 rounded-full bg-[#2D6A4F] px-2 py-0.5 text-[10px] font-black uppercase text-white"><Check className="h-3 w-3" aria-hidden="true" />Your pick</span>}
              {leading && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-amber-200 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900"><Crown className="h-3 w-3" aria-hidden="true" /> Leading the race</span>}
              {(item.prior_loss_streak ?? 0) > 0 && <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-900">🔥 Underdog: +{Math.min(2, item.prior_loss_streak ?? 0)} bonus perk{(item.prior_loss_streak ?? 0) > 1 ? 's' : ''} unlocked</span>}
            </div>
            {weekly && <ShareBar votes={item.votes} total={totalVotes} leading={leading} compact />}
          </div>
          {canVote && user && !mine && <button type="button" onClick={event => { returnFocusRef.current=event.currentTarget; setVoteError(''); setPending({candidateId:item.candidate_id,expectedVersion:ballot?.version ?? 0,key:uuid()}); }}
            aria-label={`${ballot ? 'Change vote' : 'Vote for this place'}: ${item.spot_name ?? 'destination'}`}
            className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-[#2D6A4F] to-[#40916C] px-3 text-sm font-black text-white shadow-md transition cursor-pointer hover:brightness-110 active:scale-95"><Zap className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" /><span>{ballot ? "Switch" : "Vote"}</span></button>}
        </div>
        <details className="group border-t border-[#EFEBE2]" open={focusCandidateId === item.candidate_id || undefined}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2 text-xs font-bold text-[#3F6653] hover:bg-[#FAF9F5] [&::-webkit-details-marker]:hidden">
            <span>Perks &amp; details{Array.isArray(item.manifesto_perks) && item.manifesto_perks.length ? ` · ${item.manifesto_perks.length} perks` : ''}</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="px-4 pb-4">
            <p className="text-sm text-[#514532]">{item.votes === null ? '🔒 Votes hidden in the final 24 hours' : <>{item.votes} {presentationBuild ? (item.votes === 1 ? 'demo ballot' : 'demo ballots') : campaign.policy_version === 'juanchoice-weekly-v1' ? (item.votes === 1 ? 'vote' : 'votes') : (item.votes === 1 ? 'ballot' : 'ballots')}{campaign.policy_version === 'juanchoice-weekly-v1' && item.voter_count != null ? ` from ${item.voter_count} ${item.voter_count === 1 ? 'traveler' : 'travelers'}` : ''} · popularity, not a visitor rating</>}</p>
            <PerkPills perks={item.manifesto_perks} />
            <div className="mt-3 flex flex-wrap gap-2">{item.spot_id && <Link href={appRoutes.spot(item.spot_id)} className="rounded-lg border border-[#E3DFD5] px-3.5 py-1.5 text-xs font-semibold text-[#3F6653]">View place</Link>}<Link href={appRoutes.choiceCandidate(campaign.id, item.candidate_id)} className="rounded-lg border border-[#E3DFD5] px-3.5 py-1.5 text-xs font-semibold text-[#3F6653]">Share</Link></div>
          </div>
        </details>
      </li>; })}</ol>
      {detail.standings.length === 0 && <p className="rounded-2xl bg-white p-6 text-[#514532]">No eligible destinations are listed for this round.</p>}
      {detail.result && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-[#582F0E]">{presentationBuild ? `Presentation demo result: ${detail.result.valid_ballots} demo ballots recorded in the separate test database. This rehearsal does not count toward official destination rankings or rewards.` : `Final result: ${detail.result.valid_ballots} valid ballots. ${detail.result.co_winner_ids.length === 0 ? 'No winner was declared.' : detail.result.co_winner_ids.length > 1 ? 'The round ended in a tie; all co-winners are preserved.' : 'One destination topped the community vote. Spotlight placement still requires a separate safety review.'}`}</p>}
    </section>}
    {overview?.previous && <section className="rounded-2xl border border-[#E3DFD5] bg-white p-5 sm:p-6" aria-labelledby="previous-results-heading">
      <p className="text-xs font-bold uppercase tracking-wide text-[#7D5800]">{overview.previous.period_label}</p>
      <h2 id="previous-results-heading" className="mt-1 text-xl font-black text-[#2C221E]">{presentationBuild ? 'Previous demo results' : 'Previous results'}</h2>
      <p className="mt-2 text-sm text-[#514532]">{presentationBuild ? `Presentation demo: ${overview.previous.valid_ballots} demo ballots in test database. Not official rankings.` : `${overview.previous.valid_ballots} valid ${overview.previous.valid_ballots === 1 ? 'ballot' : 'ballots'} · ${overview.previous.co_winner_ids.length === 0 ? 'No winner this round' : overview.previous.co_winner_ids.length > 1 ? 'Co-winners' : 'Community winner'}. Community support is popularity, not a visitor rating.`}</p>
      <ol className="mt-4 space-y-3">{overview.previous.standings.map((item, index) => {
        const previous = overview.previous!;
        const champion = previous.co_winner_ids.includes(item.candidate_id);
        const minister = previous.minister_candidate_id === item.candidate_id;
        const total = previous.standings.reduce((sum, row) => sum + (row.votes ?? 0), 0);
        return <li key={item.candidate_id} className={`flex items-center gap-3 rounded-xl p-3 text-sm text-[#514532] ${champion ? 'bg-gradient-to-r from-amber-50 to-white ring-1 ring-amber-200' : minister ? 'bg-emerald-50/60 ring-1 ring-emerald-100' : 'bg-[#FAF9F5]'}`}>
          <RankMedal rank={index + 1} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[#2C221E]">{champion ? '★ ' : ''}{item.spot_name ?? 'Destination unavailable'}
                {champion && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F6C344] to-[#E09F1F] px-2 py-0.5 align-middle text-[10px] font-black uppercase text-[#4A2E00]"><Crown className="h-3 w-3" aria-hidden="true" />Champion</span>}
                {minister && <span className="ml-2 rounded-full bg-[#2D6A4F] px-2 py-0.5 align-middle text-[10px] font-black uppercase text-white">Minister</span>}</span>
              <span className="tabular-nums">{item.votes} {item.votes===1?'vote':'votes'}</span>
            </div>
            {total > 0 && item.votes !== null && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EFEBE2]" aria-hidden="true"><div className={`h-full rounded-full ${champion ? 'bg-amber-400' : 'bg-[#40916C]'}`} style={{ width: `${Math.round((item.votes / total) * 100)}%` }} /></div>}
          </div>
        </li>; })}</ol>
    </section>}
    {!loading && !error && !overview?.previous && campaign && <section className="rounded-2xl border border-[#E3DFD5] bg-white p-5 sm:p-6" aria-labelledby="previous-results-heading">
      <h2 id="previous-results-heading" className="text-xl font-black text-[#2C221E]">{presentationBuild ? 'Previous demo results' : 'Previous results'}</h2>
      <p className="mt-2 text-sm text-[#514532]">{presentationBuild
        ? 'No previous demo rounds in this isolated test database.'
        : overview?.notice?.code === 'RESULTS_PENDING'
          ? 'Voting has closed. Results are being finalized.'
          : 'Our first round is underway. Results will appear after voting ends and the result is finalized.'}</p>
    </section>}
    {pending && <div role="dialog" aria-modal="true" aria-labelledby="vote-confirm-title" onKeyDown={event => { if (event.key === 'Escape' && !submitting) setPending(null); if (event.key === 'Tab') { if (event.shiftKey && document.activeElement === confirmRef.current) { event.preventDefault(); cancelRef.current?.focus(); } else if (!event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); confirmRef.current?.focus(); } } }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="vote-confirm-title" className="text-xl font-black text-[#2C221E]">{pending.targetWeight ? 'Confirm your boost' : 'Confirm your JuanChoice ballot'}</h2><p className="mt-3 text-sm text-[#514532]">{pending.targetWeight ? `Spend ${pending.cost ?? 0} points so your vote for ${detail?.standings.find(item => item.candidate_id === pending.candidateId)?.spot_name ?? 'this destination'} counts ${pending.targetWeight}x? Boosts cannot be refunded this round, but they move with your vote if you switch. Points are in-app only; no money is involved.` : <>Vote for {detail?.standings.find(item => item.candidate_id === pending.candidateId)?.spot_name ?? 'this destination'}? This is free.</>} {presentationBuild ? 'This is a presentation demo: the ballot and participation XP/stamp stay in the separate test database and do not count officially.' : 'Your participation reward is the same regardless of the result.'}</p><div className="mt-5 flex flex-wrap gap-3"><button ref={confirmRef} type="button" onClick={() => void submitVote()} disabled={submitting} className="rounded-lg bg-[#3F6653] px-5 py-3 font-bold text-white disabled:opacity-60">{submitting ? 'Recording…' : voteError ? 'Retry same vote' : 'Confirm vote'}</button><button ref={cancelRef} type="button" disabled={submitting} onClick={() => setPending(null)} className="rounded-lg border border-[#E3DFD5] px-5 py-3 font-semibold text-[#514532]">Cancel</button></div></div></div>}
  </div></Navigation>;
}
