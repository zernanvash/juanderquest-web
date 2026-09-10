import Link from 'next/link';
import Image from 'next/image';
import {
  Compass,
  MapPin,
  Bookmark,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Download,
} from 'lucide-react';
import { Footer } from '@/components/Footer';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-canvas)] flex flex-col justify-between text-[var(--color-text-primary)] selection:bg-[var(--color-brand-accent)]/30">
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* Top Hero Section */}
        <section className="mx-auto max-w-7xl px-5 sm:px-8 py-12 md:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Travel Headline & Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-xs font-black tracking-wide border border-[var(--color-brand-primary)]/20">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
                <span>Pangasinan Tourism &amp; Heritage Platform</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--color-brand-brown)] tracking-tight leading-[1.15]">
                Find your next Pangasinan adventure—and build a travel passport worth sharing.
              </h1>

              <p className="text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl">
                Explore secluded beaches, historic heritage shrines, and family-run food stops across 44 Pangasinan municipalities. Browse instantly on the web or unlock AR quests on Android.
              </p>

              {/* Action CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  data-analytics-label="hero_explore"
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] px-7 py-4 text-center font-black text-white shadow-md hover:shadow-lg transition active:scale-98 min-h-[48px]"
                >
                  <Compass className="w-5 h-5 text-[var(--color-brand-accent)]" />
                  <span>Explore Destinations</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  data-analytics-label="hero_download"
                  href="/download/juanderquest-latest.apk"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)] px-6 py-3.5 text-center font-black text-[var(--color-brand-primary)] transition active:scale-98 min-h-[48px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Get Android App</span>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)] pt-2 font-semibold">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-brand-primary)]" />
                  <span>Zero account required to browse</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[var(--color-brand-primary)]" />
                  <span>44 Municipalities &amp; Cities</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Destination Showcase Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto w-full max-w-md bg-white rounded-3xl p-4 sm:p-5 border border-[var(--color-border-default)] shadow-xl space-y-4">
                {/* Hero Scenic Preview Image */}
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--color-brand-primary)] to-[var(--color-brand-primary-hover)]">
                  <Image
                    src="/bg_landscape.png"
                    alt="Scenic Pangasinan landscape"
                    fill
                    priority
                    sizes="(max-width: 768px) 90vw, 40vw"
                    className="object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="inline-block px-2 py-0.5 rounded bg-[var(--color-brand-accent)] text-[var(--color-brand-brown)] text-[10px] font-black uppercase tracking-wider mb-1">
                      Featured Circuit
                    </span>
                    <h2 className="font-serif text-lg font-bold drop-shadow-sm">
                      Western Pangasinan Coastal Trail
                    </h2>
                    <p className="text-[11px] text-white/90">
                      Bolinao · Alaminos City · Dasol
                    </p>
                  </div>
                </div>

                {/* Quick Trip Preview Card */}
                <div className="p-3.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] space-y-2 text-xs">
                  <p className="font-bold text-[var(--color-brand-brown)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
                    <span>Sample Weekend Expedition</span>
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[var(--color-brand-primary)] text-white font-bold text-[9px] flex items-center justify-center shrink-0">1</span>
                      <span>Morning panorama at Cape Bolinao Lighthouse</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[var(--color-brand-primary)] text-white font-bold text-[9px] flex items-center justify-center shrink-0">2</span>
                      <span>Sunset and tidal walk at Patar White Beach</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[var(--color-brand-primary)] text-white font-bold text-[9px] flex items-center justify-center shrink-0">3</span>
                      <span>Island hopping at Hundred Islands National Park</span>
                    </li>
                  </ul>
                </div>

                <Link
                  href="/explore"
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white text-xs font-bold transition shadow-xs"
                >
                  <span>Start Exploring Destinations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* The 4-Step Traveler Journey (Discover → Save → Visit → Earn) */}
        <section className="bg-white border-y border-[var(--color-border-default)] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 space-y-12">
            
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--color-brand-primary)]">
                How JuanDerQuest Works
              </span>
              <h2 className="font-serif text-2xl sm:text-4xl font-black text-[var(--color-brand-brown)]">
                From first browse to verified traveler passport.
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
                A simple, open, and gamified way to experience Pangasinan tourism while supporting local MSME communities.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Step 1: Discover */}
              <div className="p-6 rounded-3xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/40 hover:shadow-md transition-all duration-200 space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-[var(--color-brand-primary)] flex items-center justify-center font-black">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[var(--color-brand-primary)] uppercase tracking-wider">Step 1</span>
                  <h3 className="font-serif font-black text-lg text-[var(--color-brand-brown)]">Discover</h3>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Browse authentic spots shared by locals—from serene tidal pools to heritage basilicas and seafood shacks.
                </p>
              </div>

              {/* Step 2: Save */}
              <div className="p-6 rounded-3xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] hover:border-[var(--color-brand-accent)]/50 hover:shadow-md transition-all duration-200 space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-[var(--color-brand-accent-dark)] flex items-center justify-center font-black">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[var(--color-brand-accent-dark)] uppercase tracking-wider">Step 2</span>
                  <h3 className="font-serif font-black text-lg text-[var(--color-brand-brown)]">Save on Device</h3>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Bookmark favorite destinations to your private travel logbook without needing to register or link a wallet.
                </p>
              </div>

              {/* Step 3: Visit */}
              <div className="p-6 rounded-3xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] hover:border-blue-300 hover:shadow-md transition-all duration-200 space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-black">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Step 3</span>
                  <h3 className="font-serif font-black text-lg text-[var(--color-brand-brown)]">Visit &amp; Navigate</h3>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Access turn-by-turn routing and real-time crowd status to explore comfortably and avoid peak congestion.
                </p>
              </div>

              {/* Step 4: Earn */}
              <div className="p-6 rounded-3xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] hover:border-[var(--color-brand-brown)]/40 hover:shadow-md transition-all duration-200 space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-200/70 text-[var(--color-brand-brown)] flex items-center justify-center font-black">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-[var(--color-brand-brown)] uppercase tracking-wider">Step 4</span>
                  <h3 className="font-serif font-black text-lg text-[var(--color-brand-brown)]">Earn &amp; Redeem</h3>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Complete on-site GPS check-ins to build your public explorer passport and earn demo points for local perks.
                </p>
              </div>
            </div>

            <div className="text-center pt-4">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white font-black text-xs transition shadow-sm"
              >
                <span>Browse All Destinations Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </section>

        {/* Academic Capstone Attribution */}
        <section className="mx-auto max-w-4xl px-5 sm:px-8 py-12 text-center text-xs text-[var(--color-text-muted)] space-y-2">
          <p className="font-bold text-[var(--color-brand-brown)]">
            JuanDerQuest: A Gamified Blockchain-based System for Promoting Tourist Destinations in Pangasinan
          </p>
          <p>
            School of Information Technology Education • Universidad de Dagupan
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
