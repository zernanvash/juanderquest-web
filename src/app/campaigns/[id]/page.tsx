'use client';

import React, { useEffect, useState, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Award,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Sparkles,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Gift,
  Compass,
  MessageCircle,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import {
  fetchCampaignById,
  fetchMyCampaignStatus,
  fetchCampaignReferralStats,
  reserveCampaignSlot,
  claimCampaignArrivalReward,
  CampaignModel,
  CampaignUserStatusModel,
  CampaignReferralStatsModel,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  const params = use(paramsPromise);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const refCodeFromUrl = searchParams.get('ref');

  const [campaign, setCampaign] = useState<CampaignModel | null>(null);
  const [userStatus, setUserStatus] = useState<CampaignUserStatusModel | null>(null);
  const [referralStats, setReferralStats] = useState<CampaignReferralStatsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reserving, setReserving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [timer, setTimer] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: false });

  // Load campaign & user stats
  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function loadData() {
      try {
        setLoading(true);
        const camp = await fetchCampaignById(params.id);
        setCampaign(camp);
        setTimer(calculateTimeRemaining(camp.eventDate));

        interval = setInterval(() => {
          setTimer(calculateTimeRemaining(camp.eventDate));
        }, 1000);

        // Fetch auth-scoped status if user exists
        if (user) {
          try {
            const [status, stats] = await Promise.all([
              fetchMyCampaignStatus(params.id),
              fetchCampaignReferralStats(params.id),
            ]);
            setUserStatus(status);
            setReferralStats(stats);
          } catch (e) {
            console.warn('Could not fetch user-scoped campaign status:', e);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [params.id, user]);

  const myReferralCode = user?.displayName?.toLowerCase().replace(/\s+/g, '_') || user?.id?.slice(0, 8) || 'scout';
  const myShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/campaigns/${params.id}?ref=${myReferralCode}`
    : `https://jdq.zernanvash.dev/campaigns/${params.id}?ref=${myReferralCode}`;

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(myShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const handleNativeShare = async () => {
    if (!campaign) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join me at ${campaign.title}!`,
          text: `Pre-register for ${campaign.title} on JuanDerQuest to earn +${(campaign.rewardPerParticipantMjdq / 1000).toLocaleString()} JDQ bounty!`,
          url: myShareUrl,
        });
      } catch (e) {
        console.log('Share canceled');
      }
    } else {
      handleCopyShareLink();
    }
  };

  const handleReserveSlot = async () => {
    if (!campaign) return;
    try {
      setReserving(true);
      const res = await reserveCampaignSlot(campaign.id, refCodeFromUrl || undefined);
      // Refresh status
      const updatedStatus = await fetchMyCampaignStatus(campaign.id);
      setUserStatus(updatedStatus);
      const updatedCamp = await fetchCampaignById(campaign.id);
      setCampaign(updatedCamp);
    } catch (err: any) {
      alert(err.message || 'Failed to reserve slot');
    } finally {
      setReserving(false);
    }
  };

  const handleClaimArrival = async () => {
    if (!campaign) return;
    try {
      setClaiming(true);
      const res = await claimCampaignArrivalReward(campaign.id);
      setClaimSuccess(`Successfully checked in! Awarded +${(res.awarded_mjdq / 1000).toLocaleString()} JDQ + 150 Scout Rep.`);
      const updatedStatus = await fetchMyCampaignStatus(campaign.id);
      setUserStatus(updatedStatus);
      const updatedCamp = await fetchCampaignById(campaign.id);
      setCampaign(updatedCamp);
    } catch (err: any) {
      alert(err.message || 'Failed to check in');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2C221E]">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 pt-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F] mx-auto" />
          <p className="text-xs font-semibold text-gray-500">Loading campaign details & escrow ledger...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2C221E]">
        <Navigation />
        <div className="max-w-md mx-auto px-4 pt-16 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-sm font-bold text-[#582F0E]">Campaign Not Found</h2>
          <p className="text-xs text-gray-600">{error || 'This campaign may have expired or does not exist.'}</p>
          <Link href="/campaigns" className="inline-block py-2 px-4 bg-[#2D6A4F] text-white text-xs font-bold rounded-lg">
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const reservedPercent = Math.min(100, Math.round((campaign.reservedParticipants / campaign.maxParticipants) * 100));

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2C221E] pb-24">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#582F0E] hover:text-[#2D6A4F] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Campaigns</span>
          </Link>
          <span className="text-[10px] font-mono text-gray-400">ID: {campaign.id}</span>
        </div>

        {/* Referred by Friend Notification Banner */}
        {refCodeFromUrl && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <Gift className="w-5 h-5 text-[#B45309] shrink-0" />
            <div className="text-xs text-[#78350F]">
              <span className="font-bold">You were invited by @{refCodeFromUrl}!</span> Pre-register below to lock in your early-bird event pass. You both earn bonus rewards upon arrival.
            </div>
          </div>
        )}

        {/* Hero Banner Header */}
        <div className="relative rounded-xl overflow-hidden bg-black text-white shadow-xs">
          <div className="h-64 sm:h-80 w-full relative">
            <img
              src={campaign.bannerImageUrl}
              alt={campaign.title}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
          </div>

          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between">
            <div className="flex items-center justify-between">
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

            <div className="space-y-2">
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

              {/* Bounty Reward Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E8E5DE]">
                <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                  <span className="text-[10px] text-gray-400 font-medium block">Participant Bounty</span>
                  <span className="text-xs font-bold text-emerald-700">
                    +{(campaign.rewardPerParticipantMjdq / 1000).toLocaleString()} JDQ
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                  <span className="text-[10px] text-gray-400 font-medium block">Promoter Referral</span>
                  <span className="text-xs font-bold text-amber-700">
                    +{(campaign.referralBountyMjdq / 1000).toLocaleString()} JDQ / Friend
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                  <span className="text-[10px] text-gray-400 font-medium block">Escrow Vault</span>
                  <span className="text-xs font-bold text-[#582F0E]">
                    {(campaign.totalBudgetMjdq / 1000).toLocaleString()} JDQ Locked
                  </span>
                </div>
              </div>
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
                  Complete these optional community landmarks before festival weekend to unlock VIP merchant discount passes on-site:
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

            {/* Promote & Earn Social Box */}
            <div className="bg-white rounded-xl p-6 border border-[#E3DFD5] space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#2D6A4F]" />
                  <h3 className="text-xs font-bold text-[#582F0E] uppercase tracking-wider">
                    Promoter Referral Workstation
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#B45309] bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">
                  +{(campaign.referralBountyMjdq / 1000).toLocaleString()} JDQ / Friend
                </span>
              </div>

              <p className="text-xs text-[#514532] leading-relaxed">
                Share your unique campaign link across social media (Facebook, Instagram, TikTok, or Group Chats). When friends pre-register and physically attend the event, referral bounties credit straight into your wallet!
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
                <span className="text-[10px] font-mono text-gray-400">Escrow Backed</span>
              </div>

              {/* Slot capacity meter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Participant Quota</span>
                  <span className="font-bold text-[#582F0E]">
                    {campaign.reservedParticipants} / {campaign.maxParticipants} Reserved ({reservedPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-[#2D6A4F] rounded-full transition-all"
                    style={{ width: `${reservedPercent}%` }}
                  />
                </div>
              </div>

              {/* User Registration Status Box */}
              {userStatus?.isCompleted ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-800">Event Check-In Completed!</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Arrival verified. Reward bounty credited to your wallet and Soulbound Civic Badge minted.
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
                        <span>Pre-Registration Confirmed</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        EARLY BIRD
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-md border border-[#E8E5DE] text-center space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase font-mono block">Your Digital Ticket Code</span>
                      <span className="text-base font-black font-mono text-[#2D6A4F] tracking-wider block">
                        {userStatus.ticketCode}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Present this pass or tap the Check-In button below when you arrive within the event's GPS geo-fence to claim your <b>+{(campaign.rewardPerParticipantMjdq / 1000).toLocaleString()} JDQ</b> bounty.
                    </p>
                  </div>

                  {/* Arrival Check-In Action Button */}
                  <button
                    onClick={handleClaimArrival}
                    disabled={claiming}
                    className="w-full py-3.5 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {claiming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Check-In & Claim Reward (+{(campaign.rewardPerParticipantMjdq / 1000).toLocaleString()} JDQ)</span>
                      </>
                    )}
                  </button>

                  {claimSuccess && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{claimSuccess}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-[#78350F] space-y-1">
                    <span className="font-bold block">Free Early-Bird Pre-Registration</span>
                    <span className="block text-[11px] leading-relaxed">
                      Reserve your slot now to guarantee your +{(campaign.rewardPerParticipantMjdq / 1000).toLocaleString()} JDQ arrival allocation from the host's locked escrow vault.
                    </span>
                  </div>

                  <button
                    onClick={handleReserveSlot}
                    disabled={reserving || campaign.reservedParticipants >= campaign.maxParticipants}
                    className="w-full py-3.5 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {reserving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>
                          {campaign.reservedParticipants >= campaign.maxParticipants
                            ? 'Capacity Reached'
                            : 'Pre-Register / Reserve Slot'}
                        </span>
                      </>
                    )}
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
      </main>
    </div>
  );
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ErrorBoundary>
      <CampaignDetailContent paramsPromise={params} />
    </ErrorBoundary>
  );
}
