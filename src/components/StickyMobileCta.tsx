'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function StickyMobileCta() {
  const pathname = usePathname();
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  if (pathname !== '/' && pathname !== '/about') return null;

  return (
    <aside
      aria-label="Quick actions"
      className="fixed bottom-0 left-0 right-0 z-50 flex gap-2 border-t border-[#D5C4AC] bg-white/95 p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur md:hidden"
    >
      <Link
        data-analytics-label="sticky_explore"
        href="/explore"
        className="flex-1 rounded-xl bg-[#2D6A4F] px-3 py-3 text-center text-sm font-black text-white active:scale-98 transition"
      >
        Explore Destinations
      </Link>
      {isIOS ? (
        <Link
          data-analytics-label="sticky_map"
          href="/map"
          className="flex-1 rounded-xl border border-[#2D6A4F] px-3 py-3 text-center text-sm font-black text-[#2D6A4F] active:scale-98 transition"
        >
          View Live Map
        </Link>
      ) : (
        <a
          data-analytics-label="sticky_download"
          href="/download/juanderquest-latest.apk"
          className="flex-1 rounded-xl border border-[#2D6A4F] px-3 py-3 text-center text-sm font-black text-[#2D6A4F] active:scale-98 transition"
        >
          Get Android App
        </a>
      )}
    </aside>
  );
}
