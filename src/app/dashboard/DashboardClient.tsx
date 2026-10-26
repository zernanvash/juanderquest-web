'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Compass,
  MapPin,
  Sparkles,
  Trophy,
  Flame,
  Award,
  Vote,
  Zap,
  ArrowRight,
  TrendingUp,
  History,
  CheckCircle2,
  Clock,
  ChevronRight,
  Users,
  ShieldCheck,
  Smartphone,
  Eye,
  PlusCircle,
  HelpCircle,
  Activity,
  Layers,
  Heart,
  Calendar,
  Store,
  Building2,
  Package,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/auth';
import {
  api,
  SpotModel,
  normalizeSpot,
  SubmissionModel,
  normalizeSubmission,
  fetchMerchantMe,
  fetchMyAffiliateApplication,
  MerchantMeModel,
  AffiliateApplicationModel,
} from '@/lib/api';
import { fetchMyEngagement, EngagementSummary } from '@/lib/engagement';
import { DestinationMedia } from '@/components/DestinationMedia';
import { HiddenGemHighlights } from '@/components/HiddenGemHighlights';
import { JuanChoiceRail } from '@/components/JuanChoiceRail';
import { DashboardQuizCard } from '@/components/DashboardQuizCard';
import { DashboardCalendar } from '@/components/DashboardCalendar';
import { DashboardQuestProgressPanel } from '@/components/DashboardQuestProgressPanel';
import { DailyStampsCard } from '@/components/stamps/DailyStampsCard';
import { QotdCard } from '@/components/stamps/QotdCard';
import { triggerCelebration } from '@/components/CelebrationEffects';
import { appRoutes } from '@/lib/routes';

