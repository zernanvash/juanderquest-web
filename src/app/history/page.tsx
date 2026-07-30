'use client';

import React, { useState, useEffect } from 'react';
import { api, SubmissionModel } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { History, CheckCircle2, XCircle, Clock, MapPin, Loader2 } from 'lucide-react';

export default function HistoryPage() {
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/submissions');
      if (res.data?.success && res.data.data.length > 0) {
        setSubmissions(res.data.data);
      } else {
        fallbackSubmissions();
      }
    } catch (e) {
      fallbackSubmissions();
    }
    setLoading(false);
  };

  const fallbackSubmissions = () => {
    setSubmissions([
      {
        id: 'sub_101',
        quest_id: 'quest_1',
        quest_title: 'Hundred Islands Eco-Adventure',
        user_id: 'user-1',
        status: 'approved',
        captured_lat: 16.2012,
        captured_lng: 120.0381,
        proof_type: 'ar',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'sub_102',
        quest_id: 'quest_2',
        quest_title: 'Manaoag Shrine Cultural Trail',
        user_id: 'user-1',
        status: 'pending',
        captured_lat: 16.0435,
        captured_lng: 120.4851,
        proof_type: 'ar',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
    ]);
  };

  return (
    <Navigation>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">Submissions & Proof History</h1>
          <p className="text-xs text-[#514532]">Track status of submitted AR quest proof verifications.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#837560]">
            <Loader2 className="w-8 h-8 animate-spin text-[#3F6653] mb-2" />
            <span className="text-xs font-medium">Loading submission history...</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560]">
            No proof submissions found.
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const isApproved = sub.status === 'approved';
              const isRejected = sub.status === 'rejected';

              return (
                <div
                  key={sub.id.toString()}
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
                      {sub.quest_title || `Quest ID: ${sub.quest_id}`}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-[#514532]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#3F6653]" />
                        {sub.captured_lat}, {sub.captured_lng}
                      </span>
                      <span>•</span>
                      <span>Type: {sub.proof_type.toUpperCase()}</span>
                    </div>

                    {sub.rejection_reason && (
                      <div className="text-xs text-red-600 font-medium">Reason: {sub.rejection_reason}</div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs text-[#837560]">
                      {new Date(sub.created_at.toString()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
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
