'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Calendar,
  MapPin,
  Users,
  Award,
  Share2,
  ChevronRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  Ticket,
  Flame,
  Loader2,
  Compass,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import {
  fetchCampaignById,
  fetchMyCampaignStatus,
  fetchCampaignReferralStats,
  CampaignModel,
  CampaignUserStatusModel,
  CampaignReferralStatsModel
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { appRoutes } from '@/lib/routes';

function calculateTimeRemaining(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isPassed: false };
}

function CampaignDetailContent({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
  const { id } = use(paramsPromise);

  const { user } = useAuth();
  const userId = user?.id;
  const [campaign, setCampaign] = useState<CampaignModel | null>(null);
  const [userStatus, setUserStatus] = useState<CampaignUserStatusModel | null>(null);
  const [referralStats, setReferralStats] = useState<CampaignReferralStatsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  const [timer, setTimer] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: false });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        setUserStatus(null);
        setReferralStats(null);
        const campData = await fetchCampaignById(id);
        setCampaign(campData);
        if (userId) {
          const [status, referrals] = await Promise.allSettled([
            fetchMyCampaignStatus(id),
            fetchCampaignReferralStats(id),
          ]);
          if (status.status === 'fulfilled') setUserStatus(status.value);
          if (referrals.status === 'fulfilled') setReferralStats(referrals.value);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, userId]);

  useEffect(() => {
    if (!campaign) return;
    setTimer(calculateTimeRemaining(campaign.eventDate));
    const interval = setInterval(() => {
      setTimer(calculateTimeRemaining(campaign.eventDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [campaign]);

  const myShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${appRoutes.campaign(id)}`
    : '';

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(myShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join me at ${campaign?.title || 'JuanDerQuest Event'}!`,
          text: `Preview this community event concept. Registration and rewards are under development:`,
          url: myShareUrl,
        });
      } catch (err) {
        // Ignored if cancelled
      }
    } else {
      handleCopyShareLink();
    }
  };

  if (loading) {
    return (
      <Navigation>
        <div className="max-w-4xl mx-auto px-4 pt-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F] mx-auto" />
          <p className="text-xs font-semibold text-gray-500">Loading event preview...</p>
        </div>
      </Navigation>
    );
  }

  if (error || !campaign) {
    return (
      <Navigation>
        <div className="max-w-md mx-auto px-4 pt-16 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-sm font-bold text-[#582F0E]">Campaign Not Found</h2>
          <p className="text-xs text-gray-600">{error || 'This campaign may have expired or does not exist.'}</p>
          <Link href="/quests?tab=campaigns" className="inline-block py-2 px-4 bg-[#2D6A4F] text-white text-xs font-bold rounded-lg">
            Back to Quests & Events
          </Link>
        </div>
      </Navigation>
    );
  }


  return (
    <Navigation>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/quests?tab=campaigns"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#582F0E] hover:text-[#2D6A4F] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quests & Events</span>
          </Link>
          <span className="text-[10px] font-mono text-gray-400">ID: {campaign.id}</span>
        </div>

        {/* Hero Banner Header */}
        <div className="relative rounded-xl overflow-hidden bg-black text-white shadow-xs">
          <div className="min-h-[280px] sm:min-h-[340px] w-full relative">
            <img
              src={campaign.bannerImageUrl}
              alt={campaign.title}
              className="w-full h-full object-cover opacity-80 absolute inset-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

            <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between min-h-[280px] sm:min-h-[340px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-md bg-white/20 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider">
                  {campaign.category.replace('_', ' ')}
                </span>

                {/* Ticker Timer */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 text-[#3C220E] text-xs font-bold shadow-xs">
                  <Clock className="w-4 h-4" />
                  <span>
                    {timer.isPassed
                      ? 'Event in Progress'
                      : `Kickoff in: ${timer.days}d ${timer.hours}h ${timer.minutes}m ${timer.seconds}s`}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Host: {campaign.hostName}</span>
                </div>
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                  {campaign.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-200 pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#FFB703]" />
                    <span>{campaign.locationName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>{new Date(campaign.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Split: Narrative on Left (7 cols), Pre-Registration Ticket Workbench on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Details & Pre-Quest Checklist (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Overview Card */}
            <div className="bg-white rounded-xl p-6 border border-[#E3DFD5] space-y-4 shadow-xs">
              <h2 className="text-sm font-bold text-[#582F0E] uppercase tracking-wider">
                Event Description & Mission:
              </h2>
              <p className="text-xs sm:text-sm text-[#514532] leading-relaxed">
                {campaign.description}
              </p>

              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Event budgets, rewards, and merchant discounts are prototype ideas. No funds are locked and no rewards can be claimed.
              </p>
            </div>

            {/* Pre-Quest Warm-up Requirements */}
            {campaign.preQuestRequirements && campaign.preQuestRequirements.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-[#E3DFD5] space-y-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#2D6A4F]" />
                  <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                    Warm-Up Pre-Quest Objectives:
                  </h3>
                </div>
                <p className="text-xs text-gray-500">
                  These are proposed objectives only. They do not unlock passes or rewards yet:
                </p>
                <div className="space-y-2 pt-1">
                  {campaign.preQuestRequirements.map((req, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] flex items-center gap-2.5 text-xs text-[#514532]">
                      <div className="w-5 h-5 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shareable event preview; referral rewards are disabled. */}
            <div className="bg-white rounded-xl p-6 border border-[#E3DFD5] space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#2D6A4F]" />
                  <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                    Share event preview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#B45309] bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">
                  Referrals under development
                </span>
              </div>

              <p className="text-xs text-[#514532] leading-relaxed">
                Share this event preview. Referral tracking and bounty payouts are under development.
              </p>

              {/* Copy Link Input Bar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={myShareUrl}
                  className="flex-1 bg-[#FAF9F5] border border-[#E3DFD5] rounded-lg px-3 py-2.5 text-xs font-mono text-[#2D6A4F] font-bold truncate focus:outline-none"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="py-2.5 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-98 cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Native Social Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleNativeShare}
                  className="py-2 px-3.5 rounded-lg bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] text-[#582F0E] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-98"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Share Link</span>
                </button>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(myShareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3.5 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 text-[#1877F2] text-xs font-bold flex items-center gap-1.5 transition active:scale-98"
                >
                  <span>Facebook</span>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me at ${campaign.title} on JuanDerQuest! Claim your event slot:`)}&url=${encodeURIComponent(myShareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-98"
                >
                  <span>X (Twitter)</span>
                </a>
              </div>

              {/* User Referral Dashboard Counter */}
              {referralStats && (
                <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] grid grid-cols-3 gap-2 text-center text-xs pt-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-medium block">Invited Friends</span>
                    <span className="text-sm font-bold text-[#2C221E]">{referralStats.totalInvited}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-medium block">Verified Attended</span>
                    <span className="text-sm font-bold text-emerald-700">{referralStats.totalAttended}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-medium block">Earned Bounty</span>
                    <span className="text-sm font-bold text-[#B45309]">
                      +{(referralStats.totalEarnedMjdq / 1000).toLocaleString()} JDQ
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pre-Registration & Live Ticket Workbench (5 cols) */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#E3DFD5] space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-[#2D6A4F]" />
                  <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                    Event Access Workbench
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-gray-400">Prototype preview</span>
              </div>

              <p className="text-xs text-[#514532]">Registration and live capacity are unavailable in this prototype.</p>

              {/* User Registration Status Box */}
              {userStatus?.isCompleted ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-800">Prototype check-in record</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    This is a historical prototype status. Event reward verification and Soulbound badge minting are under development.
                  </p>
                  <div className="text-[11px] font-mono text-gray-500 pt-1">
                    Ticket Ref: {userStatus.ticketCode}
                  </div>
                </div>
              ) : userStatus?.isRegistered ? (
                <div className="space-y-4">
                  {/* Verified Ticket Card */}
                  <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Prototype ticket record</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        NOT A LIVE PASS
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-md border border-[#E8E5DE] text-center space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase font-mono block">Prototype ticket reference</span>
                      <span className="text-base font-black font-mono text-[#2D6A4F] tracking-wider block">
                        {userStatus.ticketCode}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      This legacy event pass is a prototype. Check-in rewards are under development and cannot be claimed yet.
                    </p>
                  </div>

                  {/* Arrival Check-In Action Button */}
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Check-in under development</span>
                  </button>

                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-[#78350F] space-y-1">
                    <span className="font-bold block">Registration under development</span>
                    <span className="block text-[11px] leading-relaxed">
                      Event registration and reward allocation are under development. No slot or bounty can be guaranteed yet.
                    </span>
                  </div>

                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>Registration under development</span>
                  </button>
                </div>
              )}

              {/* Navigation Direction CTA */}
              <Link
                href={`/navigate?lat=${campaign.gpsLat || 16.0}&lng=${campaign.gpsLng || 120.0}&name=${encodeURIComponent(campaign.locationName)}`}
                className="w-full py-2.5 px-4 rounded-lg bg-[#FAF9F5] hover:bg-white border border-[#E3DFD5] text-[#582F0E] text-xs font-bold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[#2D6A4F]" />
                <span>Navigate to Event Location</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Navigation>
  );
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<Navigation><div className="p-8 text-center text-xs text-gray-500">Loading campaign details...</div></Navigation>}>
        <CampaignDetailContent paramsPromise={params} />
      </React.Suspense>
    </ErrorBoundary>
  );
}
