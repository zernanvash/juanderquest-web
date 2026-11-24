import type { Metadata } from 'next';
import { DownloadClient } from './DownloadClient';
import { fetchApkReleases } from './releases';

export const metadata: Metadata = {
  title: 'Download JuanDerQuest for Android (Beta)',
  description:
    'Turn Pangasinan into your next adventure. Download the JuanDerQuest Android Beta: pixel-art quests, AR treasure hunts, smart maps, and local Suki rewards.',
};

export default async function DownloadPage() {
  const releases = await fetchApkReleases();
  return <DownloadClient releases={releases} />;
}
