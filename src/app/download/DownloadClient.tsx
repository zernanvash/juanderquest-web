'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Compass,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { API_BASE_URL } from '@/lib/api';

const GITHUB_RELEASE_URL =
  'https://github.com/zernanvash/juanderquest-mobile/releases/latest/download/juanderquest-latest.apk';
const DIRECT_API_DOWNLOAD_URL = `${API_BASE_URL}/app/download`;

interface VersionMeta {
  versionName: string;
  versionCode: number;
  fileName: string;
  sha256: string;
  sizeBytes: number;
  publishedAt: string;
}

const DEFAULT_VERSION: VersionMeta = {
  versionName: '1.0.0',
  versionCode: 149,
  fileName: 'juanderquest-android-v1.0.0+149.4.apk',
  sha256: 'e4d1d6744f61d29ae8279fb3c49cb4df3d1706b5695b0ebfff6a017111d6708e',
  sizeBytes: 63199382,
  publishedAt: '2026-09-29T07:09:00Z',
};

export function DownloadClient() {
  const [version, setVersion] = useState<VersionMeta>(DEFAULT_VERSION);
  const [isCopied, setIsCopied] = useState(false);
  const [isHashCopied, setIsHashCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    setIsAndroid(/Android/i.test(ua));
    setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    setIsInAppBrowser(/FBAN|FBAV|Instagram|TikTok|Line|MicroMessenger|Snapchat/i.test(ua));

    // Fetch version data from API
    fetch(`${API_BASE_URL}/app/version`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setVersion((prev) => ({
            ...prev,
            versionName: res.data.versionName || prev.versionName,
            versionCode: res.data.versionCode || prev.versionCode,
            fileName: res.data.fileName || prev.fileName,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyLink = async () => {
    const fullDownloadUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/v1/app/download`
        : DIRECT_API_DOWNLOAD_URL;

    try {
      await navigator.clipboard.writeText(fullDownloadUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(version.sha256);
      setIsHashCopied(true);
      setTimeout(() => setIsHashCopied(false), 2500);
    } catch {
      setIsHashCopied(true);
      setTimeout(() => setIsHashCopied(false), 2500);
    }
  };

  const handleTriggerDownload = () => {
    setDownloadStarted(true);
    setTimeout(() => setDownloadStarted(false), 8000);
  };

  const formattedSize = `${(version.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <Navigation>
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-center px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* In-App Browser Warning Alert */}
        {isInAppBrowser && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-amber-950">
                You are viewing this in an in-app browser
              </p>
              <p className="leading-relaxed">
                In-app browsers (like Facebook Messenger, Instagram, or TikTok) often block APK
                downloads. To download smoothly, tap the <strong>•••</strong> menu at the top-right
                and select <strong>&quot;Open in Chrome&quot;</strong> or{' '}
                <strong>&quot;Open in Browser&quot;</strong>.
              </p>
            </div>
          </div>
        )}

        {/* iOS Warning & Web Alternative Banner */}
        {isIOS && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900 shadow-xs flex items-start gap-3"
          >
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="font-bold text-sm text-blue-950">
                Apple iOS Device Detected
              </p>
              <p className="leading-relaxed">
                The JuanDerQuest native APK is built for Android smartphones. An iOS release is
                under development. You can explore all destinations, quests, and interactive maps
                right here in your Safari browser!
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <Link
                  href="/quests"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Browse Web Quests</span>
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-300 text-blue-900 font-bold text-xs hover:bg-blue-50 transition"
                >
                  <span>Open Interactive Map</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-3xl border border-[#E3DFD5] bg-white p-5 sm:p-10 shadow-sm space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E5DE]">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#D8F3DC] text-[#2D6A4F] shadow-xs shrink-0">
                <Smartphone aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#2D6A4F] text-xs font-black uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Official Alpha Release</span>
                </div>
                <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[#582F0E]">
                  JuanDerQuest for Android
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-gray-500 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
                v{version.versionName} (build {version.versionCode})
              </span>
            </div>
          </div>

          <p className="text-sm sm:text-base leading-relaxed text-[#514532]">
            Experience the native mobile companion for Pangasinan tourism. Includes on-device
            tri-modal Augmented Reality, turn-by-turn navigation with offline OpenStreetMap
            support, and geofence proof verification.
          </p>

          {/* Download Started Feedback Toast */}
          {downloadStarted && (
            <div className="rounded-2xl border border-emerald-400 bg-emerald-50 p-4 text-xs text-emerald-900 animate-in fade-in duration-200 flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin shrink-0" />
              <div className="flex-1">
                <p className="font-extrabold text-sm text-emerald-950">
                  APK Download In Progress...
                </p>
                <p className="text-emerald-800">
                  Check your phone&apos;s notification drawer or Downloads folder for{' '}
                  <code className="font-mono font-bold">{version.fileName}</code>.
                </p>
              </div>
            </div>
          )}

          {/* Download Action CTAs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Primary Direct Download (Fast Same-Origin Stream) */}
              <a
                href={DIRECT_API_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                download={version.fileName}
                onClick={handleTriggerDownload}
                className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2.5 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] px-6 py-3.5 font-black text-sm text-white shadow-md transition active:scale-98 cursor-pointer text-center"
              >
                <Download aria-hidden="true" className="h-5 w-5 text-[#FFB703] shrink-0" />
                <span>Download Android APK ({formattedSize})</span>
              </a>

              {/* GitHub Releases Direct Mirror */}
              <a
                href={GITHUB_RELEASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#D5C4AC] bg-[#FAF9F5] hover:bg-white px-5 py-3.5 font-bold text-xs sm:text-sm text-[#582F0E] transition active:scale-98 cursor-pointer text-center"
                title="Download directly from GitHub Releases"
              >
                <ExternalLink className="w-4 h-4 text-[#837560]" />
                <span>GitHub Mirror</span>
              </a>

              {/* Copy Direct Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#D5C4AC] bg-white hover:bg-stone-50 px-4 py-3.5 font-bold text-xs sm:text-sm text-[#582F0E] transition active:scale-98 cursor-pointer"
                title="Copy download link to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#837560]" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {isAndroid && (
              <p className="text-[11px] text-[#2D6A4F] font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Compatible with your Android device (Android 8.0 Oreo or newer)</span>
              </p>
            )}
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#582F0E]">
                <Sparkles className="w-4 h-4 text-[#FFB703]" />
                <span>Tri-Modal Augmented Reality</span>
              </div>
              <p className="text-xs text-[#837560] leading-relaxed">
                On-site 3D spatial viewfinder, tilt-compensated compass sensor fusion, and live
                camera overlay.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#582F0E]">
                <Compass className="w-4 h-4 text-[#2D6A4F]" />
                <span>Sovereign Turn-by-Turn Routing</span>
              </div>
              <p className="text-xs text-[#837560] leading-relaxed">
                Self-hosted Valhalla routing daemon with offline-ready OpenStreetMap raster tiles.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#582F0E]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Geofence Proof-of-Arrival</span>
              </div>
              <p className="text-xs text-[#837560] leading-relaxed">
                Native hardware camera proof capture and server-validated Haversine radius
                verification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#582F0E]">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>JuanChoice Governance &amp; Rewards</span>
              </div>
              <p className="text-xs text-[#837560] leading-relaxed">
                Vote on monthly community spot highlights and earn Civic XP and $mJDQ reward tokens.
              </p>
            </div>
          </div>

          {/* Android Installation Tip */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5 text-xs leading-relaxed text-[#6B7280] space-y-3">
            <p className="font-bold text-sm text-[#582F0E]">Android Installation Guide:</p>
            <ol className="list-decimal pl-4 space-y-2 text-xs">
              <li>
                Tap <strong>&quot;Download Android APK&quot;</strong> above. If prompted by Chrome,
                tap <strong>&quot;Download anyway&quot;</strong>.
              </li>
              <li>
                Open the downloaded{' '}
                <code className="font-mono text-emerald-800 font-bold bg-emerald-50 px-1 py-0.5 rounded">
                  {version.fileName}
                </code>{' '}
                file in your notification bar or Downloads folder.
              </li>
              <li>
                If requested, allow your browser permission to{' '}
                <em>&quot;Install unknown apps&quot;</em> in Android Settings.
              </li>
              <li>
                Tap <strong>Install</strong>, then launch JuanDerQuest to begin exploring
                Pangasinan!
              </li>
            </ol>
          </div>

          {/* Package & Integrity Metadata Footer */}
          <div className="pt-2 border-t border-[#E8E5DE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-[#837560]">
            <div>
              <span className="font-semibold text-[#582F0E]">Package: </span>
              <code className="font-mono text-[10px]">dev.zernanvash.juanderquest</code>
              <span className="mx-2">•</span>
              <span className="font-semibold text-[#582F0E]">Size: </span>
              <span>{formattedSize}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#582F0E]">SHA-256: </span>
              <code className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded">
                {version.sha256.substring(0, 16)}…
              </code>
              <button
                type="button"
                onClick={handleCopyHash}
                className="text-[10px] text-[#2D6A4F] hover:underline font-bold cursor-pointer"
                title="Copy full SHA-256 checksum"
              >
                {isHashCopied ? 'Copied!' : 'Copy Hash'}
              </button>
            </div>
          </div>
        </div>

        {/* Back to Web Navigation */}
        <div className="mt-6 text-center">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#582F0E] hover:text-[#2D6A4F] transition"
          >
            <span>Continue exploring on the web instead</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Navigation>
  );
}
