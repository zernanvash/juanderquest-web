'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, LockKeyhole, MapPin, Sparkles, Clock3, Coins, Loader2, Route, WandSparkles } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import { createPersonalTrail, fetchTrails, unlockTrail, type PersonalTrailAllowance, type TrailCatalogItem } from '@/lib/trails-api';

type Tab = 'discover' | 'mine' | 'create';
const THEME_CHIPS = ['beach', 'heritage', 'food', 'nature', 'family-friendly'];
const TOWN_CHIPS = ['Bolinao', 'Dagupan City', 'Alaminos City', 'Lingayen', 'Manaoag'];
const tierClass: Record<string, string> = {
  starter: 'border-stone-200 bg-stone-50', explorer: 'border-sky-200 bg-sky-50',
  signature: 'border-violet-200 bg-violet-50', legendary: 'border-amber-300 bg-amber-50',
  personal: 'border-emerald-200 bg-emerald-50',
};
const tierColor: Record<string, string> = { starter: 'text-stone-600', explorer: 'text-sky-700', signature: 'text-violet-700', legendary: 'text-amber-700', personal: 'text-emerald-700' };

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60), mins = minutes % 60;
  return [hours ? `${hours} hr${hours === 1 ? '' : 's'}` : '', mins ? `${mins} min` : ''].filter(Boolean).join(' ');
}
function unlockCost(trail: TrailCatalogItem) {
  if (trail.tier === 'personal') return 'Yours';
  if (trail.unlock_rule.type === 'points') return `${trail.unlock_rule.price_points ?? 0} points`;
  if (trail.unlock_rule.type === 'level') return `Level ${trail.unlock_rule.min_level ?? 5}+`;
  return 'Free';
}
function getApiError(error: unknown) {
  const issue = error as { message?: unknown; response?: { data?: { error?: { code?: unknown; message?: unknown } } } };
  return { code: typeof issue?.response?.data?.error?.code === 'string' ? issue.response.data.error.code : '',
    message: typeof issue?.response?.data?.error?.message === 'string' ? issue.response.data.error.message : typeof issue?.message === 'string' ? issue.message : '' };
}

