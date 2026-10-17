import React from 'react';
import Link from 'next/link';
import { Bell, Smartphone, ArrowRight } from 'lucide-react';

export const AlertsCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs sm:text-sm font-black text-[var(--color-brand-brown)]">
            Get Plaza alerts on the Android app
          </h4>
          <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
            Know immediately when an explorer passes your rank or cheers your quest achievements.
          </p>
        </div>
      </div>

      <Link
        href="/download"
        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs inline-flex items-center gap-1.5 transition active:scale-95 shadow-xs shrink-0"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>Download app</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
