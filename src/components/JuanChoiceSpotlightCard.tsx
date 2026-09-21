'use client';

import Link from 'next/link';
import type { JuanChoiceSpotlight } from '@/lib/juanchoice';

export function JuanChoiceSpotlightCard({ spotlight }: { spotlight: JuanChoiceSpotlight }) {
  return <article className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm" aria-label="JuanChoice community spotlight">
    <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">JuanChoice spotlight · community-selected</p>
    <h2 className="mt-2 text-xl font-black text-[#582F0E]">{spotlight.theme}</h2>
    <p className="mt-2 text-xs leading-relaxed text-[#514532]">Selected from {spotlight.valid_ballots} finalized valid {spotlight.valid_ballots === 1 ? 'ballot' : 'ballots'}. This is a promotional community spotlight, not a traveler rating or paid ad.</p>
    <div className="mt-3 flex flex-wrap gap-2">{spotlight.winners.map(winner => <Link key={winner.candidate_id} href={`/spots/${winner.spot_slug}`} className="min-h-[44px] rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-bold text-[#3F6653]">{winner.spot_name} · {winner.municipality}</Link>)}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#675B49]"><span>Featured through <time dateTime={spotlight.expires_at}>{new Date(spotlight.expires_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' })}</time></span><Link href={`/choice/${spotlight.campaign_id}`} className="font-bold text-[#3F6653] underline">See final results</Link></div>
  </article>;
}
