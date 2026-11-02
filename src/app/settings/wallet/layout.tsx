import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata(
  'Wallet & On-Chain · Settings',
  'Manage your connected wallet, Soulbound Badges, and cryptographic telemetry.',
  '/settings/wallet'
);

export default function WalletSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
