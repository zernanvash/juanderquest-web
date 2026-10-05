'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

export default function ProfileIndexPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        const username = user.handle
          ? user.handle.replace(/^@/, '')
          : (user.seedId || user.id || 'me');
        router.replace(`/profile/${encodeURIComponent(username)}`);
      } else {
        router.replace('/login?redirect=/profile');
      }
    }
  }, [user, isLoading, router]);

  return (
    <Navigation>
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-primary)]" />
        <p className="mt-3 text-xs text-[var(--color-text-muted)] font-medium">
          Opening your traveler passport...
        </p>
      </div>
    </Navigation>
  );
}
