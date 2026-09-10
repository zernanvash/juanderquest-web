'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-[var(--color-border-default)] text-xs text-[var(--color-text-muted)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3 pb-20 sm:pb-5">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} <span className="font-semibold text-[var(--color-brand-brown)]">JuanDerQuest</span>. All rights reserved.
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[var(--color-text-muted)]">
          <Link href="/explore" className="hover:text-[var(--color-brand-primary)] transition font-medium">
            Explore
          </Link>
          <Link href="/quests" className="hover:text-[var(--color-brand-primary)] transition font-medium">
            Quests
          </Link>
          <Link href="/map" className="hover:text-[var(--color-brand-primary)] transition font-medium">
            Map
          </Link>
          <Link href="/about" className="hover:text-[var(--color-brand-primary)] transition font-medium">
            About
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-brand-primary)] transition font-medium">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-brand-primary)] transition font-medium">
            Terms
          </Link>
          <a
            href="/download/juanderquest-latest.apk"
            className="hover:text-[var(--color-brand-primary)] transition font-semibold text-[var(--color-brand-primary)]"
          >
            Get App
          </a>
        </nav>
      </div>
    </footer>
  );
};
