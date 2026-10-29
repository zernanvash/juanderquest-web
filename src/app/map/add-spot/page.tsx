'use client';

// Plan 70: dedicated Spot Discovery Studio. Signed-out visitors are sent to sign in by the
// route gate and come back here; the pin and draft survive that round trip.
import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { SpotDiscoveryStudio } from '@/components/spot-studio/SpotDiscoveryStudio';
import { resolveInitialSpotLocation } from '@/lib/spot-location-handoff';

function StudioWithLocation() {
  const params = useSearchParams();
  // Resolved once, on the first render: there is always a pin from frame 0.
  const [initial] = useState(() => resolveInitialSpotLocation(params));
  return <SpotDiscoveryStudio initial={initial} />;
}

export default function AddSpotPage() {
  return (
    <Navigation>
      <main id="main-content" className="min-h-screen bg-[var(--color-bg-canvas)]">
        <Suspense fallback={<p role="status" className="p-8 text-center text-sm text-stone-600">Opening the studio…</p>}>
          <StudioWithLocation />
        </Suspense>
      </main>
    </Navigation>
  );
}
