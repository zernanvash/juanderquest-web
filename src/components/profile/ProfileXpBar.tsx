'use client';

import React, { useRef } from 'react';
import { Award } from 'lucide-react';
import { formatXp } from '@/lib/copy';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/animations/gsap';

interface ProfileXpBarProps {
  level: number;
  label?: string;
  xp: number;
  xpUnit?: string;
  progressPercent: number;
}

export const ProfileXpBar: React.FC<ProfileXpBarProps> = ({
  level,
  label = 'Explorer',
  xp,
  xpUnit,
  progressPercent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const visualWidth = Math.max(6, Math.min(100, progressPercent));
  const realPercent = Math.round(Math.max(0, Math.min(100, progressPercent)));

  useGSAP(
    () => {
      if (!barRef.current) return;
      const reduced = prefersReducedMotion();
      if (reduced) {
        gsap.set(barRef.current, { width: `${visualWidth}%` });
        return;
      }

      gsap.fromTo(
        barRef.current,
        { width: '0%' },
        {
          width: `${visualWidth}%`,
          duration: 0.9,
          ease: 'power2.out',
        }
      );
    },
    { scope: containerRef, dependencies: [] }
  );

  return (
    <div
      ref={containerRef}
      className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] min-w-[220px] space-y-1.5 shrink-0"
    >
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="flex items-center gap-1 text-[#582F0E]">
          <Award className="w-3.5 h-3.5 text-[#FFB703]" />
          <span>
            Level {level} {label}
          </span>
        </span>
        <span className="text-[11px] text-[#2D6A4F] font-black">
          {xpUnit ? `${xp} ${xpUnit}` : formatXp(xp)}
        </span>
      </div>
      <div className="w-full bg-[#E3DFD5]/70 h-1.5 rounded-full overflow-hidden">
        <div
          ref={barRef}
          role="progressbar"
          aria-label="Level progress"
          aria-valuenow={realPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="bg-gradient-to-r from-[#2D6A4F] to-[#40916C] h-1.5 rounded-full"
          style={{ width: `${visualWidth}%` }}
        />
      </div>
    </div>
  );
};
