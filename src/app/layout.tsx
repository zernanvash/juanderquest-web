import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { MobileGuard } from '@/components/MobileGuard';
import { CookieConsent } from '@/components/CookieConsent';
import { WebAnalytics } from '@/components/WebAnalytics';
import { StickyMobileCta } from '@/components/StickyMobileCta';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://jdq.zernanvash.dev'),
  title: { default: 'JuanDerQuest — Discover Pangasinan', template: '%s | JuanDerQuest' },
  description: 'Explore Pangasinan through community destinations, quests, sovereign maps, and local rewards.',
  openGraph: { title: 'JuanDerQuest — Discover Pangasinan', description: 'Explore Pangasinan through community destinations, quests, maps, and local rewards.', url: '/', siteName: 'JuanDerQuest', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'JuanDerQuest Pangasinan tourism platform' }], locale: 'en_PH', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'JuanDerQuest — Discover Pangasinan', description: 'Explore Pangasinan through community destinations, quests, maps, and local rewards.', images: ['/opengraph-image'] },
  icons: { icon: '/favicon.ico', apple: '/logo.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="h-full antialiased"><body className="min-h-full flex flex-col bg-[#FAF9F5] text-[#582F0E]">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <AuthProvider><MobileGuard>{children}</MobileGuard><StickyMobileCta /><CookieConsent /><WebAnalytics /></AuthProvider>
  </body></html>;
}
