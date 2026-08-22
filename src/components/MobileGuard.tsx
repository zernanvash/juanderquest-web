'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Download, ExternalLink, ShieldCheck } from 'lucide-react';

export const MobileGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const widthMobile = window.innerWidth < 768;
      const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(widthMobile || uaMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) return <>{children}</>;

  if (isMobile && !bypass) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-[#582F0E]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#D5C4AC]/60 shadow-xl text-center flex flex-col items-center">
          {/* Badge & Icon */}
          <div className="w-20 h-20 rounded-full bg-[#FFB703]/20 border-2 border-[#FFB703] flex items-center justify-center mb-6">
            <Monitor className="w-10 h-10 text-[#7D5800]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3F6653]/15 text-[#3F6653] text-xs font-bold tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>JUANDERQUEST WEB • DESKTOP ONLY</span>
          </div>

          <h1 className="text-2xl font-extrabold text-[#582F0E] mb-3 leading-tight font-serif">
            Optimized for Desktop End-to-End Testing
          </h1>

          <p className="text-sm text-[#514532] leading-relaxed mb-8">
            The web app is specifically tailored for desktop evaluation and admin testing. For real-time GPS location tracking and AR camera marker validation, please download and use our native Android mobile application.
          </p>

          {/* Download APK CTA */}
          <a
            href="https://jdq.zernanvash.dev/downloads/juanderquest-latest.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition duration-200 text-sm mb-4"
          >
            <Download className="w-5 h-5" />
            <span>Download Android Mobile App (APK)</span>
          </a>

          {/* Override Action */}
          <button
            onClick={() => setBypass(true)}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#7D5800] hover:text-[#582F0E] transition py-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Continue in Web Test Mode anyway</span>
          </button>

          <div className="mt-8 pt-6 border-t border-[#EFEEEA] w-full text-[11px] text-[#837560]">
            JuanDerQuest • School of Information Technology Education • Universidad de Dagupan
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
