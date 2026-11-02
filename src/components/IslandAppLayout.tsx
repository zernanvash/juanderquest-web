'use client';

import React, { useState } from 'react';
import { Quicksand } from 'next/font/google';
import { CozySidebar } from './CozySidebar';
import { GamificationToast } from './GamificationToast';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-quicksand',
});

export function IslandAppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('juander_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  return (
    <div
      className={`min-h-screen bg-[#F4EFE6] text-[#2D3A2F] flex flex-col antialiased selection:bg-[#5B8E67] selection:text-white ${quicksand.className} ${quicksand.variable}`}
      style={{
        fontFamily:
          '"Quicksand", var(--font-quicksand), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* MAIN CONTAINER: SIDEBAR + CONTENT AREA */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto flex flex-col md:flex-row gap-6 p-3 sm:p-5 lg:p-7 min-h-0">
        <CozySidebar
          isSidebarCollapsed={isSidebarCollapsed}
          onSidebarCollapsedChange={setIsSidebarCollapsed}
        />
        <main
          className="flex-1 flex flex-col gap-6 min-w-0"
          style={{ '--profile-max-width': '1280px' } as React.CSSProperties}
        >
          {children}
        </main>
        <GamificationToast />
      </div>
    </div>
  );
}
