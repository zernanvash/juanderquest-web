'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Compass, Sparkles, ArrowRight, UserCheck, ShieldCheck, Award, MapPin, Zap, Wallet } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loginWithSeed, loginWithSimulatedWallet, isLoading } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [loginError, setLoginError] = React.useState('');

  const handleLogin = async (seedId: string) => {
    const ok = await loginWithSeed(seedId);
    if (ok) {
      router.push('/quests');
    }
  };

  const handleWalletLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    const ok = await loginWithSimulatedWallet(username, password, rememberMe);
    if (ok) {
      router.push('/quests');
    } else {
      setLoginError('Could not start the simulated wallet session.');
    }
  };

  return (
    <Navigation>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Interactive Gamified Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-r from-[#582F0E] via-[#7D5800] to-[#2D6A4F] text-white p-8 md:p-12 border border-[#FFB703]/30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFB703]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-extrabold tracking-wider text-[#FFB703] border border-white/10">
              <Sparkles className="w-4 h-4" />
              <span>JUANDERQUEST ADVENTURE HUB</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black font-serif leading-tight">
              Embark on the Pangasinan Quest Journey
            </h1>

            <p className="text-sm md:text-base text-amber-100/90 leading-relaxed">
              Explore coastal eco-trails, cultural heritage shrines, and culinary spots. Earn reward vouchers, cast mJDQ governance votes, and unlock real achievement badges!
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => router.push('/quests')}
                className="inline-flex items-center gap-2.5 gold-gradient text-[#582F0E] font-black px-7 py-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-sm"
              >
                <span>Start Your Quest Journey</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => router.push('/vote')}
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold px-6 py-4 rounded-2xl backdrop-blur-md transition text-sm border border-white/20"
              >
                <Compass className="w-4 h-4 text-[#FFB703]" />
                <span>Governance Voting Arena</span>
              </button>
            </div>
          </div>
        </div>

        {/* Streamlined Preset Traveler Login */}
        <div className="bg-white rounded-3xl p-8 border border-[#D5C4AC]/40 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold font-serif text-[#582F0E]">Select Traveler Profile</h2>
              <p className="text-xs text-[#514532]">Quick-start your evaluation session with a preset account.</p>
            </div>
            {user && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D6A4F]/10 text-[#2D6A4F] rounded-xl text-xs font-extrabold">
                <Zap className="w-4 h-4 text-[#2D6A4F]" />
                <span>Logged in as: {user.displayName}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleLogin('user-1')}
              disabled={isLoading}
              className="p-6 rounded-2xl border-2 border-[#2D6A4F]/30 hover:border-[#2D6A4F] bg-gradient-to-br from-white to-[#2D6A4F]/5 text-left transition transform hover:-translate-y-1 shadow-sm flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#2D6A4F] text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition">
                  U1
                </div>
                <div>
                  <div className="font-extrabold text-[#582F0E] text-base">Juan Dela Cruz</div>
                  <div className="text-xs text-[#3F6653] font-bold">Verified Traveler • user-1</div>
                </div>
              </div>
              <UserCheck className="w-6 h-6 text-[#2D6A4F] group-hover:translate-x-1 transition" />
            </button>

            <button
              onClick={() => handleLogin('admin-1')}
              disabled={isLoading}
              className="p-6 rounded-2xl border-2 border-[#7D5800]/30 hover:border-[#7D5800] bg-gradient-to-br from-white to-amber-50/50 text-left transition transform hover:-translate-y-1 shadow-sm flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#7D5800] text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition">
                  A1
                </div>
                <div>
                  <div className="font-extrabold text-[#582F0E] text-base">Administrator Seed</div>
                  <div className="text-xs text-[#7D5800] font-bold">Evaluation Account • admin-1</div>
                </div>
              </div>
              <ShieldCheck className="w-6 h-6 text-[#7D5800] group-hover:translate-x-1 transition" />
            </button>
          </div>

          <div className="pt-6 border-t border-[#D5C4AC]/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#582F0E]">Simulated Wallet Login</h3>
                <p className="text-xs text-[#514532]">Temporary prototype login. No real wallet or password is stored.</p>
              </div>
            </div>

            <form onSubmit={handleWalletLogin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-xs font-bold text-[#582F0E]">
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={2}
                  maxLength={50}
                  required
                  autoComplete="username"
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-[#D5C4AC] bg-white text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/30"
                  placeholder="Traveler name"
                />
              </label>
              <label className="text-xs font-bold text-[#582F0E]">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  autoComplete="current-password"
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-[#D5C4AC] bg-white text-sm outline-none focus:ring-2 focus:ring-[#2D6A4F]/30"
                  placeholder="Temporary password"
                />
              </label>
              <label className="md:col-span-2 flex items-center gap-2 text-xs font-bold text-[#514532]">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                Remember this session on this device
              </label>
              {loginError && <p role="alert" className="md:col-span-2 text-xs font-bold text-[#BC4749]">{loginError}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="md:col-span-2 inline-flex items-center justify-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] disabled:opacity-60 text-white font-extrabold py-3 px-6 rounded-xl transition"
              >
                <Wallet className="w-4 h-4" />
                {isLoading ? 'Connecting...' : 'Connect Simulated Wallet'}
              </button>
            </form>
          </div>
        </div>

        {/* Visual Gamified Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-[#D5C4AC]/40 shadow-sm space-y-3 hover:border-[#FFB703] transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#7D5800] flex items-center justify-center font-bold">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#582F0E]">Explore Destinations</h3>
            <p className="text-xs text-[#514532] leading-relaxed">
              Hundred Islands, Patar White Beach, Manaoag Shrine, and Dagupan Bangus spots.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#D5C4AC]/40 shadow-sm space-y-3 hover:border-[#2D6A4F] transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center font-bold">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#582F0E]">AR Radar Verification</h3>
            <p className="text-xs text-[#514532] leading-relaxed">
              Simulated AR radar camera scanner capturing GPS coordinates and target markers.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#D5C4AC]/40 shadow-sm space-y-3 hover:border-[#FFB703] transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#7D5800] flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-serif text-[#582F0E]">mJDQ Governance</h3>
            <p className="text-xs text-[#514532] leading-relaxed">
              Participate in paid binary voting on community-suggested spots. Fees follow the live
              governance config — a share is burned, the rest enters the reward escrow.
            </p>
          </div>
        </div>
      </div>
    </Navigation>
  );
}
