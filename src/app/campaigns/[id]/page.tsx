'use client';

import React, { useEffect, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const target = `/quests/campaigns/${id}${qs ? `?${qs}` : ''}`;
    router.replace(target);
  }, [id, router, searchParams]);

  return null;
}

export default function CampaignDetailRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <RedirectContent params={params} />
    </Suspense>
  );
}
