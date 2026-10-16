'use client';

import React, { useState } from 'react';
import { Compass } from 'lucide-react';

const TRAIL_PREFERENCES = ['Scenic route', 'Local food stops', 'Quieter alternatives'] as const;

export const TrailPreviewCard: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="space-y-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#2D6A4F]">
          <Compass className="h-3.5 w-3.5" />
          <span>The Trail</span>
        </span>
        <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#7D5800]">
          In development
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-[#514532]">
        A personalized multi-stop Trail to this destination is not available yet. Tell us what you would prefer —
        nothing is routed or promised today.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TRAIL_PREFERENCES.map((preference) => {
          const isSelected = selected.includes(preference);
          return (
            <button
              key={preference}
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                setSelected((current) =>
                  current.includes(preference)
                    ? current.filter((item) => item !== preference)
                    : [...current, preference]
                )
              }
              className={`min-h-[32px] rounded-full border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                isSelected
                  ? 'border-[#2D6A4F] bg-emerald-100 text-[#2D6A4F]'
                  : 'border-emerald-200 bg-white text-[#514532] hover:bg-emerald-50'
              }`}
            >
              {preference}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-[#837560]">
        Preferences stay on this screen only; they are not sent anywhere yet.
      </p>
    </div>
  );
};
