'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-[#E3DFD5] text-xs text-[#6B5E4C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3 pb-20 sm:pb-5">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} <span className="font-semibold text-[#582F0E]">JuanDerQuest</span>. All rights reserved.
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[#6B5E4C]">
          <Link href="/explore" className="hover:text-[#2D6A4F] transition">
            Explore
          </Link>
          <Link href="/quests" className="hover:text-[#2D6A4F] transition">
            Quests
          </Link>
          <Link href="/map" className="hover:text-[#2D6A4F] transition">
            Map
          </Link>
          <Link href="/about" className="hover:text-[#2D6A4F] transition">
            About
          </Link>
          <Link href="/privacy" className="hover:text-[#2D6A4F] transition">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#2D6A4F] transition">
            Terms
          </Link>
          <a
            href="/download/juanderquest-latest.apk"
            className="hover:text-[#2D6A4F] transition font-medium"
          >
            Get App
          </a>
        </nav>
      </div>
    </footer>
  );
};
