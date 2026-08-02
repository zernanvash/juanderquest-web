'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { api, normalizeSubmission, SubmissionModel } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { User, Wallet, Award, History, Shield, Sparkles, Leaf, Utensils, Landmark } from 'lucide-react';

export default function ProfilePage() {
  const { user, wallet } = useAuth();
  const { isReady } = useRequireAuth();
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const res = await api.get('/submissions');
      if (res.data?.success) {
        setSubmissions((res.data.data as Parameters<typeof normalizeSubmission>[0][]).map(normalizeSubmission));
      }
    } catch (e) {
      // History is supplementary here; profile still renders from the live user object.
      console.error('Failed to load submission history', e);
    }
    setLoadingHistory(false);
  };

  if (!isReady) return null;

  const approvedCategories = new Set(
    submissions.filter((s) => s.status === 'approved').map((s) => s.category)
  );

  const badges = [
    { name: 'Eco Pioneer', icon: Leaf, desc: 'Complete an approved eco-tourism quest' },
    { name: 'Heritage Keeper', icon: Landmark, desc: 'Complete an approved cultural heritage quest' },
    { name: 'Food Explorer', icon: Utensils, desc: 'Complete an approved food & culinary quest' },
  ];

  return (
    <Navigation>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl p-8 border border-[#D5C4AC]/40 shadow-sm text-center flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-4 border-[#FFB703] overflow-hidden bg-amber-100 flex items-center justify-center font-bold text-2xl text-[#582F0E] shadow-md mb-4">
            {user ? user.displayName.charAt(0).toUpperCase() : 'J'}
          </div>

          <h1 className="text-2xl font-extrabold font-serif text-[#582F0E]">
            {user?.displayName || 'Traveler'}
          </h1>
          <p className="text-xs text-[#514532] mt-1">{user?.email}</p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3F6653]/15 text-[#3F6653] text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>{user?.role === 'admin' ? 'ADMINISTRATOR' : 'PANGASINAN EXPLORER'}</span>
          </div>
        </div>

        {/* Stats & Wallet Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#D5C4AC]/40 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2D6A4F]/15 text-[#2D6A4F] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#837560] uppercase">mJDQ Governance Wallet</div>
                <div className="text-sm font-extrabold text-[#2D6A4F]">
                  {wallet ? `${wallet.balanceMjdq} mJDQ (${wallet.balanceJdq} JDQ)` : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#D5C4AC]/40 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#7D5800] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#837560] uppercase">Demo Reward Points</div>
                <div className="text-sm font-extrabold text-[#7D5800]">
                  {user ? `${user.points} PTS` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Action Tile */}
        <Link
          href="/history"
          className="bg-white p-5 rounded-2xl border border-[#D5C4AC]/40 flex items-center justify-between shadow-sm hover:border-[#3F6653] transition group block"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFEEEA] text-[#7D5800] flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#582F0E]">Submissions & Proof History</div>
              <div className="text-xs text-[#837560]">
                {loadingHistory
                  ? 'Loading proof status...'
                  : `${submissions.length} submission${submissions.length === 1 ? '' : 's'} · ${approvedCategories.size} badge${approvedCategories.size === 1 ? '' : 's'} unlocked`}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-[#3F6653] group-hover:translate-x-1 transition">View History &rarr;</span>
        </Link>

        {/* Explorer Badges — unlocked only by real approved submissions */}
        <div className="bg-white rounded-3xl p-6 border border-[#D5C4AC]/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-serif text-[#582F0E]">Explorer Achievement Badges</h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#EFEEEA] text-[#837560]">
              UNLOCKED VIA APPROVED QUESTS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {badges.map((b) => {
              const Icon = b.icon;
              const unlocked = approvedCategories.has(b.name === 'Eco Pioneer' ? 'eco' : b.name === 'Heritage Keeper' ? 'cultural' : 'food_trade');
              return (
                <div
                  key={b.name}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center space-y-2 ${
                    unlocked
                      ? 'bg-amber-50/50 border-[#FFB703]'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      unlocked
                        ? 'bg-[#FFB703]/20 border-[#FFB703] text-[#7D5800]'
                        : 'bg-gray-200 border-gray-300 text-gray-400'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-[#582F0E]">{b.name}</div>
                  <div className="text-[10px] text-[#837560]">{unlocked ? 'Unlocked' : b.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Navigation>
  );
}
