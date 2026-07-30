'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, QuestModel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import {
  MapPin,
  Award,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ScanLine,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.id as string;

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
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-[#7D5800] hover:text-[#582F0E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quest Feed</span>
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#837560]">
            <Loader2 className="w-10 h-10 animate-spin text-[#2D6A4F] mb-3" />
            <span className="text-xs font-bold text-[#582F0E]">Loading quest details...</span>
          </div>
        ) : !quest ? (
          <div className="bg-white p-8 rounded-3xl border border-[#D5C4AC]/40 text-center text-xs text-[#837560]">
            Quest details not found.
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#D5C4AC]/40 p-8 shadow-md space-y-6 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-extrabold uppercase px-3.5 py-1 rounded-xl bg-[#FAF9F5] text-[#837560] border border-[#D5C4AC]/40">
                {quest.category.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-1.5 text-white font-extrabold text-xs gold-gradient px-4 py-1.5 rounded-xl shadow-sm">
                <Award className="w-4 h-4" />
                <span>+{quest.reward_points} REWARD POINTS</span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-black font-serif text-[#582F0E] mb-3">
                {quest.title}
              </h1>
              <p className="text-sm text-[#514532] leading-relaxed">{quest.description}</p>
            </div>

            {/* Quest Coordinates & Radar Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-[#FAF9F5] border border-[#D5C4AC]/50 text-xs">
              <div>
                <span className="text-[#837560] block mb-1 font-semibold">Target Coordinates</span>
                <span className="font-extrabold text-[#582F0E] flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-[#2D6A4F]" />
                  {quest.target_lat}, {quest.target_lng}
                </span>
              </div>
              <div>
                <span className="text-[#837560] block mb-1 font-semibold">GPS Radius</span>
                <span className="font-extrabold text-[#582F0E]">{quest.radius_meters} meters</span>
              </div>
              <div>
                <span className="text-[#837560] block mb-1 font-semibold">Target Marker Code</span>
                <code className="font-mono font-black text-[#7D5800] bg-amber-100 px-2 py-0.5 rounded">
                  {quest.target_marker_id}
                </code>
              </div>
            </div>

            {/* Launch AR Radar Button */}
            <button
              onClick={() => {
                setArModalOpen(true);
                handleSimulateArScan();
              }}
              className="w-full inline-flex items-center justify-center gap-3 emerald-gradient text-white font-black py-4 px-6 rounded-2xl shadow-lg hover:scale-[1.01] transition transform text-sm"
            >
              <Camera className="w-5 h-5 text-[#FFB703]" />
              <span>Launch AR Radar Scanner</span>
            </button>
          </div>
        )}

        {/* Futuristic AR Camera Radar Viewfinder Modal */}
        {arModalOpen && quest && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0D1B2A] text-white max-w-lg w-full rounded-3xl p-6 border border-white/20 shadow-2xl relative space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-[#FFB703] animate-pulse" />
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                    AR RADAR SCANNER ENGINE
                  </span>
                </div>
                <button
                  onClick={() => setArModalOpen(false)}
                  className="text-xs font-bold text-gray-400 hover:text-white px-3 py-1 bg-white/10 rounded-lg"
                >
                  Close
                </button>
              </div>

              {/* Viewfinder Radar Box */}
              <div className="h-64 rounded-2xl bg-black border-2 border-[#FFB703] relative flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                {/* Laser Scanning Line */}
                {arScanning && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FFB703] to-transparent animate-scan shadow-[0_0_15px_#FFB703]" />
                )}

                {arScanning ? (
                  <div className="space-y-3 relative z-10">
                    <Loader2 className="w-10 h-10 animate-spin text-[#FFB703] mx-auto" />
                    <div className="text-xs font-extrabold text-amber-200 tracking-wider">
                      SCANNING MARKER: {quest.target_marker_id}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      GPS Target Lock: [{quest.target_lat}, {quest.target_lng}]
                    </div>
                  </div>
                ) : arSuccess ? (
                  <div className="space-y-3 relative z-10 animate-float">
                    <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                    <div className="text-base font-black text-emerald-400">
                      Target Marker Verified!
                    </div>
                    <div className="text-xs text-gray-300">
                      GPS coordinates validated within {quest.radius_meters}m
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Press scan to evaluate AR marker</div>
                )}
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Verification Button */}
              {arSuccess && (
                <button
                  onClick={handleSubmitProof}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 gold-gradient text-[#582F0E] font-black py-4 px-6 rounded-2xl shadow-xl hover:scale-[1.02] transition text-sm"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Submit Proof to Backend</span>
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
