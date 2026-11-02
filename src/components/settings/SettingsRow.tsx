'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, LucideIcon } from 'lucide-react';

export interface SettingsRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

export function SettingsRow({ icon: Icon, title, description, href }: SettingsRowProps) {
  return (
    <Link
      href={href}
      aria-label={`${title}: ${description}`}
      className="flex items-center justify-between gap-3.5 p-3 sm:p-4 rounded-xl hover:bg-[var(--color-bg-subtle)] border border-transparent hover:border-[var(--color-border-default)] transition-colors min-h-[48px] group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center shrink-0 group-hover:bg-[var(--color-brand-primary)]/15 transition-colors">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-xs sm:text-sm font-bold text-[var(--color-brand-brown)] block truncate">
            {title}
          </span>
          <span className="text-[11px] sm:text-xs text-[var(--color-text-muted)] block line-clamp-1">
            {description}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[var(--color-brand-brown)] transition-colors shrink-0" />
    </Link>
  );
}
