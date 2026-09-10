'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff } from 'lucide-react';

export function EvaluatorBanner() {
  const { previewStatus, isPreviewActive, togglePreview } = useAuth();
  
  // Do not render banner when evaluator preview is off
  if (previewStatus === 'off') {
    return null;
  }

  const messages = {
    off: 'Evaluator preview is off. Public destinations are shown.',
    checking: 'Checking evaluator access… Public browsing remains available.',
    active: 'Evaluator preview active: synthetic public fixtures are included.',
    sign_in_required: 'Sign in with an authorized admin or QA account to preview test data.',
    forbidden: 'This account does not have evaluator access. Ask the project owner for access.',
    unavailable: 'Evaluator access could not be checked. Public browsing is still available; please retry.',
  };
  return (
    <aside aria-label="Evaluator Preview Mode" className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-50 px-4 py-2 text-xs text-amber-950">
      <p role="status" className="flex min-w-0 flex-1 items-center gap-2"><Eye aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{messages[previewStatus]}</span></p>
      <div className="flex flex-wrap items-center gap-2">
        {previewStatus === 'sign_in_required' && <Link className="rounded-lg border border-amber-800 px-3 py-3 font-semibold" href="/login?app_view=true&preview=true&redirect=%2Fexplore%3Fpreview%3Dtrue">Sign in as evaluator</Link>}
        <button type="button" onClick={togglePreview} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-amber-800/40 px-3 py-2 font-semibold">
          {isPreviewActive && <EyeOff aria-hidden="true" className="h-4 w-4" />}
          {isPreviewActive ? 'Exit preview' : previewStatus === 'checking' ? 'Cancel check' : 'Check evaluator access'}
        </button>
      </div>
    </aside>
  );
}
