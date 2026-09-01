import Link from 'next/link';
import Image from 'next/image';
import { Footer } from '@/components/Footer';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-between">
      <main id="main-content" className="flex-1">
        <section className="mx-auto grid min-h-[80vh] max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-10">
          <div>
            <p className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#2D6A4F]">
              Explore Pangasinan differently
            </p>
            <h1 className="max-w-3xl font-serif text-5xl font-black leading-tight text-[#582F0E] md:text-7xl">
              Every journey becomes a quest.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#514532]">
              Discover community-recommended destinations, navigate with sovereign maps, complete local challenges, and support Pangasinan merchants.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                data-analytics-label="hero_explore"
                href="/explore"
                className="rounded-2xl bg-[#2D6A4F] px-6 py-3.5 text-center font-black text-white shadow-lg hover:bg-[#1B4332] transition"
              >
                Explore destinations
              </Link>
              <a
                data-analytics-label="hero_download"
                href="/download/juanderquest-latest.apk"
                className="rounded-2xl border-2 border-[#2D6A4F] px-6 py-3 text-center font-black text-[#2D6A4F] hover:bg-emerald-50 transition"
              >
                Download Android app
              </a>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1B4332] to-[#40916C] shadow-2xl">
            <Image
              src="/logo.png"
              alt="JuanDerQuest compass mascot for Pangasinan travel"
              fill
              priority
              sizes="(max-width: 768px) 90vw, 40vw"
              className="object-contain p-16"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

