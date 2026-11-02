'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RotateCcw,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { fetchSubmissions, type QuestModel, type SubmissionModel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fetchQuestCatalog } from '@/lib/quest-catalog';
import { CelebrationEffects, triggerCelebration } from '@/components/CelebrationEffects';

interface QuestJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type QuestCategoryFilter = 'all' | QuestModel['category'];

const QUEST_FILTERS: { id: QuestCategoryFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All Quests', icon: '🧭' },
  { id: 'eco', label: 'Eco', icon: '🌿' },
  { id: 'cultural', label: 'Cultural', icon: '🏛️' },
  { id: 'food_trade', label: 'Culinary', icon: '🍜' },
];

const QUEST_CATEGORY_BADGE_STYLES: Record<QuestModel['category'], string> = {
  eco: 'border-[#B8C6AA] bg-[#EEF2E7] text-[#496043]',
  cultural: 'border-[#C4B8D0] bg-[#F1EDF5] text-[#655777]',
  food_trade: 'border-[#D8BE91] bg-[#F7EEDC] text-[#765B35]',
};

export function QuestJournalModal({ isOpen, onClose }: QuestJournalModalProps) {
  const { user } = useAuth();
  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [submissionLoadResult, setSubmissionLoadResult] = useState<{
    userId: string;
    retryKey: number;
    submissions: SubmissionModel[];
    error: boolean;
  } | null>(null);
  const [activeFilter, setActiveFilter] = useState<QuestCategoryFilter>('all');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [rewardNotice, setRewardNotice] = useState<{ title: string; points: number } | null>(null);
  const [claimedQuestIds, setClaimedQuestIds] = useState<Set<string>>(() => new Set());
  const lastAttemptedRetry = useRef(0);

  const claimReward = (questId: string, notice: { title: string; points: number }) => {
    setClaimedQuestIds((claimed) => new Set(claimed).add(questId));
    setRewardNotice(notice);
    triggerCelebration({ type: 'poppers', particleCount: 36, playAudio: false });
  };

  useEffect(() => {
    if (!rewardNotice) return;
    const timeout = window.setTimeout(() => setRewardNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [rewardNotice]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const userId = user?.id;
    const forceRefresh = retryKey > lastAttemptedRetry.current;
    lastAttemptedRetry.current = retryKey;

    const loadCatalog = fetchQuestCatalog(forceRefresh);
    const loadSubmissions = userId ? fetchSubmissions() : Promise.resolve<SubmissionModel[]>([]);

    void Promise.allSettled([loadCatalog, loadSubmissions]).then(([catalogResult, submissionsResult]) => {
      if (!active) return;

      if (catalogResult.status === 'fulfilled') {
        setQuests(catalogResult.value);
        setError('');
      } else {
        setError('Could not load quests. Please try again.');
      }

      if (userId) {
        setSubmissionLoadResult({
          userId,
          retryKey,
          submissions: submissionsResult.status === 'fulfilled' ? submissionsResult.value : [],
          error: submissionsResult.status === 'rejected',
        });
      }
      setHasLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [isOpen, retryKey, user?.id]);

  if (!isOpen) return null;

  const filteredQuests = activeFilter === 'all'
    ? quests
    : quests.filter((quest) => quest.category === activeFilter);
  const isLoading = isOpen && !hasLoaded && !error;
  const currentSubmissionResult = user && submissionLoadResult?.userId === user.id &&
    submissionLoadResult.retryKey === retryKey
    ? submissionLoadResult
    : null;
  const submissions = currentSubmissionResult?.submissions ?? [];
  const submissionsLoaded = !user || currentSubmissionResult !== null;
  const submissionsError = currentSubmissionResult?.error ?? false;
  const submissionByQuest = new Map<string, SubmissionModel>();
  for (const submission of [...submissions].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  )) {
    const current = submissionByQuest.get(submission.questId);
    if (!current || (submission.status === 'approved' && current.status !== 'approved')) {
      submissionByQuest.set(submission.questId, submission);
    }
  }

  return (
    <>
    <CelebrationEffects />
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs animate-in fade-in duration-200 sm:p-4"
      onClick={onClose}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        className="quest-scroll-shell relative flex max-h-[90vh] w-full max-w-xl flex-col"
      >
        <div className="quest-scroll-roll quest-scroll-roll-top" aria-hidden="true" />

        <div className="quest-scroll-paper">
          <header className="quest-scroll-header relative z-10 flex h-10 shrink-0 items-center justify-center border-b-2 border-[#9A6035]/50 text-center text-[#572B20]">
            <h2 id="quest-modal-title" className="relative -top-[3px] whitespace-nowrap text-xl font-black tracking-tight leading-none">
              Quest Trails
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Quest Trails"
              className="quest-pixel-button quest-modal-close absolute right-4 z-20 flex h-7 w-7 items-center justify-center bg-[#7B382C] text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>

          <div className="shrink-0 border-b-2 border-dashed border-[#B68A55]/50 bg-[#EED9AE]/70 px-3 py-3 sm:px-5">
            <div role="group" aria-label="Filter quests by category" className="flex flex-wrap justify-center gap-[9px]">
              {QUEST_FILTERS.map((filter) => {
                const isActive = activeFilter === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    aria-pressed={isActive}
                    className={`quest-pixel-filter inline-flex items-center gap-1 px-2 py-1 text-[11px] font-extrabold ${
                      isActive
                        ? 'quest-pixel-filter-active bg-[#5C3A21] text-[#FFF8E1]'
                        : 'bg-[#F0DCB8] text-[#5C3A21] hover:bg-[#EAD2AA]'
                    }`}
                  >
                    <span aria-hidden="true">{filter.icon}</span>
                    <span>{filter.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        <div className="quest-scroll-list min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-[#55695A]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading quest trails…
            </div>
          ) : error ? (
            <div className="space-y-3 py-8 text-center">
              <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setHasLoaded(false);
                  setRetryKey((current) => current + 1);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#245C36] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1B4332]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : filteredQuests.length === 0 ? (
            <p className="py-12 text-center text-sm font-semibold text-[#55695A]">
              {quests.length === 0
                ? 'No quest trails are available right now.'
                : 'No quests in this category yet. Try another filter.'}
            </p>
          ) : (
            <>
              {submissionsError && (
                <div role="status" className="flex flex-wrap items-center justify-center gap-2 border-2 border-amber-700 bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-900">
                  <span>Quest progress could not be checked. Your status may be out of date.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasLoaded(false);
                      setRetryKey((current) => current + 1);
                    }}
                    className="underline underline-offset-2"
                  >
                    Refresh
                  </button>
                </div>
              )}
              {filteredQuests.map((quest) => {
                const submission = submissionByQuest.get(quest.id);
                const isApproved = submission?.status === 'approved';
                const isPending = submission?.status === 'pending';
                const isRejected = submission?.status === 'rejected';
                const rewardPoints = submission?.rewardPoints || quest.rewardPoints;
                const isClaimed = claimedQuestIds.has(quest.id);
                const showQuestStatus = !user || !submissionsLoaded || isApproved || isPending || isRejected;

                return (
                  <article
                    key={quest.id}
                    className="quest-parchment-card group border-2 border-[#A96735] bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <Link
                      href={`/quests/${quest.id}`}
                      onClick={onClose}
                      className="block rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold leading-tight text-[#1F452C]">
                              {quest.title}
                            </h3>
                            <span className={`quest-category-badge inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-normal ${
                              QUEST_CATEGORY_BADGE_STYLES[quest.category]
                            }`}>
                              <span aria-hidden="true">
                                {QUEST_FILTERS.find((filter) => filter.id === quest.category)?.icon}
                              </span>
                              {QUEST_FILTERS.find((filter) => filter.id === quest.category)?.label ?? quest.category.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#5D6B5F]">
                            {quest.description}
                          </p>
                        </div>
                        <span className={`quest-reward-stamp inline-flex shrink-0 items-center gap-1 border px-1.5 py-1 text-[9px] font-bold ${
                          isApproved
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-[#D8BE91] bg-[#F7EEDC] text-[#765B35]'
                        }`}>
                          <Sparkles className="h-3 w-3 text-[#B87921]" />
                          {isApproved ? `Earned +${rewardPoints}` : `+${quest.rewardPoints}`} mJDQ
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-[#6B5A47]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#245C36]" />
                          {quest.locationName}
                        </span>
                      </div>
                    </Link>

                    {showQuestStatus && (
                      <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed pt-2 text-[10px] font-black uppercase tracking-wide ${
                        isApproved
                          ? 'border-emerald-200 text-emerald-800'
                          : isPending
                            ? 'border-amber-200 text-amber-800'
                            : isRejected
                              ? 'border-red-200 text-red-800'
                              : 'border-[#EFEAE0] text-[#245C36]'
                      }`}>
                      <span className="inline-flex items-center gap-1.5">
                          {isApproved ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>{isClaimed ? 'Reward claimed' : 'Claim your reward!'}</span>
                            </>
                          ) : isPending ? (
                            <>
                              <Clock3 className="h-4 w-4" />
                              <span>Quest submitted · Reward after verification</span>
                            </>
                          ) : isRejected ? (
                            <>
                              <RotateCcw className="h-4 w-4" />
                              <span>Revise your proof to earn rewards</span>
                            </>
                          ) : user ? (
                            <>
                              <Clock3 className="h-4 w-4" />
                              <span>Checking your progress…</span>
                            </>
                          ) : (
                            <span>View quest trail</span>
                          )}
                      </span>
                      {isApproved && (
                          <button
                            type="button"
                            onClick={() => claimReward(quest.id, { title: quest.title, points: rewardPoints })}
                            disabled={isClaimed}
                            className="quest-pixel-button inline-flex items-center gap-1.5 border-emerald-950 bg-[#245C36] px-2 py-1.5 text-[9px] font-black text-white hover:bg-[#1B4332] disabled:cursor-default disabled:bg-emerald-900 disabled:opacity-90"
                          >
                            {isClaimed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            )}
                            {isClaimed ? 'Reward Claimed' : 'Claim your reward!'}
                          </button>
                      )}
                      </div>
                    )}
                    {isRejected && submission.rejectionReason && (
                      <p className="mt-2 flex items-start gap-1.5 border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-semibold leading-relaxed text-red-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Needs another try: {submission.rejectionReason}</span>
                      </p>
                    )}
                  </article>
                );
              })}
            </>
          )}
        </div>

        </div>

        <div className="quest-scroll-roll quest-scroll-roll-bottom" aria-hidden="true" />
      </section>
    </div>
    {rewardNotice && (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[120] flex w-[min(24rem,calc(100%-2.5rem))] items-start gap-3 border-4 border-emerald-950 bg-[#1B4332] p-4 text-white shadow-[5px_5px_0_#5a331b] animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-amber-300 bg-amber-400 text-emerald-950">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black uppercase tracking-wide text-amber-200">
            Reward received!
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed">
            {rewardNotice.title} is complete. +{rewardNotice.points} mJDQ was credited when your proof was approved.
          </span>
        </span>
        <button
          type="button"
          onClick={() => setRewardNotice(null)}
          aria-label="Dismiss reward notification"
          className="p-1 text-white/80 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )}
    </>
  );
}
