'use client';
import React from 'react';
export function ProfileBanner({ asset, children, className='' }: {asset?:any;children?:React.ReactNode;className?:string}) {
  const colors=Array.isArray(asset?.colors)?asset.colors:['#3f6653','#95d5b2'];
  const angle=Number.isInteger(asset?.angle)?asset.angle:135;
  const pattern=asset?.pattern||'none';
  const mark=pattern==='waves'?'〰':pattern==='islands'?'⌁':pattern==='sun'?'☼':pattern==='capiz'?'◇':pattern==='bamboo'?'╱':'';
  return <div aria-label="Profile banner" className={`relative overflow-hidden ${className}`} style={{background:`linear-gradient(${angle}deg,${colors.join(',')})`}}>
    {mark&&<span aria-hidden="true" className="pointer-events-none absolute right-3 top-0 select-none text-white/10 text-7xl font-black">{mark}</span>}{children}
  </div>;
}
