'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  MapPin, 
  Compass, 
  Camera, 
  Gift, 
  RefreshCw, 
  CheckCircle2, 
  HelpCircle,
  Sparkles,
  Smartphone,
  ChevronDown
} from 'lucide-react';

export const MobileGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{
    versionName: string;
    versionCode: number;
    downloadUrl: string;
    changelog?: string;
  }>({
    versionName: '1.0.0',
    versionCode: 104,
    downloadUrl: 'https://jdq.zernanvash.dev/downloads/juanderquest-latest.apk',
    changelog: 'Automated release build with native installer and latest Pangasinan destination spots.',
  });

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const widthMobile = window.innerWidth < 768;
      const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(widthMobile || uaMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Fetch dynamic version if available
    fetch('https://jdq.zernanvash.dev/api/v1/app/version')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setVersionInfo(res.data);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) return <>{children}</>;

  if (isMobile && !bypass) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2B2319] flex flex-col items-center justify-start p-4 sm:p-6 selection:bg-[#FFB703]/30">
        <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E4D9] shadow-xl text-center flex flex-col items-center mt-2 mb-8">
          
          {/* Official App Logo */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-3xl bg-[#FAF9F5] border border-[#E8E4D9] shadow-md flex items-center justify-center p-3 overflow-hidden">
              <Image
                src="/logo.png"
                alt="JuanDerQuest App Logo"
                width={80}
                height={80}
                className="object-contain drop-shadow-sm"
                priority
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#2D6A4F] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full border-2 border-white shadow-sm flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>BETA</span>
            </div>
          </div>

          {/* Header Title & Version Badge */}
          <h1 className="text-2xl font-extrabold text-[#582F0E] tracking-tight font-serif mb-1">
            JuanDerQuest Mobile
          </h1>
          <p className="text-xs text-[#7D5800] font-semibold mb-3">
            Pangasinan's Heritage & Hidden Gems Quest Platform
          </p>

          {/* Release Meta Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3F6653]/10 text-[#274E3C] text-[11px] font-bold tracking-wide mb-6 border border-[#3F6653]/20">
            <span className="w-2 h-2 rounded-full bg-[#48C71D] animate-pulse"></span>
            <span>v{versionInfo.versionName} • Android 8.0+ • ~82 MB</span>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#514532] leading-relaxed mb-6 text-center max-w-sm">
            For real-time GPS radius verification, camera AR marker scanning, and off-chain reward points, download the official native Android application.
          </p>

          {/* Primary Download CTA Button */}
          <a
            href={versionInfo.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex flex-col items-center justify-center bg-[#2D6A4F] hover:bg-[#1B4332] active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition duration-200 group mb-3"
          >
            <div className="flex items-center gap-2.5 text-base">
              <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              <span>Download JuanDerQuest APK</span>
            </div>
            <span className="text-[11px] text-[#A7D7C5] font-normal mt-0.5">
              Direct Package File • Fast &amp; Free (v{versionInfo.versionName})
            </span>
          </a>

          {/* Secondary Mirrors & Version links */}
          <div className="flex items-center justify-center gap-3 text-[11px] text-[#7D5800] font-semibold mb-6">
            <a 
              href="https://jdq.zernanvash.dev/downloads/juanderquest_beta_v1.0.0.apk"
              className="hover:underline flex items-center gap-1"
            >
              <span>Versioned APK Mirror</span>
            </a>
            <span>•</span>
            <a 
              href="https://jdq.zernanvash.dev/downloads/version.json"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              <span>version.json</span>
            </a>
          </div>

          {/* Installation Guide Accordion */}
          <div className="w-full mb-6 text-left">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8E4D9] text-xs font-bold text-[#582F0E] hover:bg-[#F2EFE9] transition"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#7D5800]" />
                <span>How to Install APK on Android (3 Steps)</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showGuide ? 'rotate-180' : ''}`} />
            </button>

            {showGuide && (
              <div className="mt-2 p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E4D9] text-xs space-y-3 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</div>
                  <p className="text-[#514532]">
                    Tap <strong className="text-[#2D6A4F]">Download APK</strong> above to save the file.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</div>
                  <p className="text-[#514532]">
                    When your browser warns <em>"File might be harmful"</em>, tap <strong className="text-[#2D6A4F]">Download anyway</strong> (standard Android notice for direct downloads).
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</div>
                  <p className="text-[#514532]">
                    Open the notification and tap <strong className="text-[#2D6A4F]">Install</strong>. Updates will download over-the-air in the app!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="w-full text-left mb-6">
            <h2 className="text-xs font-extrabold text-[#7D5800] uppercase tracking-wider mb-3 px-1">
              App Features &amp; Capabilities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E4D9] flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-[#582F0E]">Pangasinan Hidden Gems</h3>
                  <p className="text-[11px] text-[#6E6250]">Discover secluded beaches, caves, and heritage shrines.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E4D9] flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-[#7D5800] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-[#582F0E]">GPS Proximity Quests</h3>
                  <p className="text-[11px] text-[#6E6250]">Live radius check-ins with anti-overcrowding diversion.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E4D9] flex items-start gap-2.5">
                <Gift className="w-4 h-4 text-[#FFB703] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-[#582F0E]">Merchant Vouchers</h3>
                  <p className="text-[11px] text-[#6E6250]">Earn reward points and redeem local discounts.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E4D9] flex items-start gap-2.5">
                <RefreshCw className="w-4 h-4 text-[#3F6653] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-[#582F0E]">In-App OTA Updates</h3>
                  <p className="text-[11px] text-[#6E6250]">1-tap seamless background updates without re-installs.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Web Mode Bypass */}
          <div className="pt-4 border-t border-[#EFEEEA] w-full flex flex-col items-center">
            <button
              onClick={() => setBypass(true)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#7D5800] hover:text-[#582F0E] transition py-2 px-4 rounded-lg hover:bg-[#FAF9F5]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Continue to Web Test Mode (Desktop UI)</span>
            </button>
            <span className="text-[10px] text-[#8C7F6B] mt-0.5">
              For evaluation, admin tools, and desktop browser testing
            </span>
          </div>

          {/* Academic Footer */}
          <div className="mt-6 pt-4 border-t border-[#EFEEEA] w-full text-[10px] text-[#8C7F6B] leading-relaxed">
            <p className="font-semibold text-[#582F0E]">JuanDerQuest Capstone Project</p>
            <p>School of Information Technology Education • Universidad de Dagupan</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
