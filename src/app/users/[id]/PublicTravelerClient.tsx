'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { fetchPublicUserProfile, type FetchUserProfileResult } from '@/lib/search';
import { UserProfileView } from './UserProfileView';

export function PublicTravelerClient({ id }: { id: string }) {
  const [result, setResult] = useState<FetchUserProfileResult | null>(null);

  useEffect(() => {
    let active = true;
    setResult(null);
    void fetchPublicUserProfile(id).then(value => { if (active) setResult(value); });
    return () => { active = false; };
  }, [id]);

  return <Navigation>
    {!result && <p role="status" className="mx-auto max-w-lg py-16 text-center text-sm">Loading traveler profile…</p>}
    {result?.kind === 'not_found' && <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
      <h1 className="text-2xl font-black">Traveler unavailable</h1>
      <p className="text-sm">This profile is private or no longer exists.</p>
      <Link href="/explore" className="text-sm font-bold underline">Back to explore</Link>
    </div>}
    {result?.kind === 'error' && <div role="alert" className="mx-auto max-w-lg space-y-3 py-16 text-center">
      <h1 className="text-2xl font-black">Profile temporarily unavailable</h1>
      <p className="text-sm">{result.message}</p>
      <button type="button" onClick={() => { setResult(null); void fetchPublicUserProfile(id).then(setResult); }} className="min-h-11 rounded-xl border px-4 text-sm font-bold">Retry</button>
    </div>}
    {result?.kind === 'success' && <UserProfileView profile={result.profile} />}
  </Navigation>;
}
