import React from 'react';
import { MessageCircle } from 'lucide-react';

interface HostLineBarProps {
  hostName?: string;
  line: string;
}

export function HostLineBar({ hostName = 'Apo Lakay', line }: HostLineBarProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-[#E3DFD5] bg-[#FAF9F5] p-3"
      role="region"
      aria-label="Quiz host"
    >
      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
        <MessageCircle className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-black text-[#2C221E] block">{hostName}</span>
        {/* ARIA live region for screen readers */}
        <p className="text-xs sm:text-sm text-[#5C4F3F] leading-relaxed" aria-live="polite" aria-atomic="true">
          {line || 'Listen closely to the question, traveler...'}
        </p>
      </div>
    </div>
  );
}
