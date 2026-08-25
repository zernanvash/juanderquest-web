'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/quests?tab=campaigns');
  }, [router]);

  return null;
}
