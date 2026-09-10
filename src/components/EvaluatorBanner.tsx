'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, Key, X } from 'lucide-react';

export const EvaluatorBanner: React.FC = () => {
  const { isPreviewActive, togglePreview, previewPasskey, setPreviewPasskey, user } = useAuth();
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [inputPasskey, setInputPasskey] = useState(previewPasskey || '');

  if (!isPreviewActive) {
    return (
      <>
        {showPasskeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Key className="h-5 w-5 text-amber-500" />
                  <span>Evaluator Preview Passkey</span>
                </div>
                <button
                  onClick={() => setShowPasskeyModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Enter the evaluator passkey to unlock the 72 synthetic Pangasinan destinations, quests, and test submissions without an admin login.
              </p>
              <input
                type="text"
                placeholder="e.g. juanderquest-test-evaluator-token"
                value={inputPasskey}
                onChange={(e) => setInputPasskey(e.target.value)}
                className="mb-4 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasskeyModal(false);
                  }}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPasskey(inputPasskey.trim() || null);
                    setShowPasskeyModal(false);
                    if (!isPreviewActive) togglePreview();
                  }}
                  className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600"
                >
                  Activate Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <aside
      aria-label="Evaluator Preview Mode"
      className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs backdrop-blur-md"
    >
      <div className="flex items-center gap-2 overflow-hidden text-amber-900 dark:text-amber-200">
        <Eye className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="truncate font-medium">
          <strong className="font-semibold">Evaluator Preview Mode Active:</strong> Displaying 72 Pangasinan synthetic QA fixtures alongside live spots.
        </span>
        {user?.role === 'admin' && (
          <span className="hidden rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 sm:inline">
            Admin Web View
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setShowPasskeyModal(true)}
          title="Configure Passkey"
          className="rounded-lg p-1 text-amber-700 hover:bg-amber-200/50 dark:text-amber-300 dark:hover:bg-amber-900/40"
        >
          <Key className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={togglePreview}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-600/40 bg-amber-600/20 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-600/30 dark:text-amber-100 dark:hover:bg-amber-600/40"
        >
          <EyeOff className="h-3.5 w-3.5" />
          <span>Exit Preview</span>
        </button>
      </div>
    </aside>
  );
};
