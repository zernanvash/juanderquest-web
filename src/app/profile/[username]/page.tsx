import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { UnifiedProfileClient } from './UnifiedProfileClient';

export default async function UnifiedProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-primary)]" />
          <p className="mt-3 text-xs text-[var(--color-text-muted)] font-medium">
            Loading traveler passport...
          </p>
        </div>
      }
    >
      <UnifiedProfileClient username={username} />
    </Suspense>
  );
}

