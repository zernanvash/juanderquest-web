'use client';

import React, { useState, useEffect } from 'react';
import { subscribeXpNotifications, type XpNotification } from '@/lib/gamification';
import { Sparkles, Trophy } from 'lucide-react';

export function GamificationToast() {
  const [toasts, setToasts] = useState<XpNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeXpNotifications((notif) => {
      setToasts((prev) => [...prev, notif]);

      // Auto dismiss after 3.8s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== notif.id));
      }, 3800);
    });

    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto transform transition-all duration-300 animate-in fade-in slide-in-from-top-4 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border-2 ${
            toast.isLevelUp
              ? 'bg-gradient-to-r from-[#FFB703] via-[#FB8500] to-[#E76F51] text-[#241A08] border-[#FFF3B0]'
              : 'bg-[#1B3F2B] text-[#FAF7F0] border-[#3B724F]'
          }`}
        >
          {toast.isLevelUp ? (
            <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shrink-0 shadow-md">
              <Trophy className="w-5 h-5 text-[#E76F51] animate-bounce" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#2E6B47] flex items-center justify-center shrink-0 border border-emerald-400/40">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider uppercase text-amber-300 drop-shadow-xs">
                {toast.isLevelUp ? '🎉 LEVEL UP!' : `+${toast.amount} XP`}
              </span>
              {toast.isLevelUp && (
                <span className="text-[11px] font-bold text-stone-900 bg-white/80 px-2 py-0.2 rounded-full">
                  {toast.newLevelTitle}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold leading-tight text-white/95">
              {toast.reason}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
