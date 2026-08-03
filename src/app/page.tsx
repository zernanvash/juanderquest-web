'use client';

import { useRouter } from 'next/navigation';
import { Compass, ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const destination = user ? '/quests' : '/login';

  return (
    <main className="min-h-screen bg-[#FAF9F5] grid place-items-center p-5">
      <section className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-r from-[#582F0E] via-[#7D5800] to-[#2D6A4F] text-white p-8 md:p-14">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-xs font-extrabold"><Compass className="w-4 h-4" />JUANDERQUEST ADVENTURE HUB</div>
          <h1 className="text-4xl md:text-6xl font-black font-serif leading-tight">Explore Pangasinan. Complete quests. Build community.</h1>
          <p className="text-amber-100 leading-relaxed">Discover local destinations, verify visits, earn prototype rewards, and participate in community tourism decisions.</p>
          <button onClick={() => router.push(destination)} className="inline-flex items-center gap-2 rounded-2xl bg-[#FFB703] text-[#582F0E] font-black px-7 py-4 shadow-lg">
            {user ? 'Continue your journey' : 'Sign in with wallet'}<ArrowRight className="w-5 h-5" />
          </button>
          <div className="grid sm:grid-cols-2 gap-3 pt-5 text-sm">
            <div className="flex gap-3 bg-white/10 rounded-2xl p-4"><MapPin className="text-[#FFB703] shrink-0" /><span>Location-aware tourism quests across Pangasinan.</span></div>
            <div className="flex gap-3 bg-white/10 rounded-2xl p-4"><ShieldCheck className="text-[#FFB703] shrink-0" /><span>Wallet signatures prove ownership without a gas fee.</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
