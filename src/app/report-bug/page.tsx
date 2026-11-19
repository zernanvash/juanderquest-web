import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReportBugClient } from './ReportBugClient';

export const metadata: Metadata = {
  title: 'Report a Bug — JuanDerQuest Beta',
  description:
    'Found a bug in the JuanDerQuest Open Beta? Send a quick report so our team can fix it.',
};

export default function ReportBugPage() {
  return (
    <Suspense fallback={null}>
      <ReportBugClient />
    </Suspense>
  );
}
