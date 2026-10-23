'use client';
import React from 'react';
const sizes={xs:'w-7 h-7',sm:'w-9 h-9',md:'w-14 h-14',lg:'w-20 h-20',xl:'w-28 h-28'};
export function CosmeticAvatar({src,name,frame,size='md'}:{src?:string|null;name:string;frame?:any;size?:keyof typeof sizes}) {
 const asset=frame?.asset; const colors=asset?.colors||[]; const animated=Boolean(asset?.animated);
 return <span className={`relative inline-flex rounded-full ${sizes[size]} shrink-0`} aria-label={frame?`${frame.id} avatar frame`:`${name} avatar`}>
   {frame&&<span aria-hidden="true" className={`absolute -inset-1 rounded-full ${animated?'cosmetic-ring-pulse':''}`} style={{border:`${asset.width||3}px solid ${colors[0]||'#ffd166'}`,boxShadow:colors[1]?`0 0 0 2px ${colors[1]}`:undefined}}/>}
   {src?<img src={src} alt="" className="relative h-full w-full rounded-full object-cover bg-stone-100"/>:<span aria-hidden="true" className="relative flex h-full w-full items-center justify-center rounded-full bg-emerald-50 font-black text-emerald-800">{name.slice(0,1).toUpperCase()}</span>}
 </span>;
}
