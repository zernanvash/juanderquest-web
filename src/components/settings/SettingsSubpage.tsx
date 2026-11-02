'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface SettingsSubpageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSubpage({ title, description, children }: SettingsSubpageProps) {
  return (
    <ErrorBoundary>
      <Navigation>
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
          <div className="border-b border-[var(--color-border-default)] pb-5">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand-primary)] hover:underline mb-3 min-h-[36px]"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>← Settings</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--color-brand-brown)]">
              {title}
            </h1>
            {description && (
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                {description}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-6">{children}</div>
        </div>
      </Navigation>
    </ErrorBoundary>
  );
}
