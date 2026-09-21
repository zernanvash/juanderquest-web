'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { effectiveJuanChoiceStatus, getJuanChoiceCampaign, listJuanChoiceCampaigns, JuanChoiceDetail } from '@/lib/juanchoice';

export function JuanChoiceRail() {
  const [detail, setDetail] = useState<JuanChoiceDetail | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const campaigns = await listJuanChoiceCampaigns(controller.signal);
        const active = campaigns.find(campaign => effectiveJuanChoiceStatus(campaign) === 'voting');
        const next = active ? await getJuanChoiceCampaign(active.id, controller.signal) : null;
        if (!controller.signal.aborted) setDetail(next);
      } catch { if (!controller.signal.aborted) setDetail(null); }
    };
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);
  return <section className="rounded-2xl border border-[#E3DFD5] bg-white p-4 shadow-xs space-y-3" aria-label="JuanChoice community spotlight">
    <p className="text-[10px] font-black uppercase tracking-wider text-[#B45309]">JuanChoice · free community vote</p>
    {detail ? <><h3 className="text-sm font-black text-[#582F0E]">{detail.campaign.theme}</h3>
      <ol className="space-y-2">{detail.standings.slice(0,3).map((item,index)=><li key={item.candidate_id} className="rounded-xl bg-[#FAF9F5] p-2 text-xs text-[#2C221E]">#{index+1} {item.spot_name??item.spot_id} <span className="font-bold text-[#2D6A4F]">· {item.votes} votes</span></li>)}</ol>
      <Link href={`/choice/${detail.campaign.id}`} className="flex min-h-[40px] items-center justify-center rounded-xl bg-[#3F6653] px-3 text-xs font-bold text-white">View round</Link></>
      : <><h3 className="text-sm font-black text-[#582F0E]">No active round</h3><p className="text-xs text-[#514532]">No live ballot or sample ranking is available right now.</p><Link href="/choice" className="text-xs font-bold text-[#3F6653] underline">About JuanChoice</Link></>}
  </section>;
}
