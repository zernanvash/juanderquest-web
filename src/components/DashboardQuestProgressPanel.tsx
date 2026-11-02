'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  MapPin,
  Trophy,
  History,
  AlertCircle,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react';
import { fetchSubmissions, QuestModel, SubmissionModel } from '@/lib/api';
import { fetchQuestCatalog } from '@/lib/quest-catalog';
import { useAuth } from '@/lib/auth';

interface DashboardQuestProgressPanelProps {
  className?: string;
}

export function DashboardQuestProgressPanel({ className = '' }: DashboardQuestProgressPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadQuestData() {
      try {
        setLoading(true);
        const [questsData, subsData] = await Promise.allSettled([
          fetchQuestCatalog(),
          user ? fetchSubmissions() : Promise.resolve([]),
        ]);

        if (isMounted) {
          if (questsData.status === 'fulfilled') {
            setQuests(questsData.value);
          }
          if (subsData.status === 'fulfilled') {
            setSubmissions(subsData.value);
          }
        }
      } catch (err) {
        console.error('Failed to load quest progress', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadQuestData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Approved submissions represent completed quests
  const completedSubmissions = submissions.filter((s) => s.status === 'approved');
  const completedQuestIds = new Set(completedSubmissions.map((s) => s.questId));
  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');

  // Completed quests: match completed submissions with quest metadata
  const completedItems = completedSubmissions.map((sub) => {
    const matchedQuest = quests.find((q) => q.id === sub.questId);
    return {
      id: sub.id,
      questId: sub.questId,
      title: sub.questTitle || matchedQuest?.title || 'Heritage Exploration',
      locationName: matchedQuest?.locationName || 'Pangasinan Destination',
      category: sub.category || matchedQuest?.category || 'eco',
      rewardPoints: sub.rewardPoints || matchedQuest?.rewardPoints || 50,
      completedAt: sub.reviewedAt || sub.createdAt,
      status: 'approved' as const,
    };
  });

  // Ongoing / signed-up quests: ONLY quests the user is actively engaged in
  // (e.g. proof submission in review/pending, or pre-registered/signed up)
  // If the user has not signed up or submitted proofs for any quest, this remains empty.
  const ongoingItems = pendingSubmissions.map((sub) => {
    const matchedQuest = quests.find((q) => q.id === sub.questId);
    return {
      id: sub.id,
      questId: sub.questId,
      title: sub.questTitle || matchedQuest?.title || 'Active Trail',
      locationName: matchedQuest?.locationName || 'Pangasinan Geofence',
      category: sub.category || matchedQuest?.category || 'eco',
      rewardPoints: sub.rewardPoints || matchedQuest?.rewardPoints || 50,
      stepsCount: Array.isArray(matchedQuest?.steps) && matchedQuest.steps.length > 0 ? matchedQuest.steps.length : 1,
      isPendingVerification: true,
      status: 'pending' as const,
    };
  });

  // Exactly up to 3 rows per request
  const displayedItems = activeTab === 'ongoing' ? ongoingItems.slice(0, 3) : completedItems.slice(0, 3);
  const ongoingCount = ongoingItems.length;
  const completedCount = completedItems.length;

  return (
    <section className={`bg-white rounded-3xl border border-[#E3DFD5] p-5 sm:p-6 shadow-xs space-y-4 ${className}`}>
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2EFE9]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-[#2D6A4F] flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-[#2D6A4F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#2C221E]">Quest Progress &amp; Trails</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-[#2D6A4F] border border-emerald-200">
                Pangasinan AR
              </span>
            </div>
            <p className="text-[10px] text-[#837560]">
              Track your active trails, submissions in review, and verified destinations
            </p>
          </div>
        </div>

        {/* Tab Toggle: Ongoing Quests vs Previous Done Quests */}
        <div className="flex items-center bg-[#FAF9F5] p-1 rounded-xl border border-[#E3DFD5] self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ongoing')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ongoing'
                ? 'bg-[#1B4332] text-white shadow-2xs'
                : 'text-[#837560] hover:text-[#2C221E]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Ongoing</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeTab === 'ongoing' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
            }`}>
              {ongoingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-[#1B4332] text-white shadow-2xs'
                : 'text-[#837560] hover:text-[#2C221E]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Previous Done</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
            }`}>
              {completedCount}
            </span>
          </button>
        </div>
      </div>

      {/* 3-Row Content Area */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-stone-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#837560] space-y-2">
          {activeTab === 'ongoing' ? (
            <>
              <Compass className="w-8 h-8 mx-auto text-stone-300" />
              <p className="font-semibold text-[#2C221E]">No ongoing quests right now</p>
              <p className="text-[11px] text-[#837560]">
                You haven&apos;t signed up for or started any quests yet. Browse the quest catalog to begin your journey.
              </p>
              <Link
                href="/quests"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2D6A4F] hover:underline pt-1"
              >
                <span>Browse Quests &amp; Trails</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </>
          ) : (
            <>
              <History className="w-8 h-8 mx-auto text-stone-300" />
              <p className="font-semibold text-[#2C221E]">No completed quests yet</p>
              <p className="text-[11px] text-[#837560]">
                Visit Pangasinan destinations and submit AR geofence proofs to earn mJDQ.
              </p>
              <Link
                href="/quests"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2D6A4F] hover:underline pt-1"
              >
                <span>Discover Quests to Complete</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedItems.map((item, idx) => {
            const isCompleted = activeTab === 'completed';
            const isPending = (item as any).status === 'pending';

            return (
              <div
                key={item.id}
                className="group p-3.5 sm:p-4 rounded-2xl bg-[#FAF9F5] hover:bg-[#F5F2EB] border border-[#E3DFD5]/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Quest Icon & Details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isCompleted
                      ? 'bg-emerald-100 text-[#2D6A4F]'
                      : isPending
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-50 text-[#1B4332]'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
                    ) : isPending ? (
                      <Clock className="w-4 h-4 text-amber-700" />
                    ) : (
                      <Zap className="w-4 h-4 text-[#2D6A4F]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-[#2C221E] group-hover:text-[#1B4332] transition truncate">
                        {item.title}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-[#166534]'
                          : isPending
                          ? 'bg-amber-100 text-[#92400E]'
                          : 'bg-stone-200/80 text-stone-700'
                      }`}>
                        {isCompleted ? 'Verified Proof' : isPending ? 'Review in Queue' : 'Active Trail'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#837560] mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#2D6A4F]" />
                        {item.locationName}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{item.category}</span>
                      {isCompleted && (item as any).completedAt && (
                        <>
                          <span>•</span>
                          <span>Verified {new Date((item as any).completedAt).toLocaleDateString()}</span>
                        </>
                      )}
                      {!isCompleted && (item as any).stepsCount && (
                        <>
                          <span>•</span>
                          <span>{(item as any).stepsCount} step{(item as any).stepsCount > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Reward Points Badge & Action CTA */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E4DC]">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-black">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>+{item.rewardPoints} mJDQ</span>
                  </div>

                  {isCompleted ? (
                    <Link
                      href="/history"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2D6A4F] hover:text-[#1B4332] transition"
                    >
                      <span>Proof Log</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href={`/quests/${item.questId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-2xs group/btn cursor-pointer"
                    >
                      <span>{isPending ? 'View Status' : 'Start Quest'}</span>
                      <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Panel Footer Navigation Links */}
      <div className="pt-2 flex items-center justify-between text-xs font-bold">
        <Link
          href="/quests"
          className="text-[#2D6A4F] hover:text-[#1B4332] flex items-center gap-1 transition"
        >
          <span>View all quests &amp; trails</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <Link
          href="/history"
          className="text-[#837560] hover:text-[#2C221E] transition flex items-center gap-1 text-[11px]"
        >
          <History className="w-3 h-3" />
          <span>Full Submission History</span>
        </Link>
      </div>
    </section>
  );
}
