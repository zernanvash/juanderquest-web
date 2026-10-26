import React from 'react';
import { Bot, MessageSquare } from 'lucide-react';

interface HostLineBarProps {
  hostName?: string;
  line: string;
}

export function HostLineBar({ hostName = 'Apo Lakay', line }: HostLineBarProps) {
  return (
    <div
      className="relative flex items-start gap-3 bg-gradient-to-r from-amber-950/70 via-zinc-900/90 to-amber-950/70 border border-amber-500/30 rounded-xl p-3 sm:p-4 shadow-md shadow-amber-950/20"
      role="region"
      aria-label="Quiz Show Host Line"
    >
      <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
        <Bot className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-400">
            {hostName}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-amber-500/60" />
            Host Booth
          </span>
        </div>
        {/* ARIA live region for screen readers */}
        <p
          className="text-sm sm:text-base text-zinc-200 font-medium leading-relaxed font-sans"
          aria-live="polite"
          aria-atomic="true"
        >
          {line || 'Listen closely to the question, traveler...'}
        </p>
      </div>
    </div>
  );
}
