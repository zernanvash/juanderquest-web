import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, ShieldCheck, Smartphone, Sparkles, Compass, CheckCircle2, ArrowRight } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

const latestApk = 'https://github.com/zernanvash/juanderquest-mobile/releases/latest/download/juanderquest-latest.apk';

export const metadata: Metadata = {
  title: 'Download JuanDerQuest for Android',
  description: 'Download the current JuanDerQuest Android alpha APK built directly from GitHub Actions.',
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-canvas)] text-[var(--color-text-main)] flex flex-col">
      <Navigation />

      <main id="main-content" className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#E3DFD5] bg-white p-6 shadow-sm sm:p-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E5DE]">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D8F3DC] text-[#2D6A4F] shadow-xs">
                <Smartphone aria-hidden="true" className="h-8 w-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#2D6A4F] text-xs font-black uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Official Alpha Release</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#582F0E]">
                  JuanDerQuest for Android
                </h1>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-gray-400 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
              v1.0.0-alpha
            </span>
          </div>

          <p className="text-sm sm:text-base leading-relaxed text-[#514532]">
            Experience the native mobile companion for Pangasinan tourism. Built and verified via automated GitHub Actions CI/CD with direct integration to <code className="font-mono text-xs bg-emerald-50 text-[#2D6A4F] px-1.5 py-0.5 rounded">api.juanderquest.app</code>.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#582F0E]">
                <Sparkles className="w-4 h-4 text-[#FFB703]" />
                <span>Tri-Modal Augmented Reality</span>
              </div>
              <p className="text-xs text-[#837560] leading-relaxed">
                On-site 3D spatial viewfinder, tilt-compensated compass sensor fusion, and QR marker scanning.
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
                Native hardware camera proof capture and server-validated Haversine radius verification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-[#582F0E]">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>JuanChoice Governance & Rewards</span>
              </div>
              <p className="text-xs text-[#837560] leading-relaxed">
                Vote on monthly community spot highlights and earn Civic XP and $mJDQ reward tokens.
              </p>
            </div>
          </div>

          {/* Download CTA & Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={latestApk}
              className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] px-7 py-3.5 font-black text-sm text-white shadow-md transition active:scale-98 cursor-pointer"
            >
              <Download aria-hidden="true" className="h-5 w-5 text-[#FFB703]" />
              <span>Download Android APK (Latest)</span>
            </a>
            <Link
              href="/quests"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#D5C4AC] bg-[#FAF9F5] hover:bg-white px-6 py-3.5 font-bold text-xs sm:text-sm text-[#582F0E] transition active:scale-98"
            >
              <span>Browse Active Quests</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Android Installation Tip */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs leading-relaxed text-[#6B7280]">
            <p className="font-bold text-[#582F0E] mb-1">Installation Guide:</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li>When prompted by your mobile browser, tap <strong>&quot;Download anyway&quot;</strong>.</li>
              <li>Open the downloaded <code className="font-mono text-emerald-800 font-bold">juanderquest-latest.apk</code> file in your notification bar or Downloads folder.</li>
              <li>If requested, allow your browser permission to <em>&quot;Install unknown apps&quot;</em>.</li>
              <li>Tap <strong>Install</strong>, then launch JuanDerQuest to begin exploring Pangasinan!</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
