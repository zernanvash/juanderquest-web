'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Check, Clock3, Coins, Loader2, LockKeyhole, MapPin, Navigation2, Sparkles } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { TrailRouteMap } from '@/components/trails/TrailRouteMap';
import { triggerCelebration } from '@/components/CelebrationEffects';
import { useAuth } from '@/lib/auth';
import { checkInTrailStop, fetchTrail, unlockTrail, type TrailDetail } from '@/lib/trails-api';

function mins(value: number) { return value < 60 ? `${value} min` : `${Math.floor(value / 60)} hr${Math.floor(value / 60) === 1 ? '' : 's'}${value % 60 ? ` ${value % 60} min` : ''}`; }
function getApiError(error: unknown) {
  const issue = error as { message?: unknown; response?: { data?: { error?: { code?: unknown; message?: unknown } } } };
  return { code: typeof issue?.response?.data?.error?.code === 'string' ? issue.response.data.error.code : '',
    message: typeof issue?.response?.data?.error?.message === 'string' ? issue.response.data.error.message : typeof issue?.message === 'string' ? issue.message : '' };
}

export function TrailDetailClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [trail, setTrail] = useState<TrailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(searchParams.get('created') === '1' ? 'Your personal route is ready. Stops are selected from published destinations.' : '');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setTrail(await fetchTrail(params.id)); }
    catch (err: unknown) { setError(getApiError(err).message || 'This trail could not be loaded.'); }
    finally { setLoading(false); }
  }, [params.id]);
  useEffect(() => {
    let active=true;
    void fetchTrail(params.id).then(result=>{if(active)setTrail(result);})
      .catch(err=>{if(active)setError(getApiError(err).message||'This trail could not be loaded.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  }, [params.id]);

  const handleUnlock = async () => {
    if (!trail) return;
    if (!user) { router.push(`/login?redirect=${encodeURIComponent(`/trails/${trail.id}`)}`); return; }
    setBusy(true); setError(''); setNotice('');
    try { await unlockTrail(trail.id); await Promise.all([load(), refreshProfile()]); setNotice('Trail unlocked. Your stops and check-in progress are now available.'); }
    catch (err: unknown) {
      const {code,message}=getApiError(err);
      setError(code === 'INSUFFICIENT_POINTS' ? 'Not enough points to unlock this route. Complete quests and come back.'
        : code === 'RULE_NOT_MET' ? 'Your account does not meet this route’s level or badge requirement yet.'
          : code === 'NOT_AVAILABLE' ? 'This trail is not within its availability window.'
            : message || 'Unlock failed. Please try again.');
    } finally { setBusy(false); }
  };

  const handleCheckIn = (position: number) => {
    if (!trail) return;
    if (!navigator.geolocation) { setError('Location is not available in this browser. Use the mobile app at the destination.'); return; }
    setBusy(true); setError('');
    navigator.geolocation.getCurrentPosition(async location => {
      try {
        const result = await checkInTrailStop(trail.id, position, { lat: location.coords.latitude, lng: location.coords.longitude, accuracy_m: location.coords.accuracy });
        await load();
        if (result.completion) { triggerCelebration({ type: 'poppers', particleCount: 45, playAudio: false }); setNotice(`Trail complete! ${result.completion.reward_points} off-chain points were awarded.`); await refreshProfile(); }
        else setNotice('Check-in verified. Your progress is saved.');
      } catch (err: unknown) {
        const {code,message}=getApiError(err);
        setError(code === 'TOO_FAR_FROM_STOP' ? 'You are outside the check-in radius. Move closer to the destination.'
          : code === 'LOCATION_ACCURACY_TOO_LOW' ? 'GPS accuracy is too low. Wait for a clearer location fix and retry.'
            : message || 'Check-in could not be verified.');
      } finally { setBusy(false); }
    }, () => { setBusy(false); setError('Location permission was unavailable. Allow location access when you are at the stop.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  if (loading) return <Navigation><main id="main-content" className="mx-auto max-w-5xl px-4 py-10"><div className="h-72 animate-pulse rounded-3xl bg-stone-200"/><div className="mt-5 h-8 w-1/2 animate-pulse rounded bg-stone-200"/></main></Navigation>;
  if (!trail) return <Navigation><main id="main-content" className="mx-auto max-w-3xl px-4 py-16 text-center"><AlertCircle className="mx-auto text-rose-700"/><h1 className="mt-4 text-2xl font-black">Trail unavailable</h1><p className="mt-2 text-stone-600">{error || 'This route may have been retired or is not available to your account.'}</p><Link href="/trails" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 font-bold text-white"><ArrowLeft size={16}/>Browse trails</Link></main></Navigation>;

  const stops = trail.is_unlocked ? trail.stops ?? [] : [];
  const checked = stops.filter(stop => stop.checked_in).length;
  const complete = stops.length > 0 && checked === stops.length;
  const cost = trail.unlock_rule.type === 'points' ? `${trail.unlock_rule.price_points ?? 0} points` : trail.unlock_rule.type === 'level' ? `Level ${trail.unlock_rule.min_level ?? 5}+` : 'Free';
  const hasRouteEstimate = trail.total_km > 0 && trail.total_minutes >= Math.max(1, trail.stop_count) * 45;

  return <Navigation><main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <Link href="/trails" className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-bold text-stone-600 hover:text-emerald-800"><ArrowLeft size={16}/>All trails</Link>
    {notice && <div role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{notice}</div>}
    {error && <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}
    <header className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">{trail.tier} route · {trail.municipalities.join(' · ') || 'Pangasinan'}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950 sm:text-5xl">{trail.title}</h1><p className="mt-3 max-w-3xl text-base text-stone-600">{trail.tagline || trail.theme}</p>{trail.is_unlocked && trail.story?.intro && <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-700">{trail.story.intro}</p>}</div>
      {!trail.is_unlocked && <button onClick={() => void handleUnlock()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-3 font-black text-white disabled:opacity-60">{busy ? <Loader2 size={17} className="animate-spin"/> : trail.unlock_rule.type === 'points' ? <Coins size={17}/> : <LockKeyhole size={17}/>}Unlock · {cost}</button>}
    </header>
    <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-stone-600"><span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-2"><MapPin size={15}/>{trail.stop_count} stops</span>{hasRouteEstimate ? <><span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-2"><Clock3 size={15}/>{mins(trail.total_minutes)} estimated</span><span className="rounded-full bg-stone-100 px-3 py-2">{trail.total_km} km estimated</span></> : <span className="rounded-full bg-stone-100 px-3 py-2">Route estimate unavailable</span>}</div>

    {trail.is_unlocked ? <>
      <section className="mt-7" aria-label="Route map"><TrailRouteMap stops={stops}/><p className="mt-2 text-xs text-stone-500">Route line connects the ordered stops. Travel time and distance are estimates; follow posted signs and local conditions.</p></section>
      <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-black text-stone-900">Your stops</h2><p className="mt-1 text-sm text-stone-600">Check in when you are physically at each destination.</p></div><span className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">{checked}/{stops.length} verified</span></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-emerald-700 transition-[width] duration-500 motion-reduce:transition-none" style={{width:`${stops.length ? checked/stops.length*100 : 0}%`}}/></div>
        <ol className="mt-5 space-y-3">{stops.map(stop => <li key={stop.position} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-black ${stop.checked_in ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'}`}>{stop.checked_in ? <Check size={18}/> : stop.position}</span><div className="min-w-0 flex-1"><h3 className="font-black text-stone-900">{stop.name}</h3><p className="mt-1 text-xs font-semibold text-stone-500">{stop.municipality} · {stop.category} · {hasRouteEstimate ? `${mins(stop.arrive_offset_min)} into route · ${stop.leg_minutes} min estimated travel` : 'Timing estimate unavailable'}</p>{stop.narration && <p className="mt-2 text-sm leading-5 text-stone-700">{stop.narration}</p>}</div>{stop.checked_in ? <span className="text-sm font-bold text-emerald-800">Verified {stop.distance_m !== undefined ? `· ${stop.distance_m} m` : ''}</span> : <button onClick={() => handleCheckIn(stop.position)} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-black text-white disabled:opacity-60"><Navigation2 size={16}/>{busy ? 'Checking…' : 'Check in'}</button>}</li>)}</ol>
      </section>
      {complete && <section role="status" className="mt-7 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white"><Sparkles/><h2 className="mt-2 text-2xl font-black">Route complete!</h2><p className="mt-1">Your verified journey is recorded. Rewards are prototype off-chain points only.</p></section>}
    </> : <section className="relative mt-7 overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-br from-[#dfe9df] via-[#ecede6] to-[#d6e5e5] p-6 sm:p-10" aria-label="Locked trail preview"><div className="pointer-events-none absolute inset-0 opacity-40 blur-sm" aria-hidden="true"><div className="absolute left-[12%] top-[22%] h-24 w-24 rounded-full border-4 border-emerald-700"/><div className="absolute left-[45%] top-[39%] h-20 w-20 rounded-full border-4 border-teal-700"/><div className="absolute right-[13%] top-[18%] h-28 w-28 rounded-full border-4 border-lime-700"/><div className="absolute left-[20%] top-1/2 h-2 w-3/5 rotate-12 bg-emerald-700"/></div><div className="relative mx-auto max-w-xl rounded-2xl bg-white/90 p-6 text-center shadow-lg backdrop-blur"><LockKeyhole className="mx-auto text-emerald-800"/><h2 className="mt-3 text-xl font-black text-stone-900">A route of {trail.stop_count} mystery stops</h2><p className="mt-2 text-sm leading-6 text-stone-600">Unlock to reveal the destinations, route, and local stories. Hidden stop names and locations stay private until then.</p><button onClick={() => void handleUnlock()} disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-black text-white disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin"/> : <LockKeyhole size={16}/>}Unlock · {cost}</button></div></section>}
    <p className="mt-8 text-center text-xs text-stone-500">Location is used only to verify check-in and is not shown publicly. Keep location permission enabled only while checking in.</p>
  </main></Navigation>;
}
