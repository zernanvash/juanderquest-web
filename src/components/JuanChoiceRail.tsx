'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getJuanChoiceCampaign, getJuanChoiceOverview, juanChoiceErrorCode, JuanChoiceDetail } from '@/lib/juanchoice';
import { appRoutes } from '@/lib/routes';
import { isJuanChoiceEnvironmentTrusted } from '@/lib/juanchoice-presentation';

const presentationBuild = process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE === 'true';

export function JuanChoiceRail() {
  const [detail, setDetail] = useState<JuanChoiceDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'disabled' | 'timeout' | 'rate-limited' | 'network' | 'unavailable'>('loading');
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const overview = await getJuanChoiceOverview(controller.signal);
        if (!isJuanChoiceEnvironmentTrusted(overview, presentationBuild)) {
          if (!controller.signal.aborted) { setDetail(null); setStatus('unavailable'); }
          return;
        }
        const next = overview.current ? await getJuanChoiceCampaign(overview.current.id, controller.signal) : null;
        if (!controller.signal.aborted) {
          setDetail(next);
          setStatus(next ? 'ready' : overview.availability.reason === 'FEATURE_DISABLED' ? 'disabled' : 'empty');
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setDetail(null);
          const code = juanChoiceErrorCode(error);
          setStatus(code === 'FEATURE_DISABLED' ? 'disabled'
            : code === 'TIMEOUT' ? 'timeout'
            : code === 'RATE_LIMITED' ? 'rate-limited'
            : code === 'NETWORK_ERROR' ? 'network'
            : 'unavailable');
        }
      }
    };
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  return <section className="rounded-2xl border border-[#E3DFD5] bg-white p-4 shadow-xs space-y-3" aria-label="JuanChoice community spotlight">
    {presentationBuild && <p className="rounded-lg bg-amber-100 p-2 text-xs font-bold text-amber-950">Presentation demo: these votes and standings are not official.</p>}
    <p className="text-[10px] font-black uppercase tracking-wider text-[#B45309]">JuanChoice · free community vote</p>
    {status === 'loading' ? <p role="status" className="text-xs text-[#514532]">Checking for a community vote...</p>
      : detail ? <><h3 className="text-sm font-black text-[#582F0E]">{detail.campaign.theme}</h3>
      <ol className="space-y-2">{detail.standings.slice(0,3).map((item,index)=><li key={item.candidate_id} className="rounded-xl bg-[#FAF9F5] p-2 text-xs text-[#2C221E]">#{index+1} {item.spot_name??item.spot_id} <span className="font-bold text-[#2D6A4F]">· {item.votes} votes</span></li>)}</ol>
      <Link href={appRoutes.choice(detail.campaign.id)} className="flex min-h-[40px] items-center justify-center rounded-xl bg-[#3F6653] px-3 text-xs font-bold text-white">View round</Link></>
      : status === 'disabled' ? <><h3 className="text-sm font-black text-[#582F0E]">Under development locally</h3><p role="status" className="text-xs text-[#514532]">JuanChoice voting is disabled in this setup. No live standings are shown.</p><Link href="/choice" className="text-xs font-bold text-[#3F6653] underline">About JuanChoice</Link></>
      : status === 'timeout' ? <p role="alert" className="text-xs text-[#514532]">JuanChoice is taking too long to respond. Please retry later.</p>
      : status === 'rate-limited' ? <p role="alert" className="text-xs text-[#514532]">Too many requests right now. Please wait before checking again.</p>
      : status === 'network' ? <p role="alert" className="text-xs text-[#514532]">You appear to be offline. JuanChoice standings will return when connected.</p>
      : status === 'unavailable' ? <><h3 className="text-sm font-black text-[#582F0E]">Could not load JuanChoice</h3><p role="alert" className="text-xs text-[#514532]">The vote service returned an error. Please try again later.</p><Link href="/choice" className="text-xs font-bold text-[#3F6653] underline">Open JuanChoice</Link></>
      : <><h3 className="text-sm font-black text-[#582F0E]">No active round</h3><p className="text-xs text-[#514532]">No live ballot is available right now.</p><Link href="/choice" className="text-xs font-bold text-[#3F6653] underline">About JuanChoice</Link></>}
  </section>;
}
