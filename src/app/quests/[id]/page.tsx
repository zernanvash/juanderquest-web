'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, buildSubmissionPayload, normalizeQuest, QuestModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Skeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  MapPin,
  Award,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ScanLine,
  LocateFixed,
} from 'lucide-react';

interface GpsFix {
  lat: number;
  lng: number;
  accuracy: number;
}

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.id as string;
  const { user } = useAuth();
  const { isReady } = useRequireAuth();

  const [quest, setQuest] = useState<QuestModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arModalOpen, setArModalOpen] = useState(false);
  const [arScanning, setArScanning] = useState(false);
  const [arSuccess, setArSuccess] = useState(false);
  const [gps, setGps] = useState<GpsFix | null>(null);
  const [gpsState, setGpsState] = useState<'idle' | 'acquiring' | 'ready' | 'denied'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const fetchQuestDetail = useCallback(async (forceRefresh = false) => {
    if (!questId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rawQuest } = await fetchWithCache(
        `quest_detail_${questId}`,
        async () => {
          const res = await api.get(`/quests/${questId}`);
          if (!res.data?.success) throw new Error('Quest not found');
          return normalizeQuest(res.data.data);
        },
        { ttlMs: 120_000, forceRefresh }
      );
      setQuest(rawQuest);
    } catch {
      setError('Could not reach the quest server.');
    } finally {
      setLoading(false);
    }
  }, [questId]);

  useEffect(() => {
    fetchQuestDetail();
  }, [fetchQuestDetail]);

  // Real browser geolocation before any "GPS validated" claim.
  const acquireGps = useCallback(() => {
    setGpsState('acquiring');
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsState('denied');
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsState('ready');
      },
      (err) => {
        setGpsState('denied');
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. GPS is required to submit quest proof.'
            : 'Could not acquire GPS position.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLaunchAr = () => {
    setArModalOpen(true);
    setArScanning(false);
    setArSuccess(false);
    setSubmitError(null);
    acquireGps();
  };

  const handleSimulateArScan = () => {
    if (gpsState !== 'ready' || !gps) return;
    setArScanning(true);
    setTimeout(() => {
      setArScanning(false);
      setArSuccess(true);
    }, 2500);
  };

  const handleSubmitProof = async () => {
    if (!quest || !gps) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await api.post('/submissions', buildSubmissionPayload(quest, gps));

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

  // Dialog behavior: Escape closes, focus moves into dialog.
  useEffect(() => {
    if (!arModalOpen) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [arModalOpen]);

  if (!isReady) return null;

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Quest Details">
        <div className="max-w-3xl mx-auto space-y-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-extrabold text-[#7D5800] hover:text-[#582F0E] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quest Feed</span>
          </button>

          {loading ? (
            <div className="bg-white rounded-3xl p-6 border border-[#E3DFD5] space-y-6 shadow-xs" aria-busy="true" aria-label="Loading quest details">
              <Skeleton className="w-full h-64 md:h-80 rounded-2xl" />
              <div className="space-y-3">
                <Skeleton className="w-1/3 h-5 rounded-md" />
                <Skeleton className="w-full h-4 rounded-md" />
                <Skeleton className="w-5/6 h-4 rounded-md" />
              </div>
              <Skeleton className="w-full h-24 rounded-2xl" />
              <Skeleton className="w-full h-14 rounded-2xl" />
            </div>
          ) : error || !quest ? (
            <div className="bg-white p-8 rounded-3xl border border-red-200 text-center text-xs text-[#BC4749] space-y-4 shadow-xs">
              <p className="font-bold">{error || 'Quest details not found.'}</p>
              <button
                onClick={() => fetchQuestDetail(true)}
                className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-extrabold transition cursor-pointer active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="bg-[#FFFDF7] rounded-3xl p-6 md:p-8 border border-[#E8DCB8] shadow-sm space-y-6">
              {/* Hero Banner Header with Green Circular Back Button */}
              <div className="relative rounded-2xl overflow-hidden h-64 md:h-80 shadow-md bg-stone-100">
                <img
                  src={quest.markerImageUrl || '/bg_landscape.png'}
                  alt={quest.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/bg_landscape.png';
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                <button
                  onClick={() => router.push('/quests')}
                  className="absolute top-4 left-4 w-10 h-10 rounded-full bg-[#48C71D] hover:bg-[#3FB418] text-white flex items-center justify-center shadow-lg transition cursor-pointer active:scale-95"
                  aria-label="Back to Quests"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[3]" />
                </button>

                <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                  <h1 className="text-2xl md:text-4xl font-extrabold font-serif drop-shadow-md">{quest.title}</h1>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-amber-200 font-bold">
                    <MapPin className="w-4 h-4 text-[#48C71D]" />
                    <span>{quest.locationName}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Overview Section */}
              <div className="space-y-2">
                <h2 className="text-sm font-black text-[#582F0E] uppercase tracking-wider">Detailed Overview:</h2>
                <p className="text-xs md:text-sm text-[#514532] leading-relaxed">
                  {quest.description} Discover the authentic charm of {quest.locationName}. This destination offers scenic eco-trails, rich cultural heritage, and verified community interaction for travelers in Pangasinan.
                </p>
              </div>

              {/* Activity Details Section */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/50 space-y-3 text-xs text-[#514532]">
                <h3 className="text-xs font-black text-[#582F0E] uppercase tracking-wider">Activity Details:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-semibold">
                  <div>
                    <span className="block text-[10px] text-gray-500 font-bold">Category</span>
                    <span className="font-extrabold text-[#582F0E] capitalize">{quest.category.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 font-bold">Base Reward</span>
                    <span className="font-extrabold text-emerald-700">₱{quest.baseRewardPhp} ({quest.rewardPoints} mJDQ)</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 font-bold">Difficulty</span>
                    <span className="font-extrabold text-[#7D5800]">{quest.difficultyFactor}x</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 font-bold">GPS Radius</span>
                    <span className="font-extrabold text-[#582F0E]">{quest.radiusMeters}m</span>
                  </div>
                </div>
              </div>

              {/* Main CTA Button: Join the Activity / Launch AR */}
              <button
                onClick={handleLaunchAr}
                className="w-full inline-flex items-center justify-center gap-3 bg-[#48C71D] hover:bg-[#3FB418] text-white font-extrabold py-4 px-6 rounded-2xl shadow-xl hover:scale-[1.01] transition transform text-sm tracking-wide cursor-pointer active:scale-95"
              >
                <Camera className="w-5 h-5 text-white" />
                <span>Join the Activity &amp; Scan AR Marker</span>
              </button>
            </div>
          )}

          {arModalOpen && quest && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="AR Radar Scanner"
                tabIndex={-1}
                className="bg-[#0D1B2A] text-white max-w-lg w-full rounded-3xl p-6 border border-white/20 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto outline-none"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-[#FFB703] animate-pulse" />
                    <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                      AR RADAR SCANNER ENGINE
                    </span>
                  </div>
                  <button
                    onClick={() => setArModalOpen(false)}
                    className="text-xs font-bold text-gray-400 hover:text-white px-3 py-1 bg-white/10 rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {gpsState !== 'ready' ? (
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <LocateFixed className="w-5 h-5 text-[#FFB703]" />
                      <span>
                        {gpsState === 'acquiring' ? 'Acquiring your GPS position...' : 'GPS position required'}
                      </span>
                    </div>
                    {gpsState === 'acquiring' && <Loader2 className="w-6 h-6 animate-spin text-[#FFB703]" />}
                    {gpsState === 'denied' && (
                      <>
                        <p className="text-xs text-red-300">{gpsError}</p>
                        <button
                          onClick={acquireGps}
                          className="px-4 py-2 rounded-xl bg-[#FFB703] text-[#582F0E] text-xs font-black cursor-pointer active:scale-95"
                        >
                          Try Again
                        </button>
                      </>
                    )}
                    {gpsState === 'idle' && (
                      <button
                        onClick={acquireGps}
                        className="px-4 py-2 rounded-xl bg-[#FFB703] text-[#582F0E] text-xs font-black cursor-pointer active:scale-95"
                      >
                        Enable GPS
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="h-64 rounded-2xl bg-black border-2 border-[#FFB703] relative flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                      {arScanning && (
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FFB703] to-transparent animate-scan shadow-[0_0_15px_#FFB703]" />
                      )}

                      {arScanning ? (
                        <div className="space-y-3 relative z-10">
                          <Loader2 className="w-10 h-10 animate-spin text-[#FFB703] mx-auto" />
                          <div className="text-xs font-extrabold text-amber-200 tracking-wider break-all">
                            SCANNING MARKER: {quest.markerCode}
                          </div>
                          {gps && (
                            <div className="text-[10px] text-gray-400 font-mono">
                              GPS Fix: [{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}] ±{gps.accuracy.toFixed(1)}m
                            </div>
                          )}
                        </div>
                      ) : arSuccess ? (
                        <div className="space-y-3 relative z-10 animate-float">
                          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                          <div className="text-base font-black text-emerald-400">
                            Target Marker Verified!
                          </div>
                          <div className="text-xs text-gray-300 break-all">
                            GPS fix {gps?.accuracy.toFixed(1)}m accuracy — submission will be validated
                            against the {quest.radiusMeters}m radius.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 relative z-10">
                          <div className="text-xs text-gray-400">Press scan to evaluate AR marker</div>
                          {gps && (
                            <div className="text-[10px] text-emerald-300 font-mono">
                              GPS Ready: [{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}] ±{gps.accuracy.toFixed(1)}m
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!arScanning && !arSuccess && (
                      <button
                        onClick={handleSimulateArScan}
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#FFB703] text-[#582F0E] font-black py-3.5 px-6 rounded-2xl shadow-xl text-sm cursor-pointer active:scale-95"
                      >
                        <ScanLine className="w-4 h-4" />
                        <span>Scan AR Marker</span>
                      </button>
                    )}
                  </>
                )}

                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="break-all">{submitError}</span>
                  </div>
                )}

                {arSuccess && (
                  <button
                    onClick={handleSubmitProof}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 gold-gradient text-[#582F0E] font-black py-4 px-6 rounded-2xl shadow-xl hover:scale-[1.02] transition text-sm cursor-pointer active:scale-95"
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
      </ErrorBoundary>
    </Navigation>
  );
}
