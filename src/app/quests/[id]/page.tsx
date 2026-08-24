'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Navigation as NavIcon,
  Sparkles,
  Trophy,
  ShieldCheck,
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

  // In-Page AR Radar Scanner & GPS Telemetry State (No Modals)
  const [arScanning, setArScanning] = useState(false);
  const [arSuccess, setArSuccess] = useState(false);
  const [gps, setGps] = useState<GpsFix | null>(null);
  const [gpsState, setGpsState] = useState<'idle' | 'acquiring' | 'ready' | 'denied'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Real browser geolocation acquisition
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
            ? 'Location permission denied. GPS fix is required to validate quest checkpoint radius.'
            : 'Could not acquire GPS fix.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSimulateArScan = () => {
    if (gpsState !== 'ready' || !gps) {
      acquireGps();
      return;
    }
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
        router.push('/history?success=submitted');
      } else {
        setSubmitError(res.data?.error?.message || 'Submission failed');
      }
    } catch (e: any) {
      setSubmitError(e.response?.data?.error?.message || 'Network error during submission.');
    }
    setSubmitting(false);
  };

  if (!isReady) return null;

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Quest Details">
        <div className="space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-between">
            <Link
              href="/quests"
              className="inline-flex items-center gap-2 text-xs font-black text-[#7D5800] hover:text-[#582F0E] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Quest Trails</span>
            </Link>

            {quest && (
              <Link
                href={`/navigate?name=${encodeURIComponent(quest.locationName)}&lat=${quest.gpsLat}&lng=${quest.gpsLng}&address=${encodeURIComponent(quest.locationName)}`}
                className="inline-flex items-center gap-2 text-xs font-black text-[#2D6A4F] hover:underline"
              >
                <NavIcon className="w-3.5 h-3.5" />
                <span>Navigate to Trailhead</span>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-8 border border-[#E3DFD5] space-y-6 shadow-xs">
              <Skeleton className="w-full h-80 rounded-2xl" />
              <div className="space-y-3">
                <Skeleton className="w-1/3 h-6 rounded-md" />
                <Skeleton className="w-full h-4 rounded-md" />
                <Skeleton className="w-5/6 h-4 rounded-md" />
              </div>
            </div>
          ) : error || !quest ? (
            <div className="bg-white p-8 rounded-3xl border border-red-200 text-center text-xs text-[#BC4749] space-y-4 shadow-xs">
              <p className="font-bold">{error || 'Quest details not found.'}</p>
              <button
                onClick={() => fetchQuestDetail(true)}
                className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] text-white text-xs font-extrabold cursor-pointer active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : (
            /* Expansive 2-Column Quest Layout (No Modal Overlays) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Quest Identity, Landmark Imagery, Description (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Hero Banner Header */}
                <div className="relative rounded-3xl overflow-hidden h-80 sm:h-96 shadow-sm border border-[#E3DFD5] bg-stone-100">
                  <img
                    src={quest.markerImageUrl || '/bg_landscape.png'}
                    alt={quest.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/bg_landscape.png';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#FFB703] text-[#582F0E] text-xs font-black uppercase tracking-wider shadow-md">
                      {quest.category.replace('_', ' ')} Trail
                    </span>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 text-white space-y-1.5">
                    <h1 className="text-2xl sm:text-3xl font-black font-serif drop-shadow-md">{quest.title}</h1>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-200 font-bold">
                      <MapPin className="w-4 h-4 text-[#48C71D]" />
                      <span>{quest.locationName}</span>
                    </div>
                  </div>
                </div>

                {/* Quest Overview & Objectives */}
                <div className="bg-white rounded-xl p-6 sm:p-7 border border-[#E3DFD5] space-y-4">
                  <h2 className="text-sm font-bold text-[#582F0E] uppercase tracking-wider">Mission Objectives:</h2>
                  <p className="text-xs sm:text-sm text-[#514532] leading-relaxed">
                    {quest.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                      <span className="text-[10px] text-gray-400 font-medium block">Reward Bounty</span>
                      <span className="text-xs font-bold text-emerald-700">+{quest.rewardPoints} mJDQ</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                      <span className="text-[10px] text-gray-400 font-medium block">Base Reward (PHP)</span>
                      <span className="text-xs font-bold text-[#582F0E]">₱{quest.baseRewardPhp}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                      <span className="text-[10px] text-gray-400 font-medium block">GPS Radius</span>
                      <span className="text-xs font-bold text-[#7D5800]">{quest.radiusMeters}m</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                      <span className="text-[10px] text-gray-400 font-medium block">Difficulty Factor</span>
                      <span className="text-xs font-bold text-[#582F0E]">{quest.difficultyFactor}x</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: In-Page AR Scanner & GPS Telemetry Workbench (5 cols) */}
              <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
                <div className="bg-[#0D1B2A] text-white rounded-xl p-5 sm:p-6 border border-white/20 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-4 h-4 text-[#FFB703] animate-pulse" />
                      <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                        AR Radar Scanner Workbench
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">Pangasinan LGU Geo-Fence</span>
                  </div>

                  {/* GPS Telemetry Fix Status */}
                  {gpsState !== 'ready' ? (
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                        <LocateFixed className="w-4 h-4 text-[#FFB703]" />
                        <span>
                          {gpsState === 'acquiring' ? 'Acquiring high-accuracy GPS fix...' : 'GPS telemetry required for verification'}
                        </span>
                      </div>
                      {gpsState === 'acquiring' && <Loader2 className="w-5 h-5 animate-spin text-[#FFB703] mx-auto" />}
                      {gpsState === 'denied' && (
                        <>
                          <p className="text-xs text-red-300 leading-relaxed">{gpsError}</p>
                          <button
                            onClick={acquireGps}
                            className="w-full py-2 rounded-lg bg-[#FFB703] text-[#582F0E] text-xs font-bold transition cursor-pointer active:scale-98"
                          >
                            Retry GPS Acquisition
                          </button>
                        </>
                      )}
                      {gpsState === 'idle' && (
                        <button
                          onClick={acquireGps}
                          className="w-full py-2.5 rounded-lg bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] text-xs font-bold transition cursor-pointer active:scale-98"
                        >
                          Enable GPS Telemetry
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Integrated Scanner HUD Canvas */}
                      <div className="h-56 rounded-lg bg-black border border-[#FFB703]/80 relative flex flex-col items-center justify-center p-5 text-center overflow-hidden">
                        {arScanning && (
                          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FFB703] to-transparent animate-scan shadow-[0_0_15px_#FFB703]" />
                        )}

                        {arScanning ? (
                          <div className="space-y-2.5 relative z-10">
                            <Loader2 className="w-8 h-8 animate-spin text-[#FFB703] mx-auto" />
                            <div className="text-xs font-bold text-amber-200 tracking-wider break-all">
                              SCANNING MARKER: {quest.markerCode}
                            </div>
                            {gps && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                GPS Fix: [{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}] ±{gps.accuracy.toFixed(1)}m
                              </div>
                            )}
                          </div>
                        ) : arSuccess ? (
                          <div className="space-y-1.5 relative z-10">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                            <div className="text-sm font-bold text-emerald-400">
                              Target Marker Verified!
                            </div>
                            <div className="text-[11px] text-gray-300">
                              GPS Accuracy: ±{gps?.accuracy.toFixed(1)}m (Target radius: {quest.radiusMeters}m)
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 relative z-10">
                            <div className="text-xs font-semibold text-gray-300">Target AR Marker Ready</div>
                            {gps && (
                              <div className="text-[11px] text-emerald-300 font-mono">
                                GPS Ready: [{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}] ±{gps.accuracy.toFixed(1)}m
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Trigger Buttons */}
                      {!arScanning && !arSuccess && (
                        <button
                          onClick={handleSimulateArScan}
                          className="w-full inline-flex items-center justify-center gap-2 bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] font-bold py-3 px-5 rounded-lg shadow-sm text-xs transition active:scale-98 cursor-pointer"
                        >
                          <ScanLine className="w-4 h-4" />
                          <span>Scan AR Landmark Marker</span>
                        </button>
                      )}

                      {arSuccess && (
                        <button
                          onClick={handleSubmitProof}
                          disabled={submitting}
                          className="w-full inline-flex items-center justify-center gap-2 bg-[#48C71D] hover:bg-[#3FB418] text-white font-bold py-3 px-5 rounded-lg shadow-sm text-xs sm:text-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Submit Proof to Backend (+{quest.rewardPoints} mJDQ)</span>
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {submitError && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="break-all">{submitError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
