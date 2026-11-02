import React, { useState } from 'react';
import { useGamification } from '@/lib/gamification';
import { PassportModal } from '@/components/PassportModal';

interface GamificationProfileCardProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export function GamificationProfileCard({
  className = '',
  variant = 'full',
}: GamificationProfileCardProps) {
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const {
    xp,
    streakDays,
    tasks,
    currentTier,
    progressPercent,
    nextLevelRemainingXp,
  } = useGamification();

  return (
    <>
      <div
        className={`bg-[#1B3F2B] text-white rounded-3xl p-5 sm:p-6 border-2 border-[#2B5E40] shadow-md space-y-4 relative overflow-hidden ${className}`}
      >
        {/* Subtle decorative background texture */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FAF9F5_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

        {/* Header Row: Level, Title & Passport Trigger Button */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl sm:text-3xl shrink-0 p-1.5 rounded-2xl bg-[#142E1F] border border-[#2B5E40] shadow-2xs">
              {currentTier.badgeIcon}
            </span>
            <div className="min-w-0">
              <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider block leading-none">
                LEVEL {currentTier.level}
              </span>
              <h3 className="text-base sm:text-lg font-black text-white truncate drop-shadow-xs">
                {currentTier.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPassportOpen(true)}
            title="Open Explorer Passport & Stamps"
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-900 font-black text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-300"
          >
            <span className="text-sm">📖</span>
            <span>Passport</span>
          </button>
        </div>

        {/* XP Progress Section */}
        <div className="relative z-10 space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold text-emerald-200">
            <span className="text-sm font-black text-emerald-300">{xp} XP</span>
            <span className="text-[11px] text-emerald-200/90 font-medium">
              {nextLevelRemainingXp > 0
                ? `${nextLevelRemainingXp} XP to Lv.${currentTier.level + 1}`
                : 'Archipelago Legend (Max Rank)'}
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-[#142E1F] p-0.5 border border-[#244E36] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Daily Punchcard Checklist */}
        <div className="relative z-10 pt-3 border-t border-[#265337] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-emerald-300 uppercase tracking-wider text-[10.5px]">
              Daily Punchcard
            </span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-[11px]">
              🔥 {streakDays}d Streak
            </span>
          </div>

          <div className="flex items-center gap-2 font-bold">
            {tasks.map((task) => (
              <span
                key={task.id}
                title={`${task.title}: ${task.completed ? 'Completed' : 'Pending (+'+task.xpReward+' XP)'}`}
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs border transition-all ${
                  task.completed
                    ? 'bg-amber-400 text-stone-900 border-amber-300 shadow-xs font-black'
                    : 'bg-[#142E1F] text-emerald-400/50 border-[#2B5E40]'
                }`}
              >
                {task.completed ? '✓' : task.icon}
              </span>
            ))}
          </div>
        </div>

        {/* Tier Perk Banner (Full variant) */}
        {variant === 'full' && (
          <div className="relative z-10 p-3 rounded-2xl bg-[#142E1F]/90 border border-[#2B5E40] text-xs flex items-start gap-2">
            <span className="text-amber-400 text-sm shrink-0">🎁</span>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-amber-300/90 tracking-wider block">
                Active Tier Perk
              </span>
              <p className="text-emerald-100/95 font-medium text-[11.5px] leading-snug">
                {currentTier.perk}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Explorer Passport Booklet Modal */}
      <PassportModal isOpen={isPassportOpen} onClose={() => setIsPassportOpen(false)} />
    </>
  );
}