export function TrailsClient() {
  const { user, isLoading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('discover');
  const [trails, setTrails] = useState<TrailCatalogItem[]>([]);
  const [personalGeneration, setPersonalGeneration] = useState<PersonalTrailAllowance|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyTrail, setBusyTrail] = useState('');
  const [text, setText] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const [hours, setHours] = useState(4);
  const [pace, setPace] = useState<'relaxed' | 'balanced' | 'packed'>('balanced');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result=await fetchTrails();setTrails(result.items);setPersonalGeneration(result.personalGeneration); }
    catch (err) { setError(err instanceof Error ? err.message : 'Trails are unavailable right now.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active=true;
    void fetchTrails().then(result=>{if(active){setTrails(result.items);setPersonalGeneration(result.personalGeneration);}})
      .catch(err=>{if(active)setError(err instanceof Error?err.message:'Trails are unavailable right now.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  }, []);

  const visible = useMemo(() => tab === 'mine' ? trails.filter(trail => trail.is_unlocked) : trails, [tab, trails]);
  const toggle = (items: string[], setItems: (values: string[]) => void, item: string) => setItems(items.includes(item) ? items.filter(value => value !== item) : [...items, item]);

  const handleUnlock = async (trail: TrailCatalogItem) => {
    if (!user) { router.push(`/login?next=${encodeURIComponent(`/trails/${trail.id}`)}`); return; }
    setBusyTrail(trail.id); setError('');
    try { await unlockTrail(trail.id); await Promise.all([load(), refreshProfile()]); }
    catch (err: unknown) {
      const {code,message}=getApiError(err);
      setError(code === 'INSUFFICIENT_POINTS' ? 'Not enough points yet. Earn points through quests and try again.'
        : code === 'RULE_NOT_MET' ? 'Your account has not met this trail’s unlock requirement yet.'
          : code === 'NOT_AVAILABLE' ? 'This trail is outside its availability window.'
            : message || 'Could not unlock this trail. Please try again.');
    } finally { setBusyTrail(''); }
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) { router.push(`/login?next=${encodeURIComponent('/trails?tab=create')}`); return; }
    if (!text.trim() && !themes.length && !towns.length) { setError('Describe your trip or choose a theme or town first.'); return; }
    setGenerating(true); setError('');
    try {
      const result = await createPersonalTrail({ text: text.trim() || undefined, themes, municipalities: towns, budget_min: hours * 60, pace });
      await refreshProfile();
      router.push(`/trails/${result.trail.id}?created=1`);
    } catch (err: unknown) {
      const {code,message}=getApiError(err);
      setError(code === 'INSUFFICIENT_POINTS' ? 'You’ve used this week’s free trail and need more points for another one.'
        : message || 'We could not build a feasible trail from those preferences. Try a longer day or another town.');
    } finally { setGenerating(false); }
  };

  return <Navigation>
    <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#173c30] px-6 py-8 text-white sm:px-10 sm:py-11">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-emerald-200"><Compass size={15} /> The Trail</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Take the scenic way.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85 sm:text-base">Unlock curated routes, check in at real places, or build a personal day out around what you love.</p>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-3 text-xs font-bold text-emerald-50/90">
          <span className="rounded-full bg-white/10 px-3 py-2">Off-chain points only</span><span className="rounded-full bg-white/10 px-3 py-2">Real-world check-ins</span><span className="rounded-full bg-white/10 px-3 py-2">No wallet required</span>
        </div>
      </header>

      <div className="mt-7 flex flex-wrap gap-2 border-b border-stone-200" role="tablist" aria-label="Trail sections">
        {([['discover','Discover'],['mine','My trails'],['create','Create your trail']] as const).map(([id,label]) =>
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(''); }} className={`rounded-t-xl px-4 py-3 text-sm font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${tab === id ? 'border-b-2 border-emerald-700 text-emerald-800' : 'text-stone-500 hover:text-stone-800'}`}>{label}</button>)}
      </div>

      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

      {tab === 'create' ? <form onSubmit={handleGenerate} className="mx-auto mt-7 max-w-3xl space-y-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">Personal route builder</p><h2 className="mt-2 text-2xl font-black text-stone-900">What kind of day do you want?</h2><p className="mt-2 text-sm text-stone-600">Your words help us shape preferences; the route is built only from published destinations in our catalog.</p></div>
        <label className="block text-sm font-bold text-stone-800">Describe your trip <span className="font-normal text-stone-500">(optional, up to 300 characters)</span><textarea value={text} onChange={event => setText(event.target.value.slice(0,300))} maxLength={300} rows={3} placeholder="A relaxed beach day with local food and no long drives" className="mt-2 w-full resize-y rounded-xl border border-stone-300 bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /><span className="mt-1 block text-right text-xs text-stone-500">{text.length}/300</span></label>
        <fieldset><legend className="text-sm font-bold text-stone-800">Choose themes</legend><div className="mt-2 flex flex-wrap gap-2">{THEME_CHIPS.map(chip => <button type="button" key={chip} aria-pressed={themes.includes(chip)} onClick={() => toggle(themes,setThemes,chip)} className={`rounded-full border px-3 py-2 text-sm font-bold capitalize ${themes.includes(chip) ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-stone-300 text-stone-600'}`}>{chip}</button>)}</div></fieldset>
        <fieldset><legend className="text-sm font-bold text-stone-800">Towns you’d like to explore</legend><div className="mt-2 flex flex-wrap gap-2">{TOWN_CHIPS.map(chip => <button type="button" key={chip} aria-pressed={towns.includes(chip)} onClick={() => toggle(towns,setTowns,chip)} className={`rounded-full border px-3 py-2 text-sm font-bold ${towns.includes(chip) ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-stone-300 text-stone-600'}`}>{chip}</button>)}</div></fieldset>
        <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold text-stone-800">Day length <span className="ml-2 rounded-full bg-stone-100 px-2 py-1">{hours} hours</span><input aria-label="Day length" type="range" min={2} max={10} step={1} value={hours} onChange={event => setHours(Number(event.target.value))} className="mt-4 w-full accent-emerald-700" /><span className="flex justify-between text-xs font-normal text-stone-500"><span>2 hours</span><span>10 hours</span></span></label>
          <label className="text-sm font-bold text-stone-800">Pace<select value={pace} onChange={event => setPace(event.target.value as typeof pace)} className="mt-2 block w-full rounded-xl border border-stone-300 bg-white px-3 py-3"><option value="relaxed">Relaxed · shorter drives</option><option value="balanced">Balanced</option><option value="packed">Packed · see more</option></select></label></div>
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-emerald-50 p-4 sm:flex-row sm:items-center"><p className="text-sm text-emerald-950">{!user?<strong>Sign in to see your weekly generation allowance.</strong>:personalGeneration?.free_remaining? <><strong>{personalGeneration.free_remaining} free personal trail{personalGeneration.free_remaining===1?'':'s'} left this Manila week.</strong> After that, another costs {personalGeneration.price_points} points.</> : <><strong>Your free weekly generation is used.</strong> Another personal trail costs {personalGeneration?.price_points??100} points.</>} Points stay off-chain.</p><button disabled={generating || authLoading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{generating ? <><Loader2 size={16} className="animate-spin" /> Optimizing route…</> : <><WandSparkles size={16} /> Generate trail</>}</button></div>
      </form> : <section className="mt-7" aria-live="polite">
        {tab === 'mine' && <div className="mb-5"><h2 className="text-2xl font-black text-stone-900">Your routes</h2><p className="mt-1 text-sm text-stone-600">Personal routes and trails you’ve unlocked.</p></div>}
        {loading ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0,1,2].map(key => <div key={key} className="h-64 animate-pulse rounded-3xl bg-stone-200" />)}</div>
          : visible.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.map(trail => <article key={trail.id} className={`overflow-hidden rounded-3xl border ${tierClass[trail.tier] ?? tierClass.starter} shadow-sm`}>
            <div className="relative h-36 overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-500 p-4">
              <div className="absolute inset-0 opacity-40" aria-hidden="true"><div className="absolute -left-8 top-8 h-28 w-28 rounded-full border border-white/60"/><div className="absolute left-14 top-2 h-36 w-36 rounded-full border border-white/40"/><div className="absolute right-5 top-12 h-20 w-20 rounded-full border border-white/40"/></div>
              <div className="relative flex h-full flex-col justify-between"><span className="w-fit rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-900">{trail.tier}</span><span className="flex gap-2 text-white/90" aria-hidden="true">{Array.from({length:Math.min(5,trail.stop_count)}).map((_,i)=><MapPin key={i} size={16} fill="currentColor" />)}</span></div>
            </div>
            <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black leading-tight text-stone-900">{trail.title}</h3>{!trail.is_unlocked && <LockKeyhole className="mt-1 shrink-0 text-stone-500" size={18}/>}</div><p className="mt-2 min-h-10 text-sm leading-5 text-stone-600">{trail.tagline || `A ${trail.theme} route through ${trail.municipalities.join(', ') || 'Pangasinan'}.`}</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-stone-600"><span className="inline-flex items-center gap-1"><MapPin size={14}/>{trail.stop_count} stops</span><span className="inline-flex items-center gap-1"><Clock3 size={14}/>{minutesLabel(trail.total_minutes)}</span><span className="inline-flex items-center gap-1"><Route size={14}/>{trail.municipalities.join(', ') || 'Pangasinan'}</span></div>
              {!trail.is_unlocked && <div className="mt-4 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-stone-600">Mystery stops <span className="ml-1 tracking-[.2em] text-stone-400">? · ? · ?</span></div>}
              <div className="mt-5 flex items-center justify-between gap-3">{trail.is_unlocked ? <Link href={`/trails/${trail.id}`} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-black text-white">Open trail <Compass size={15}/></Link> : <button onClick={() => void handleUnlock(trail)} disabled={busyTrail === trail.id || authLoading} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">{busyTrail === trail.id ? <Loader2 size={15} className="animate-spin"/> : <Coins size={15}/>}Unlock · {unlockCost(trail)}</button>}<span className={`text-[10px] font-black uppercase tracking-wider ${tierColor[trail.tier]}`}>{trail.tier === 'legendary' ? 'Limited' : trail.tier === 'signature' ? 'Signature' : trail.tier === 'personal' ? 'Personal' : 'Explore'}</span></div>
            </div></article>)}</div> : <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"><Sparkles size={28} className="mx-auto text-emerald-700"/><h2 className="mt-4 text-xl font-black text-stone-900">{tab === 'mine' ? 'Your first trail is waiting.' : 'New routes are on the way.'}</h2><p className="mx-auto mt-2 max-w-lg text-sm text-stone-600">{tab === 'mine' ? 'Unlock a curated route or create a personal itinerary for your next day out.' : 'There are no published routes in this area yet. Build a personal trail from available destinations.'}</p><button onClick={() => setTab('create')} className="mt-5 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white">Create your trail</button></div>}
      </section>}
      <p className="mt-8 text-center text-xs text-stone-500">Trail times and distances are route estimates. Check-in rewards are off-chain prototype points and do not represent tokens or cash.</p>
    </main>
  </Navigation>;
}
