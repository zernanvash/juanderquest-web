'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, ShieldAlert, AlertTriangle, RotateCw, X, Lock } from 'lucide-react';

export function EvaluatorBanner() {
  const { previewStatus, isPreviewActive, togglePreview, dismissPreview } = useAuth();

  // Do not render banner when evaluator preview is off
  if (previewStatus === 'off') {
    return null;
  }

  const titles: Record<string, string> = {
    checking: 'Checking Evaluator Access…',
    active: 'Evaluator Preview Active',
    sign_in_required: 'Evaluator Sign-In Required',
    forbidden: 'Evaluator Access Restricted',
    unavailable: 'Evaluator Service Unavailable',
  };

  const messages: Record<string, string> = {
    off: 'Evaluator preview is off. Public destinations are shown.',
    checking: 'Checking evaluator access… Public browsing remains available.',
    active: 'Evaluator preview active: synthetic public fixtures are included.',
    sign_in_required: 'Sign in with an authorized admin or QA account to preview test data.',
    forbidden: 'This account does not have evaluator access. Public live Pangasinan data is shown.',
    unavailable: 'Evaluator access could not be checked. Public browsing remains active; please retry.',
  };

  const isForbiddenOrError = previewStatus === 'forbidden' || previewStatus === 'unavailable';

  return (
    <aside
      aria-label="Evaluator Preview Notification"
      className="fixed top-[72px] sm:top-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-lg pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200"
    >
      <div
        className={`rounded-2xl border backdrop-blur-md p-3 sm:p-3.5 shadow-xl flex items-start sm:items-center justify-between gap-3 text-xs ${
          isForbiddenOrError
            ? 'bg-amber-50/98 border-amber-300/90 text-amber-950 shadow-amber-900/10'
            : isPreviewActive
            ? 'bg-emerald-50/98 border-emerald-300 text-emerald-950 shadow-emerald-900/10'
            : 'bg-white/98 border-[#E3DFD5] text-[#582F0E] shadow-stone-900/10'
        }`}
      >
        {/* Left Status Icon */}
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 sm:mt-0 ${
              isForbiddenOrError
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : isPreviewActive
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-stone-100 border-stone-200 text-stone-700'
            }`}
          >
            {previewStatus === 'checking' ? (
              <RotateCw className="w-4 h-4 animate-spin text-amber-700" />
            ) : isForbiddenOrError ? (
              <ShieldAlert className="w-4 h-4 text-amber-800" />
            ) : previewStatus === 'sign_in_required' ? (
              <Lock className="w-4 h-4 text-amber-800" />
            ) : (
              <Eye className="w-4 h-4 text-emerald-800" />
            )}
          </div>

          {/* Text Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-amber-900/80">
              <span>{titles[previewStatus] || 'Evaluator Mode'}</span>
              {isPreviewActive && (
                <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase">
                  Active
                </span>
              )}
            </div>
            <p role="status" className="text-xs text-[#514532] leading-snug mt-0.5">
              {messages[previewStatus]}
            </p>
          </div>
        </div>

        {/* Right Actions & Dismiss */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
          {previewStatus === 'sign_in_required' && (
            <Link
              className="rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-2.5 py-1.5 font-bold text-xs transition shadow-xs active:scale-95"
              href="/login?app_view=true&preview=true&redirect=%2Fexplore%3Fpreview%3Dtrue"
            >
              Sign in
            </Link>
          )}

          {isPreviewActive && (
            <button
              type="button"
              onClick={togglePreview}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-700/30 bg-white/90 hover:bg-white px-2.5 py-1.5 font-bold text-xs text-emerald-900 transition shadow-2xs active:scale-95 cursor-pointer"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
          )}

          {isForbiddenOrError && (
            <button
              type="button"
              onClick={dismissPreview}
              className="rounded-xl bg-amber-100 hover:bg-amber-200/90 text-amber-900 px-2.5 py-1.5 font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              Dismiss
            </button>
          )}

          {/* Dismiss Icon Button */}
          <button
            type="button"
            onClick={dismissPreview}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition cursor-pointer"
            title="Dismiss notification"
            aria-label="Dismiss evaluator notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
