import type { Metadata } from 'next';
import { DownloadClient } from './DownloadClient';
import { fetchApkReleases } from './releases';

export const metadata: Metadata = {
  title: 'Download JuanDerQuest for Android',
  description:
    'Download the JuanDerQuest Android app (Beta): pixel-art quests, AR, turn-by-turn navigation and Pangasinan exploration. Older versions stay available.',
};

export default async function DownloadPage() {
  const releases = await fetchApkReleases();
  return <DownloadClient releases={releases} />;
}
