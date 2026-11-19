import type { Metadata } from 'next';
import { DownloadClient } from './DownloadClient';

export const metadata: Metadata = {
  title: 'Download JuanDerQuest for Android (Beta)',
  description:
    'Turn Pangasinan into your next adventure. Download the JuanDerQuest Android Beta: pixel-art quests, AR treasure hunts, smart maps, and local Suki rewards.',
};

export default function DownloadPage() {
  return <DownloadClient />;
}
