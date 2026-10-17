'use client';

import { useCallback,useEffect,useMemo,useState } from 'react';
import Link from 'next/link';
import { Coins,Clock,HandCoins,LoaderCircle,ShieldCheck,Store } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import { acceptSponsorshipCounter,cancelFundingPlan,closeFundingPlan,contributeToFundingPlan,createFundingPlan,extendFundingPlan,getQuestFundingPlan,listSponsorDirectory,requestQuestSponsorship,submitFundingPlan,updateFundingPlan,type FundingPlanModel,type SponsorMerchant } from '@/lib/funding-api';

const localDateTime=(days:number)=>{const d=new Date(Date.now()+days*86_400_000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);};
const statusLabel=(status:string)=>status.replaceAll('_',' ');

export default function QuestFundingPage(){
  const {user,isLoading:authLoading}=useAuth();
  const [questId,setQuestId]=useState('');
  const [plan,setPlan]=useState<FundingPlanModel|null>(null);
  const [mode,setMode]=useState<'budget'|'window'>('budget');
  const [completions,setCompletions]=useState('10');
  const [startsAt,setStartsAt]=useState(localDateTime(0));
  const [endsAt,setEndsAt]=useState(localDateTime(14));
  const [points,setPoints]=useState('');
  const [sponsors,setSponsors]=useState<SponsorMerchant[]>([]);
  const [merchantId,setMerchantId]=useState('');
  const [sponsorPoints,setSponsorPoints]=useState('');
  const [sponsorVoucherId,setSponsorVoucherId]=useState('');
  const [sponsorVoucherQty,setSponsorVoucherQty]=useState('1');
  const [promo,setPromo]=useState(false);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  useEffect(()=>{setQuestId(new URLSearchParams(window.location.search).get('quest_id')??'');},[]);
  const reload=useCallback(async()=>{
    if(!questId)return;
    setLoading(true);setError('');
    try{const result=await getQuestFundingPlan(questId);setPlan(result.plan);if(result.plan){const directory=await listSponsorDirectory(questId);setSponsors(directory.items);}}
    catch(cause){setError(cause instanceof Error?cause.message:'Could not load this quest funding plan.');}
    finally{setLoading(false);}
  },[questId]);
  useEffect(()=>{if(questId)void reload();else setLoading(false);},[questId,reload]);

  const committed=useMemo(()=>plan?.contributions?.reduce((sum,row)=>sum+Number(row.committed_points),0)??0,[plan]);
  const remaining=useMemo(()=>plan?.contributions?.reduce((sum,row)=>sum+Number(row.remaining_points),0)??0,[plan]);
  const selectedSponsor=useMemo(()=>sponsors.find(row=>row.id===merchantId)??null,[sponsors,merchantId]);
  const mutate=async(action:()=>Promise<unknown>,success:string)=>{setBusy(true);setError('');setNotice('');try{await action();setNotice(success);await reload();}catch(cause){setError(cause instanceof Error?cause.message:'That funding action could not be completed.');}finally{setBusy(false);}};

  if(authLoading||loading)return <Navigation><main className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-[var(--color-text-muted)]"><LoaderCircle className="mx-auto mb-3 animate-spin"/>Loading Eco-Quest funding…</main></Navigation>;
  if(!user)return <Navigation><main className="mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-bold">Sign in to manage quest funding</h1><p className="mt-2 text-sm text-[var(--color-text-muted)]">Only the destination author can configure an Eco-Quest funding round.</p><Link className="mt-5 inline-flex rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-white" href="/login">Sign in</Link></main></Navigation>;
  if(!questId)return <Navigation><main className="mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-bold">Choose an Eco-Quest</h1><p className="mt-2 text-sm">Open this page from an Eco-Quest you authored to create or manage its funding round.</p><Link href="/quests" className="mt-5 inline-flex rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-white">Browse quests</Link></main></Navigation>;

  return <Navigation><main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-12">
    <header><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-brand-primary)]">Eco-Quest funding</p><h1 className="mt-2 text-3xl font-bold">Fund an Eco-Quest reward pool</h1><p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">Simulated demo points only. Funding is reserved from author and merchant point balances; approval pays the traveler from that pool. No fiat or blockchain transfer occurs.</p></header>
    {error&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</div>}{notice&&<div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}
    {!plan?<section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-bold">Set up this round</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Choose a reward pool size and active window. The fixed completion reward is configured on the quest (50, 75, or 100 points).</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Funding model<select value={mode} onChange={e=>setMode(e.target.value as 'budget'|'window')} className="mt-1 block w-full rounded-xl border p-3"><option value="budget">Fixed budget — lock points up front</option><option value="window">Open window — cap spending, reserve on start</option></select></label>
      <label className="text-sm font-semibold">Planned completions<input type="number" min="1" max="10000" value={completions} onChange={e=>setCompletions(e.target.value)} className="mt-1 block w-full rounded-xl border p-3"/></label>
      <label className="text-sm font-semibold">Starts at<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="mt-1 block w-full rounded-xl border p-3"/></label>
      <label className="text-sm font-semibold">Ends at<input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="mt-1 block w-full rounded-xl border p-3"/></label></div>
      <button disabled={busy} onClick={()=>void mutate(()=>createFundingPlan(questId,{mode,planned_completions:Number(completions),starts_at:new Date(startsAt).toISOString(),ends_at:new Date(endsAt).toISOString()}),'Draft funding plan created.')} className="mt-5 rounded-xl bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Create funding plan</button>
    </section>:<>
      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Round {plan.round_number} · {statusLabel(plan.status)}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">{plan.mode==='budget'?'Fixed budget':'Open spending window'} · ends {new Date(plan.ends_at).toLocaleString()}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">Simulated points</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">{[['Reward / completion',`${plan.reward_points} pts`],['Target',`${plan.target_points} pts`],['Committed',`${committed} pts`],['Uncommitted estimate',`${remaining} pts`]].map(([label,value])=><div key={label} className="rounded-xl bg-[var(--color-bg-subtle)] p-4"><span className="text-xs text-[var(--color-text-muted)]">{label}</span><p className="mt-1 font-bold">{value}</p></div>)}</div>
        {!!plan.contributions?.length&&<div className="mt-5 space-y-2"><h3 className="text-sm font-bold">Funding sources</h3>{plan.contributions.map(row=><div key={row.id} className="flex justify-between rounded-lg border p-3 text-sm"><span>{row.funder_kind==='author'?'Your contribution':'Merchant sponsor'}</span><span>{row.committed_points} committed · {row.held_points} held · {row.paid_reward_points+row.paid_fee_points} paid</span></div>)}</div>}
        {!!plan.holds?.length&&<div className="mt-5"><h3 className="text-sm font-bold">Live reward reservations</h3><p className="mt-1 text-xs text-[var(--color-text-muted)]">Traveler identities are not shown here. {plan.holds.filter(h=>h.status==='held').length} reservation(s) currently held.</p></div>}
        <div className="mt-5 flex flex-wrap gap-2">{['draft','pending_sponsors','active'].includes(plan.status)&&<><label className="sr-only" htmlFor="author-contribution">Add points</label><input id="author-contribution" inputMode="numeric" type="number" min="1" value={points} onChange={e=>setPoints(e.target.value)} placeholder="Points to contribute" className="w-48 rounded-xl border px-3 py-2 text-sm"/><button disabled={busy||!points} onClick={()=>void mutate(()=>contributeToFundingPlan(plan.id,Number(points)),'Contribution recorded from your demo-point balance.')} className="rounded-xl border px-4 py-2 text-sm font-bold"><Coins className="mr-1 inline" size={16}/>Contribute</button></>}
          {plan.status==='draft'&&<button disabled={busy} onClick={()=>void mutate(()=>submitFundingPlan(plan.id),'Funding plan submitted; sponsor matching is now open.')} className="rounded-xl bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-bold text-white">Submit plan</button>}
          {['pending_sponsors','scheduled'].includes(plan.status)&&<button disabled={busy} onClick={()=>void mutate(()=>cancelFundingPlan(plan.id),'Plan cancelled and any locked points refunded.')} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-800">Cancel round</button>}
          {['active','scheduled'].includes(plan.status)&&<><input aria-label="New end date" type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"/><button disabled={busy} onClick={()=>void mutate(()=>extendFundingPlan(plan.id,new Date(endsAt).toISOString()),'Funding window extended.')} className="rounded-xl border px-4 py-2 text-sm font-bold"><Clock className="mr-1 inline" size={15}/>Extend</button><button disabled={busy} onClick={()=>void mutate(()=>closeFundingPlan(plan.id),'Round closed; existing reward holds will still be honored.')} className="rounded-xl border px-4 py-2 text-sm font-bold">Close early</button></>}</div>
        {plan.status==='draft'&&<div className="mt-5 border-t pt-5"><h3 className="text-sm font-bold">Edit draft terms</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Funding model<select value={mode} onChange={e=>setMode(e.target.value as 'budget'|'window')} className="mt-1 block w-full rounded-xl border p-3"><option value="budget">Fixed budget</option><option value="window">Open spending window</option></select></label><label className="text-sm font-semibold">Planned completions<input type="number" min="1" max="10000" value={completions} onChange={e=>setCompletions(e.target.value)} className="mt-1 block w-full rounded-xl border p-3"/></label><label className="text-sm font-semibold">Starts at<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="mt-1 block w-full rounded-xl border p-3"/></label><label className="text-sm font-semibold">Ends at<input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="mt-1 block w-full rounded-xl border p-3"/></label></div><button disabled={busy||Number(completions)<1} onClick={()=>void mutate(()=>updateFundingPlan(plan.id,{mode,planned_completions:Number(completions),starts_at:new Date(startsAt).toISOString(),ends_at:new Date(endsAt).toISOString(),expected_version:plan.version}),'Draft terms saved.')} className="mt-3 rounded-xl border px-4 py-2 text-sm font-bold">Save draft terms</button></div>}
      </section>
      {['pending_sponsors','active'].includes(plan.status)&&<section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-bold"><Store className="mr-2 inline" size={19}/>Invite a merchant sponsor</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Funding is activated only once accepted point commitments meet the target. Merchant requests can be negotiated or declined.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]"><select value={merchantId} onChange={e=>{setMerchantId(e.target.value);setSponsorVoucherId('');}} className="rounded-xl border p-3"><option value="">Choose an active merchant</option>{sponsors.map(m=><option key={m.id} value={m.id}>{m.name}{m.same_municipality?' · nearby':''}</option>)}</select><input aria-label="Sponsor points requested" inputMode="numeric" type="number" min="0" value={sponsorPoints} onChange={e=>setSponsorPoints(e.target.value)} placeholder="Points" className="rounded-xl border p-3"/><button disabled={busy||!merchantId||(!Number(sponsorPoints)&&!promo&&!(sponsorVoucherId&&Number(sponsorVoucherQty)>0))} onClick={()=>void mutate(()=>requestQuestSponsorship(plan.id,merchantId,{points:Number(sponsorPoints||0),voucher_id:sponsorVoucherId||null,voucher_qty:sponsorVoucherId?Number(sponsorVoucherQty):0,promo,message:message||undefined}),'Sponsorship request sent.')} className="rounded-xl bg-[var(--color-brand-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><HandCoins className="mr-1 inline" size={16}/>Request</button></div>
        {selectedSponsor?.vouchers?.length?<div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]"><label className="text-sm font-semibold">Optional voucher perk<select value={sponsorVoucherId} onChange={e=>setSponsorVoucherId(e.target.value)} className="mt-1 block w-full rounded-xl border p-3"><option value="">No voucher request</option>{selectedSponsor.vouchers.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select></label>{sponsorVoucherId&&<label className="text-sm font-semibold">Per-completer quantity<input type="number" min="1" max="100000" value={sponsorVoucherQty} onChange={e=>setSponsorVoucherQty(e.target.value)} className="mt-1 block w-full rounded-xl border p-3"/></label>}</div>:merchantId&&<p className="mt-2 text-xs text-[var(--color-text-muted)]">This merchant has no active voucher available for sponsorship.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={promo} onChange={e=>setPromo(e.target.checked)}/>Ask for a sponsored-by placement</label><input value={message} onChange={e=>setMessage(e.target.value)} maxLength={500} placeholder="Optional message" className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"/></div>
        {!!plan.sponsorships?.length&&<div className="mt-5 space-y-2">{plan.sponsorships.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"><span>Merchant request · {statusLabel(s.status)} · {s.points} pts{s.voucher_qty>0?` · ${s.voucher_qty} voucher perk(s)`:''}{s.promo?' · promo placement':''}{s.status==='countered'?` · counter: ${s.counter_points??s.points} pts, ${s.counter_voucher_qty??0} vouchers`:''}</span><div className="flex gap-3">{s.status==='countered'&&<button disabled={busy} onClick={()=>void mutate(()=>acceptSponsorshipCounter(s.id,s.terms_version),'Merchant counter accepted.')} className="text-xs font-bold text-emerald-800 underline">Accept counter</button>}{['requested','countered'].includes(s.status)&&<button disabled={busy} onClick={()=>void mutate(()=>import('@/lib/funding-api').then(api=>api.withdrawQuestSponsorship(s.id)),'Request withdrawn.')} className="text-xs font-semibold text-red-800 underline">Withdraw request</button>}</div></div>)}</div>}
      </section>}
    </>}
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-700"><ShieldCheck size={16} className="mt-0.5 shrink-0"/><p>Funding terms are recorded for audit. A pending traveler review keeps its reward reserved; rejected proof may be resubmitted before the reservation expires.</p></div>
  </main></Navigation>;
}
