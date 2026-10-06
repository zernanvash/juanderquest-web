import type { Metadata } from 'next';
import { DownloadClient } from './DownloadClient';

export const metadata: Metadata = {
  title: 'Download JuanDerQuest for Android',
  description:
    'Download the official JuanDerQuest Android alpha APK for AR quests, turn-by-turn navigation, and Pangasinan exploration.',
};

export default function DownloadPage() {
  return <DownloadClient />;
}
