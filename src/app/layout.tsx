import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { MobileGuard } from '@/components/MobileGuard';

export const metadata: Metadata = {
  title: 'JuanDerQuest — Gamified Tourism Platform',
  description: 'JuanDerQuest: A Gamified Blockchain-based System for Promoting Tourist Destinations in Pangasinan.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAF9F5] text-[#582F0E]">
        <AuthProvider>
          <MobileGuard>{children}</MobileGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
