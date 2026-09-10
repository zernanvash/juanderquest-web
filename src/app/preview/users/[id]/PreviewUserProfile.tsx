'use client';
import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import { fetchPublicUserProfile, FetchUserProfileResult } from '@/lib/search';
import { UserProfileView } from '@/app/users/[id]/UserProfileView';

export function PreviewUserProfile({ id }: { id: string }) {
  const { isPreviewActive } = useAuth();
  const [result, setResult] = useState<FetchUserProfileResult | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setResult(null);
    if (isPreviewActive) void fetchPublicUserProfile(id).then(value => { if (current) setResult(value); });
    return () => { current = false; };
  }, [id, isPreviewActive, retry]);
  return <Navigation>
    {!isPreviewActive ? <p className="p-6" role="status">Check evaluator access above to view this public test profile.</p>
      : !result ? <p className="p-6" role="status">Loading traveler…</p>
      : result.kind === 'success' ? <UserProfileView profile={result.profile} />
      : <div className="p-6"><p role="alert">{result.kind === 'not_found' ? 'This profile is private or unavailable.' : result.message}</p><button className="min-h-11 underline" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
  </Navigation>;
}
