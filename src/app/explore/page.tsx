'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, LocateFixed, MapPin, Search, ShieldCheck, Sparkles, Trophy, Loader2, PlusCircle } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { api, normalizeSpot, SpotModel } from '@/lib/api';

const categories = [
  ['all','All'],['eat_drink','Eat & Drink'],['nature_outdoors','Nature'],['culture_heritage','Culture'],['activities_wellness','Activities'],['shopping_local','Local Finds'],['stay','Stay'],
];
const intents = ['coffee','local food','family','quiet','running','scenic','hidden gem'];

export default function ExplorePage(){
  const [spots,setSpots]=React.useState<SpotModel[]>([]);const [loading,setLoading]=React.useState(true);const [error,setError]=React.useState('');
  const [category,setCategory]=React.useState('all');const [intent,setIntent]=React.useState('');const [search,setSearch]=React.useState('');const [coords,setCoords]=React.useState<{lat:number;lng:number}|null>(null);
  const load=React.useCallback(async()=>{setLoading(true);setError('');try{const params:any={};if(category!=='all')params.categories=category;if(intent)params.intent=intent.replace(' ','_');if(search)params.q=search;if(coords){params.lat=coords.lat;params.lng=coords.lng;params.radius_km=50;}const res=await api.get('/spots',{params});setSpots(res.data.data.map(normalizeSpot));}catch{setError('Could not load destination spots.');}finally{setLoading(false);}},[category,intent,search,coords]);
  React.useEffect(()=>{load();},[load]);
  const nearMe=()=>navigator.geolocation?.getCurrentPosition(p=>setCoords({lat:p.coords.latitude,lng:p.coords.longitude}),()=>setError('Location is unavailable. Browse by category instead.'),{enableHighAccuracy:false,timeout:8000});
  return <Navigation><div className="max-w-6xl mx-auto space-y-7">
    <section className="rounded-3xl bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white p-7 md:p-10 relative overflow-hidden">
      <Sparkles className="absolute right-8 top-8 w-24 h-24 text-white/10"/>
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#FFB703]">Discover Pangasinan</p>
        <Link href="/spots/new" className="bg-[#48C71D] hover:bg-[#3FB418] text-white px-4 py-2 rounded-2xl font-black text-xs inline-flex items-center gap-1.5 shadow-md">
          <PlusCircle className="w-4 h-4" /> Add Spot
        </Link>
      </div>
      <h1 className="text-3xl md:text-5xl font-black font-serif mt-2">Where do you want to go today?</h1>
      <p className="text-sm text-emerald-50 mt-3 max-w-2xl">Local food, coffee, nature, heritage, sports, and hidden gems—recommended around what you feel like doing.</p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3"><label className="flex-1 bg-white rounded-2xl flex items-center px-4 text-[#582F0E]"><Search className="w-4 h-4"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search coffee, beaches, family spots..." className="w-full p-3 outline-none bg-transparent text-sm"/></label><button onClick={nearMe} className="bg-[#FFB703] text-[#582F0E] rounded-2xl px-5 py-3 font-black text-sm flex items-center justify-center gap-2"><LocateFixed className="w-4 h-4"/>{coords?'Near me on':'Use my location'}</button></div>
    </section>
    <div className="space-y-3"><p className="text-xs font-black uppercase text-[#7D5800]">What are you in the mood for?</p><div className="flex gap-2 overflow-x-auto pb-1">{intents.map(i=><button key={i} onClick={()=>setIntent(intent===i?'':i)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${intent===i?'bg-[#FFB703] text-[#582F0E]':'bg-white border border-[#D5C4AC] text-[#514532]'}`}>{i}</button>)}</div></div>
    <div className="flex gap-2 overflow-x-auto">{categories.map(([id,label])=><button key={id} onClick={()=>setCategory(id)} className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap ${category===id?'bg-[#2D6A4F] text-white':'bg-white border border-[#D5C4AC]/50 text-[#582F0E]'}`}>{label}</button>)}</div>
    {loading?<div className="py-24 grid place-items-center"><Loader2 className="animate-spin text-[#2D6A4F]"/></div>:error?<div className="p-8 bg-white rounded-2xl text-center text-[#BC4749]"><p>{error}</p><button onClick={load} className="mt-3 font-bold">Retry</button></div>:<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{spots.map(s=><Link href={`/spots/${s.slug}`} key={s.id} className="bg-white rounded-3xl border border-[#D5C4AC]/50 overflow-hidden shadow-sm hover:shadow-xl transition group"><div className="h-40 bg-gradient-to-br from-emerald-100 to-amber-100 relative">{s.imageUrl?<img src={s.imageUrl} alt="" className="w-full h-full object-cover"/>:<MapPin className="absolute inset-0 m-auto w-12 h-12 text-[#2D6A4F]/40"/>}<span className="absolute top-3 left-3 bg-white/90 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">{s.subcategory.replaceAll('_',' ')}</span>{s.questId&&<span className="absolute top-3 right-3 bg-[#FFB703] text-[#582F0E] px-2.5 py-1 rounded-full text-[10px] font-black flex gap-1"><Trophy className="w-3 h-3"/>Quest</span>}</div><div className="p-5 space-y-3"><div><h2 className="font-black font-serif text-lg text-[#582F0E] group-hover:text-[#2D6A4F]">{s.name}</h2><p className="text-xs text-[#837560] flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/>{s.municipality}{s.distanceKm!==undefined&&` • ${s.distanceKm.toFixed(1)} km`}</p></div><p className="text-xs text-[#514532] line-clamp-2">{s.description}</p><div className="flex flex-wrap gap-1.5">{s.recommendationReasons.slice(0,2).map(r=><span key={r} className="bg-emerald-50 text-[#2D6A4F] px-2 py-1 rounded-lg text-[10px] font-bold">{r}</span>)}</div><p className="text-[10px] text-[#837560] flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>{s.sourceName}</p></div></Link>)}</div>}
    {!loading&&!error&&spots.length===0&&<div className="p-12 text-center bg-white rounded-3xl"><Compass className="mx-auto text-[#D5C4AC]"/><p className="mt-2 text-sm">No spots match these filters yet.</p></div>}
  </div></Navigation>;
}
