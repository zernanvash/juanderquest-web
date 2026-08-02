'use client';

import React, { useState, useEffect } from 'react';
import { api, normalizeSubmission, SubmissionModel } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { History, CheckCircle2, XCircle, Clock, MapPin, Loader2 } from 'lucide-react';

export default function HistoryPage() {
  const { isReady } = useRequireAuth();
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/submissions');
      if (res.data?.success) {
        setSubmissions((res.data.data as Parameters<typeof normalizeSubmission>[0][]).map(normalizeSubmission));
      } else {
        setError('Your submission history is unavailable right now.');
      }
    } catch (e) {
      setError('Could not reach the quest server.');
    }
    setLoading(false);
  };

  if (!isReady) return null;

  return (
    <Navigation>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">Submissions & Proof History</h1>
            <p className="text-xs text-[#514532]">Track status of submitted AR quest proof verifications.</p>
          </div>
          <button
            onClick={fetchSubmissions}
            className="px-4 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-extrabold"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#837560]">
            <Loader2 className="w-8 h-8 animate-spin text-[#3F6653] mb-2" />
            <span className="text-xs font-medium">Loading submission history...</span>
          </div>
        ) : error ? (
          <div className="bg-white p-8 rounded-2xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560] space-y-4">
            <p>{error}</p>
            <button
              onClick={fetchSubmissions}
              className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-extrabold"
            >
              Retry
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560]">
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
    </Navigation>
  );
}
