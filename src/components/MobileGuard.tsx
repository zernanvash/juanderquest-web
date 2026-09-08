'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Download, X, Sparkles, Smartphone, ChevronRight } from 'lucide-react';

const BANNER_DISMISSED_KEY = 'jdq_mobile_banner_dismissed_v1';

export const MobileGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDismissed, setIsDismissed] = useState(true); // Default dismissed to avoid layout flash before hydration
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{
    versionName: string;
    downloadUrl: string;
    fileName?: string;
  }>({
    versionName: 'alpha-latest',
    downloadUrl: 'https://jdq.zernanvash.dev/api/v1/app/download',
    fileName: 'juanderquest-latest.apk',
  });

  useEffect(() => {
    // Check dismissal preference safely
    try {
      const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
      if (!dismissed) {
        setIsDismissed(false);
      }
    } catch {
      // Storage unavailable / private mode
      setIsDismissed(false);
    }

    const ua = navigator.userAgent || '';
    const android = /Android/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    setIsAndroid(android);
    setIsIOS(ios);

    // Fetch dynamic version if available
    fetch('https://jdq.zernanvash.dev/api/v1/app/version')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setVersionInfo({
            versionName: res.data.versionName || 'alpha-latest',
            downloadUrl: res.data.downloadUrl || 'https://jdq.zernanvash.dev/api/v1/app/download',
            fileName: res.data.fileName || 'juanderquest-latest.apk',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Show banner only on mobile devices if not dismissed
  const showBanner = !isDismissed && (isAndroid || isIOS);

  return (
    <>
      {showBanner && (
        <aside
          role="region"
          aria-label="JuanDerQuest mobile app notice"
          className="relative z-30 bg-[#2D6A4F] text-white px-3 sm:px-4 py-2 text-xs flex items-center justify-between gap-2 shadow-xs border-b border-[#1B4332] animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-white/15 p-1 shrink-0 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="JuanDerQuest"
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-white text-[11px] sm:text-xs truncate">
                  JuanDerQuest Mobile
                </span>
                <span className="bg-[#FFB703] text-[#582F0E] text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                  {versionInfo.versionName}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#D8F3DC] truncate">
                {isAndroid
                  ? 'Get the native Android app for AR & GPS quests'
                  : 'Web browsing mode active • iOS app coming soon'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAndroid ? (
              <a
                href={versionInfo.downloadUrl}
                download={versionInfo.fileName}
                className="inline-flex items-center gap-1 bg-[#FFB703] hover:bg-[#F59E0B] text-[#582F0E] font-black text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs transition active:scale-95 shrink-0"
              >
                <Download className="w-3 h-3" />
                <span>Get APK</span>
              </a>
            ) : null}

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss app banner"
              className="p-1 rounded-md text-[#D8F3DC] hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Main page content is ALWAYS rendered */}
      {children}
    </>
  );
};