export function DashboardClient() {
  const { user } = useAuth();

  // 1. Engagement, Streaks & Gamified Stats
  const [engagement, setEngagement] = useState<EngagementSummary | null>(null);
  const [loadingEngagement, setLoadingEngagement] = useState(true);

  // 2. Recent Activities (Submissions, verifications, visits)
  const [recentActivities, setRecentActivities] = useState<SubmissionModel[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // 3. Voting Overview
  const [votingStatus, setVotingStatus] = useState<{
    voting_enabled: boolean;
    notice?: string;
    hasActiveProposal?: boolean;
    activeCount?: number;
  }>({ voting_enabled: false });

  // 4. Merchant Status & Ownership
  const [merchantMe, setMerchantMe] = useState<MerchantMeModel | null>(null);
  const [affiliateApp, setAffiliateApp] = useState<AffiliateApplicationModel | null>(null);
  const [loadingMerchant, setLoadingMerchant] = useState(true);

  // 5. XP Toast / Celebrations
  const [bonusXp, setBonusXp] = useState<number>(0);

  // Load Dashboard Data
  useEffect(() => {
    let isMounted = true;

    // Load engagement / streaks / progress
    async function loadUserEngagement() {
      if (!user) {
        if (isMounted) setLoadingEngagement(false);
        return;
      }
      try {
        const data = await fetchMyEngagement();
        if (isMounted) setEngagement(data);
      } catch (err) {
        console.error('Failed to load engagement', err);
      } finally {
        if (isMounted) setLoadingEngagement(false);
      }
    }

    // Load recent activities
    async function loadActivities() {
      if (!user) {
        if (isMounted) setLoadingActivities(false);
        return;
      }
      try {
        const res = await api.get('/submissions');
        if (isMounted && res.data?.success && Array.isArray(res.data.data)) {
          setRecentActivities(res.data.data.slice(0, 5).map(normalizeSubmission));
        }
      } catch (err) {
        console.error('Failed to load activities', err);
      } finally {
        if (isMounted) setLoadingActivities(false);
      }
    }

    // Load voting availability
    async function loadVotingInfo() {
      try {
        const [overviewRes, proposalsRes] = await Promise.allSettled([
          api.get('/juanchoice/overview', { timeout: 4000 }),
          api.get('/proposals', { timeout: 4000 }),
        ]);

        let enabled = false;
        let noticeMsg = 'Voting window is currently closed';
        let activeProposalCount = 0;

        if (overviewRes.status === 'fulfilled' && overviewRes.value.data?.success) {
          const avail = overviewRes.value.data.data?.availability;
          enabled = Boolean(avail?.voting_enabled);
          if (overviewRes.value.data.data?.notice?.message) {
            noticeMsg = overviewRes.value.data.data.notice.message;
          }
        }

        if (proposalsRes.status === 'fulfilled' && proposalsRes.value.data?.success) {
          const list = proposalsRes.value.data.data;
          if (Array.isArray(list)) {
            activeProposalCount = list.filter((p: any) => p.state === 'voting' || p.state === 'active').length;
          }
        }

        if (isMounted) {
          setVotingStatus({
            voting_enabled: enabled,
            notice: noticeMsg,
            hasActiveProposal: activeProposalCount > 0,
            activeCount: activeProposalCount,
          });
        }
      } catch {
        // keep fallback
      }
    }

    // Load merchant ownership & application status
    async function loadMerchantData() {
      if (!user) {
        if (isMounted) setLoadingMerchant(false);
        return;
      }
      try {
        const [meRes, appRes] = await Promise.allSettled([
          fetchMerchantMe(),
          fetchMyAffiliateApplication(),
        ]);
        if (isMounted) {
          if (meRes.status === 'fulfilled') {
            setMerchantMe(meRes.value);
          }
          if (appRes.status === 'fulfilled' && appRes.value?.data) {
            setAffiliateApp(appRes.value.data);
          }
        }
      } catch {
        // fallback
      } finally {
        if (isMounted) setLoadingMerchant(false);
      }
    }

    loadUserEngagement();
    loadActivities();
    loadVotingInfo();
    loadMerchantData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Gamification Level calculations
  const totalPoints = (user?.points || 0) + bonusXp;
  const explorerLevel = Math.max(1, Math.floor(totalPoints / 50) + 1);
  const currentLevelProgress = Math.min(100, Math.round(((totalPoints % 50) / 50) * 100));
  const streakCount = engagement?.streak?.current ?? 1;
  const verifiedVisitsCount = engagement?.impact?.verified_visits ?? 0;
  const municipalitiesExplored = engagement?.impact?.municipalities ?? 1;

  const handleQuizPassed = (xp: number) => {
    setBonusXp((prev) => prev + xp);
    triggerCelebration({ type: 'poppers', playAudio: true });
  };

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to load Explorer Dashboard">
        <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto space-y-8 pb-16">
          {/* ======================================================== */}
          {/* 1. EXPEDITION & FESTIVAL CALENDAR (FULL ROW) */}
          {/* ======================================================== */}
          <DashboardCalendar />

          {/* ======================================================== */}
          {/* 2. DAILY PASSPORT STAMPS & REWARDS */}
          {/* ======================================================== */}
          <DailyStampsCard />

          {/* ======================================================== */}
          {/* 3. MAIN 2-COLUMN DASHBOARD GRID */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8-Column Area: Recommendations & Content */}
            <div className="lg:col-span-8 space-y-8">
              {/* SECTION: Merchant Workspace / Establishment Panel */}
              {merchantMe?.has_merchant && merchantMe.merchant ? (
                <section className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] text-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Store className="w-3 h-3 text-amber-300" /> Verified Tourism Partner
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          merchantMe.merchant.is_published
                            ? 'bg-emerald-300 text-emerald-950'
                            : 'bg-amber-300/20 text-amber-200 border border-amber-300/40'
                        }`}>
                          {merchantMe.merchant.is_published ? 'Published to Travelers' : 'Draft Mode'}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                        {merchantMe.merchant.name}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-emerald-100/90 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-300" />
                          {merchantMe.merchant.location}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{merchantMe.merchant.category || 'Establishment'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <Link
                        href="/merchant"
                        className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-[#1B4332] font-black text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 group cursor-pointer"
                      >
                        <span>Open Merchant Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                      <Link
                        href="/affiliate"
                        className="text-[11px] text-emerald-200/80 hover:text-white transition underline"
                      >
                        Partner Settings &amp; Info
                      </Link>
                    </div>
                  </div>
                </section>
              ) : affiliateApp ? (
                <section className="bg-white rounded-3xl p-6 border border-[#E3DFD5] shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F2EFE9] flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#2C221E]">{affiliateApp.business_name}</h3>
                        <p className="text-[10px] text-[#837560]">Merchant Affiliation Application • #{affiliateApp.id}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      affiliateApp.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : affiliateApp.status === 'needs_changes'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      {affiliateApp.status === 'received' && 'Under Evaluation'}
                      {affiliateApp.status === 'in_review' && 'Tourism Moderation In Review'}
                      {affiliateApp.status === 'needs_changes' && 'Changes Requested'}
                      {affiliateApp.status === 'approved' && 'Approved Partner'}
                      {affiliateApp.status === 'rejected' && 'Application Concluded'}
                    </span>
                  </div>

                  <p className="text-xs text-[#666] leading-relaxed">
                    {affiliateApp.status === 'needs_changes'
                      ? 'The moderation committee requested minor updates to your business information before opening your live showcase.'
                      : 'Your merchant application is in the official Pangasinan tourism moderation pipeline. Once approved, your catalog and coordinates will be published to explorers.'}
                  </p>

                  <div className="pt-1 flex items-center gap-3">
                    <Link
                      href="/affiliate"
                      className="px-4 py-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                    >
                      <span>{affiliateApp.status === 'needs_changes' ? 'Update & Resubmit' : 'View Application Progress'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </section>
              ) : (
                <section className="bg-[#FAF9F5] rounded-3xl p-5 border border-[#E3DFD5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-700/10 text-[#2D6A4F] flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5 text-[#2D6A4F]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-[#2C221E]">Run a Pangasinan Tourism Establishment?</h3>
                      <p className="text-[11px] text-[#837560] mt-0.5">
                        Get discovered by sovereign cultural travelers along scenic coastal trails. Zero listing fees.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/affiliate"
                    className="px-4 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold rounded-xl shrink-0 transition flex items-center justify-center gap-1"
                  >
                    <span>Partner Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </section>
              )}

              {/* SECTION: Quest Progress Panel (Ongoing Quests & Previous Done Quests - 3 rows) */}
              <section className="space-y-4">
                <DashboardQuestProgressPanel />
              </section>

              {/* SECTION: Cultural Knowledge Quizzes (Migrated Here) */}
              <section className="space-y-4">
                <DashboardQuizCard onPass={handleQuizPassed} />
              </section>

              {/* SECTION: JuanChoice Community Spotlight Rail */}
              <section className="space-y-4">
                <JuanChoiceRail />
              </section>
            </div>

            {/* Right 4-Column Area: Hidden Gems, Voting Status & Recent Activities */}
            <div className="lg:col-span-4 space-y-6">
              {/* Question of the Day (stamp mission) */}
              <QotdCard />

              {/* Standalone Hidden Gems Discovery Panel */}
              <HiddenGemHighlights />

              {/* Voting Availability Card */}
              <div className="bg-white rounded-3xl border border-[#E3DFD5] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F2EFE9]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                      <Vote className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#2C221E]">Community Voting</h3>
                      <p className="text-[10px] text-[#837560]">JuanChoice &amp; Municipal DAO</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    votingStatus.voting_enabled
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-stone-100 text-stone-600'
                  }`}>
                    {votingStatus.voting_enabled ? 'Active Round' : 'Between Rounds'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5]/70 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#582F0E]">
                    <Clock className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    <span>{votingStatus.notice || 'Round finalizing or between cycles.'}</span>
                  </div>
                  <p className="text-[11px] text-[#837560] leading-relaxed">
                    Participation in JuanChoice rounds increases your Round Streak counter and unlocks prestigious civic explorer badges.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <Link
                    href="/choice"
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-2xs group cursor-pointer"
                  >
                    <span>Open JuanChoice Voting</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/vote"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold transition border border-stone-200/80 group cursor-pointer"
                    >
                      <span className="truncate">Proposals</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
                    </Link>

                    <Link
                      href={`/profile/${user?.handle ? user.handle.replace(/^@/, '') : (user?.seedId || 'me')}?tab=badges`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 text-xs font-bold transition border border-amber-200/80 group cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Award className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="truncate">Badges</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-700 opacity-60 group-hover:opacity-100 shrink-0" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Recent Activities & Submissions Card */}
              <div className="bg-white rounded-3xl border border-[#E3DFD5] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F2EFE9]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-[#2D6A4F] flex items-center justify-center">
                      <Activity className="w-4 h-4 text-[#2D6A4F]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#2C221E]">Recent Activities</h3>
                      <p className="text-[10px] text-[#837560]">Your verified proofs &amp; trails</p>
                    </div>
                  </div>

                  <Link
                    href="/history"
                    className="text-[11px] font-bold text-[#2D6A4F] hover:underline"
                  >
                    All history
                  </Link>
                </div>

                {loadingActivities ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-stone-50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#837560] space-y-2">
                    <History className="w-8 h-8 mx-auto text-stone-300" />
                    <p>No recent submissions yet.</p>
                    <Link
                      href="/quests"
                      className="inline-block text-[#2D6A4F] font-bold hover:underline"
                    >
                      Complete a quest on mobile ↗
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5]/60 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-[#2C221E] truncate block">
                            {act.questTitle}
                          </span>
                          <span className="text-[10px] text-[#837560] block">
                            Pangasinan · {act.createdAt ? new Date(act.createdAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 ${
                          act.status === 'approved'
                            ? 'bg-emerald-100 text-[#2D6A4F]'
                            : act.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}
