'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, normalizeSubmission, SubmissionModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Skeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { History, CheckCircle2, XCircle, Clock, MapPin } from 'lucide-react';

export default function HistoryPage() {
  const { isReady } = useRequireAuth();
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: rawSubmissions } = await fetchWithCache(
        'user_submissions',
        async () => {
          const res = await api.get('/submissions');
          if (!res.data?.success) throw new Error('Submissions unavailable');
          return (res.data.data as Parameters<typeof normalizeSubmission>[0][]).map(normalizeSubmission);
        },
        { ttlMs: 60_000, forceRefresh }
      );
      setSubmissions(rawSubmissions);
    } catch {
      setError('Could not reach the quest server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  if (!isReady) return null;

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Submission History">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--color-brand-brown)]">Submissions &amp; Proof History</h1>
              <p className="text-xs text-[var(--color-text-secondary)]">Track status of submitted AR quest proof verifications.</p>
            </div>
            <button
              onClick={() => fetchSubmissions(true)}
              className="theme-btn-primary"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading submissions">
              <Skeleton className="w-full h-28 rounded-2xl" />
              <Skeleton className="w-full h-28 rounded-2xl" />
              <Skeleton className="w-full h-28 rounded-2xl" />
            </div>
          ) : error ? (
            <div className="theme-card p-8 border-red-200 text-center text-xs text-[#BC4749] space-y-4 shadow-xs">
              <p className="font-bold">{error}</p>
              <button
                onClick={() => fetchSubmissions(true)}
                className="theme-btn-primary"
              >
                Retry
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="theme-card p-8 text-center text-xs text-[var(--color-text-muted)] shadow-xs">
              No proof submissions found. Complete a quest to earn reward points.
            </div>
          ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const isApproved = sub.status === 'approved';
              const isRejected = sub.status === 'rejected';

              return (
                <div
                  key={sub.id}
                  className="theme-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-muted)]">ID: {sub.id}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          isApproved
                            ? 'bg-emerald-100 text-[var(--color-brand-primary)]'
                            : isRejected
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-[var(--color-brand-accent-dark)]'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--color-brand-brown)]">
                      {sub.questTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                        {sub.capturedLat.toFixed(6)}, {sub.capturedLng.toFixed(6)}
                      </span>
                      <span>•</span>
                      <span>{sub.category.replace('_', ' ')}</span>
                      {sub.rewardPoints > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[var(--color-brand-accent-dark)] font-bold">+{sub.rewardPoints} PTS</span>
                        </>
                      )}
                    </div>

                    {sub.rejectionReason && (
                      <div className="text-xs text-red-600 font-medium">Reason: {sub.rejectionReason}</div>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {new Date(sub.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {sub.reviewedAt && (
                      <div className="text-[10px] text-[var(--color-text-muted)]/70">
                        reviewed {new Date(sub.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </ErrorBoundary>
    </Navigation>
  );
}
