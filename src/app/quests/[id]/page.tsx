'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, QuestModel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import {
  Compass,
  MapPin,
  Award,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ScanLine,
} from 'lucide-react';

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.id as string;
  const { user } = useAuth();

  const [quest, setQuest] = useState<QuestModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [arModalOpen, setArModalOpen] = useState(false);
  const [arScanning, setArScanning] = useState(false);
  const [arSuccess, setArSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestDetail();
  }, [questId]);

  const fetchQuestDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quests/${questId}`);
      if (res.data?.success) {
        setQuest(res.data.data);
      }
    } catch (e) {
      console.error(e);
      // Prototype fallback
      setQuest({
        id: questId,
        title: 'Hundred Islands Eco-Adventure',
        description: 'Explore Governor’s Island view deck and coastal biodiversity in Alaminos City.',
        category: 'eco',
        target_lat: 16.2012,
        target_lng: 120.0381,
        radius_meters: 500,
        reward_points: 100,
        target_marker_id: 'MARKER_HUNDRED_ISLANDS',
      });
    }
    setLoading(false);
  };

  const handleSimulateArScan = () => {
    setArScanning(true);
    setArSuccess(false);
    setTimeout(() => {
      setArScanning(false);
      setArSuccess(true);
    }, 2500);
  };

  const handleSubmitProof = async () => {
    if (!quest) return;
    setSubmitting(true);
    setSubmitError(null);

    const idempotencyKey = `sub_${quest.id}_${Date.now()}`;

    try {
      const res = await api.post('/submissions', {
        quest_id: quest.id,
        captured_lat: quest.target_lat,
        captured_lng: quest.target_lng,
        proof_type: 'ar',
        idempotency_key: idempotencyKey,
      });

      if (res.data?.success) {
        setArModalOpen(false);
        router.push('/history');
      } else {
        setSubmitError(res.data?.error?.message || 'Submission failed');
      }
    } catch (e: any) {
      setSubmitError(e.response?.data?.error?.message || 'Network error during submission.');
    }
    setSubmitting(false);
  };

  return (
    <Navigation>
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7D5800] hover:text-[#582F0E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quests</span>
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#837560]">
            <Loader2 className="w-8 h-8 animate-spin text-[#3F6653] mb-2" />
            <span className="text-xs font-medium">Loading quest detail...</span>
          </div>
        ) : !quest ? (
          <div className="bg-white p-8 rounded-2xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560]">
            Quest not found.
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#D5C4AC]/40 p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-md bg-[#EFEEEA] text-[#837560]">
                {quest.category.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-1.5 text-[#7D5800] text-sm font-extrabold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <Award className="w-4 h-4" />
                <span>+{quest.reward_points} REWARD POINTS</span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold font-serif text-[#582F0E] mb-2">
                {quest.title}
              </h1>
              <p className="text-sm text-[#514532] leading-relaxed">{quest.description}</p>
            </div>

            {/* Target Coordinates & Marker Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-[#FAF9F5] border border-[#D5C4AC]/50 text-xs">
              <div>
                <span className="text-[#837560] block mb-1">Target Coordinates</span>
                <span className="font-bold text-[#582F0E] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#3F6653]" />
                  {quest.target_lat}, {quest.target_lng}
                </span>
              </div>
              <div>
                <span className="text-[#837560] block mb-1">GPS Validation Radius</span>
                <span className="font-bold text-[#582F0E]">{quest.radius_meters} meters</span>
              </div>
              <div>
                <span className="text-[#837560] block mb-1">Target Marker Code</span>
                <code className="font-mono font-bold text-[#7D5800] bg-amber-100 px-1.5 py-0.5 rounded">
                  {quest.target_marker_id}
                </code>
              </div>
            </div>

            {/* Launch Simulated AR Button */}
            <button
              onClick={() => {
                setArModalOpen(true);
                handleSimulateArScan();
              }}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-extrabold py-4 px-6 rounded-2xl shadow-md transition text-sm"
            >
              <Camera className="w-5 h-5 text-[#FFB703]" />
              <span>Launch Simulated AR Marker Scanner</span>
            </button>
          </div>
        )}

        {/* Simulated AR Camera Modal */}
        {arModalOpen && quest && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0D1B2A] text-white max-w-lg w-full rounded-3xl p-6 border border-white/20 shadow-2xl relative space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-[#FFB703] animate-pulse" />
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                    SIMULATED AR CAMERA ENGINE
                  </span>
                </div>
                <button
                  onClick={() => setArModalOpen(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 bg-white/10 rounded-lg"
                >
                  Close
                </button>
              </div>

              {/* Viewfinder Area */}
              <div className="h-64 rounded-2xl bg-black border-2 border-dashed border-[#FFB703]/60 relative flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                {arScanning ? (
                  <div className="space-y-3">
                    <Loader2 className="w-10 h-10 animate-spin text-[#FFB703] mx-auto" />
                    <div className="text-xs font-bold text-amber-200">
                      Scanning target marker: {quest.target_marker_id}...
                    </div>
                    <div className="text-[10px] text-gray-400">Capturing GPS coordinates ({quest.target_lat}, {quest.target_lng})</div>
                  </div>
                ) : arSuccess ? (
                  <div className="space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-[#2D6A4F] mx-auto animate-bounce" />
                    <div className="text-sm font-extrabold text-emerald-400">
                      AR Marker Verified!
                    </div>
                    <div className="text-xs text-gray-300">
                      Target: {quest.title} • GPS within {quest.radius_meters}m
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Press scan to evaluate AR marker</div>
                )}
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Verification Button */}
              {arSuccess && (
                <button
                  onClick={handleSubmitProof}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-[#FFB703] hover:bg-amber-400 text-[#582F0E] font-extrabold py-3.5 px-6 rounded-xl shadow-md transition text-sm"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Submit Verification Proof to Backend</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Navigation>
  );
}
