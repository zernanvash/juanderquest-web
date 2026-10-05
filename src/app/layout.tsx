import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { MobileGuard } from '@/components/MobileGuard';
import { CookieConsent } from '@/components/CookieConsent';
import { WebAnalytics } from '@/components/WebAnalytics';
import { StickyMobileCta } from '@/components/StickyMobileCta';
import { WalletAccessGate } from '@/components/WalletAccessGate';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://juanderquest.app'),
  title: { default: 'JuanDerQuest — Discover Local Journeys', template: '%s | JuanDerQuest' },
  description: 'Discover community-powered destinations, quests, and local experiences. Explore our Pangasinan pilot on JuanDerQuest.',
  robots: process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE === 'true'
    ? { index: false, follow: false, noarchive: true, nocache: true }
    : undefined,
  openGraph: { title: 'JuanDerQuest — Discover Local Journeys', description: 'Discover community-powered destinations and local experiences, beginning with Pangasinan.', url: '/', siteName: 'JuanDerQuest', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'JuanDerQuest community-powered tourism' }], locale: 'en_PH', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'JuanDerQuest — Discover Local Journeys', description: 'Discover community-powered destinations and local experiences, beginning with Pangasinan.', images: ['/opengraph-image'] },
  icons: { icon: '/favicon.ico', apple: '/logo.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased overflow-x-hidden">
      <body className="min-h-full flex flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] selection:bg-[var(--color-brand-accent)]/30 overflow-x-hidden">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AuthProvider>
          <MobileGuard><WalletAccessGate>{children}</WalletAccessGate></MobileGuard>
          <StickyMobileCta />
          <CookieConsent />
          <WebAnalytics />
        </AuthProvider>
      </body>
    </html>
  );
}
