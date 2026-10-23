'use client';
import React from 'react';
export function DisplayName({name,title,nameColor,className=''}:{name:string;title?:any;nameColor?:any;className?:string}) {
 return <span className={className}><span style={{color:nameColor?.asset?.color}}>{name}</span>{title?.asset?.text&&<span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[.75em] font-bold text-amber-800">{title.asset.text}</span>}</span>;
}
