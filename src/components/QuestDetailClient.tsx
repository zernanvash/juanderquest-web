'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, normalizeQuest, QuestModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Skeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  MapPin,
  Award,
  ArrowLeft,
  Navigation as NavIcon,
  Sparkles,
  Smartphone,
  Download,
  ScanLine,
  Compass,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { MiniMapPreview } from '@/components/MiniMapPreview';

export default function QuestDetailClient() {
  const params = useParams();
  const router = useRouter();
  const questId = params.id as string;
  const { isLoading } = useAuth();

  const [quest, setQuest] = useState<QuestModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) return null;

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
            /* Expansive 2-Column Quest Layout with Strict Mobile-Only Verification */
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
                    {quest.isTest && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shadow-xs">
                        Fictional alpha quest
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 text-white space-y-1.5">
                    <h1 className="text-2xl sm:text-3xl font-black drop-shadow-md">{quest.title}</h1>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-200 font-bold">
                      <MapPin className="w-4 h-4 text-[#48C71D]" />
                      <span>{quest.locationName}</span>
                    </div>
                  </div>
                </div>

                {/* Quest Overview & Objectives */}
                <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E3DFD5] space-y-4 shadow-xs">
                  <h2 className="text-sm font-bold text-[#582F0E] uppercase tracking-wider">Mission Objectives:</h2>
                  <p className="text-xs sm:text-sm text-[#514532] leading-relaxed">
                    {quest.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="card-alive p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]">
                      <span className="text-[10px] text-gray-400 font-medium block">Reward Bounty</span>
                      <span className="text-xs font-bold text-emerald-700">+{quest.rewardPoints} mJDQ</span>
                    </div>

                    <div className="card-alive p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]">
                      <span className="text-[10px] text-gray-400 font-medium block">Base Reward (PHP)</span>
                      <span className="text-xs font-bold text-[#582F0E]">₱{quest.baseRewardPhp}</span>
                    </div>

                    <div className="card-alive p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]">
                      <span className="text-[10px] text-gray-400 font-medium block">GPS Radius</span>
                      <span className="text-xs font-bold text-[#7D5800]">{quest.radiusMeters}m Geofence</span>
                    </div>

                    <div className="card-alive p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]">
                      <span className="text-[10px] text-gray-400 font-medium block">Difficulty Factor</span>
                      <span className="text-xs font-bold text-[#582F0E]">{quest.difficultyFactor}x</span>
                    </div>
                  </div>
                </div>

                {/* Target Checkpoint Interactive Mini-Map */}
                <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E3DFD5] space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#582F0E] uppercase tracking-wider">
                        Checkpoint Map Preview
                      </h2>
                      <p className="text-xs text-[#837560] mt-0.5">
                        Target location in {quest.locationName}. Tap map to explore in the full interactive map.
                      </p>
                    </div>
                    <Link
                      href={`/map?lat=${quest.gpsLat}&lng=${quest.gpsLng}&name=${encodeURIComponent(quest.title)}&quest=${quest.id}`}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-[#2D6A4F] hover:underline"
                    >
                      <span>Full Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <MiniMapPreview
                    lat={quest.gpsLat}
                    lng={quest.gpsLng}
                    name={quest.title}
                    municipality={quest.locationName}
                    questId={quest.id}
                    pinType="quest"
                    height="h-56"
                  />
                </div>
              </div>

              {/* Right Column: Native Mobile App Handoff Card (5 cols) */}
              <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
                <div className="bg-[#0D1B2A] text-white rounded-2xl p-6 sm:p-7 border border-white/20 shadow-xl space-y-6">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-[#FFB703]" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-amber-200 uppercase tracking-wider block">
                          Physical Check-in Required
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">Native Mobile App Verification</span>
                      </div>
                    </div>
                  </div>

                  {/* Physical Hardware Explanation */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-start gap-2.5 text-xs text-gray-200 leading-relaxed">
                      <ScanLine className="w-4 h-4 text-[#FFB703] shrink-0 mt-0.5" />
                      <span>
                        AR 3D Viewfinder, QR checkpoint scanning, and live camera photo proof require native device sensor fusion (tilt-compensated compass, gyroscope, accelerometer) and hardware camera integration.
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed pl-6">
                      For location integrity and geofence verification, quests must be validated on-site using the JuanDerQuest Android mobile app.
                    </p>
                  </div>

                  {/* Checkpoint Telemetry Specs */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                      Target Checkpoint Telemetry
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] text-gray-400 block">Checkpoint Geofence</span>
                        <span className="font-bold text-emerald-400">Within {quest.radiusMeters}m radius</span>
                      </div>
                      <Link
                        href={`/map?lat=${quest.gpsLat}&lng=${quest.gpsLng}&name=${encodeURIComponent(quest.title)}&quest=${quest.id}`}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition group flex flex-col justify-center"
                      >
                        <span className="text-[10px] text-gray-400 flex items-center justify-between">
                          <span>Map Location</span>
                          <ExternalLink className="w-2.5 h-2.5 text-amber-300 opacity-60 group-hover:opacity-100" />
                        </span>
                        <span className="font-bold text-amber-300 text-[11px] truncate mt-0.5">
                          {quest.locationName}
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* Mobile Actions: Deep Link & APK Download */}
                  <div className="space-y-3 pt-2">
                    <a
                      href={`juanderquest://quests/${quest.id}`}
                      className="btn-tactile btn-sheen w-full inline-flex items-center justify-center gap-2 bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] font-black py-3.5 px-5 rounded-xl shadow-md text-xs sm:text-sm transition cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Open in JuanDerQuest App</span>
                    </a>

                    <a
                      href="https://github.com/zernanvash/juanderquest-mobile/releases/latest/download/juanderquest-latest.apk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-tactile w-full inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold py-3 px-5 rounded-xl text-xs transition"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Download Android APK (v1.0.0-alpha)</span>
                    </a>

                    <Link
                      href={`/navigate?name=${encodeURIComponent(quest.locationName)}&lat=${quest.gpsLat}&lng=${quest.gpsLng}&address=${encodeURIComponent(quest.locationName)}`}
                      className="btn-tactile w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-gray-300 hover:text-white py-2 transition"
                    >
                      <NavIcon className="w-3.5 h-3.5 text-[#2D6A4F]" />
                      <span>Get Sovereign Turn-by-Turn Route</span>
                    </Link>
                  </div>

                  {/* Real-Time Balance Sync Note */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Cross-Device Live Sync:</strong> Once verified on your Android device, return to this tab — your earned tokens (+{quest.rewardPoints} mJDQ) and badges will sync automatically!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
