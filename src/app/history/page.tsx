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
              <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">Submissions &amp; Proof History</h1>
              <p className="text-xs text-[#514532]">Track status of submitted AR quest proof verifications.</p>
            </div>
            <button
              onClick={() => fetchSubmissions(true)}
              className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-extrabold transition cursor-pointer active:scale-95 shadow-xs"
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
            <div className="bg-white p-8 rounded-2xl border border-red-200 text-center text-xs text-[#BC4749] space-y-4 shadow-xs">
              <p className="font-bold">{error}</p>
              <button
                onClick={() => fetchSubmissions(true)}
                className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-extrabold"
              >
                Retry
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560] shadow-xs">
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
                  className="bg-white rounded-2xl border border-[#D5C4AC]/40 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#837560]">ID: {sub.id}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isRejected
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold font-serif text-[#582F0E]">
                      {sub.questTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#514532]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#3F6653]" />
                        {sub.capturedLat.toFixed(6)}, {sub.capturedLng.toFixed(6)}
                      </span>
                      <span>•</span>
                      <span>{sub.category.replace('_', ' ')}</span>
                      {sub.rewardPoints > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#7D5800] font-bold">+{sub.rewardPoints} PTS</span>
                        </>
                      )}
                    </div>

                    {sub.rejectionReason && (
                      <div className="text-xs text-red-600 font-medium">Reason: {sub.rejectionReason}</div>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="text-xs text-[#837560] flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {new Date(sub.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {sub.reviewedAt && (
                      <div className="text-[10px] text-[#837560]/70">
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
