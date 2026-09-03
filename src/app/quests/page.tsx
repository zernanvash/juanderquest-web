'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, normalizeQuest, QuestModel, fetchCampaigns, CampaignModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useRequireAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { QuestCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSavedLibrary } from '@/lib/saved-library';
import {
  Compass,
  MapPin,
  Award,
  ArrowRight,
  Trophy,
  ShieldCheck,
  Sparkles,
  Filter,
  Calendar,
  Clock,
  ChevronRight,
  Search,
  Zap,
  Flame,
  Users,
  Bookmark
} from 'lucide-react';

function calculateTimeRemaining(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, isPassed: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return { days, hours, minutes, isPassed: false };
}

function QuestsContent() {
  const { isReady } = useRequireAuth();
  const { toggle: toggleSaved, isSaved } = useSavedLibrary();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'trails' | 'campaigns'>(
    tabParam === 'campaigns' ? 'campaigns' : 'trails'
  );

  const [quests, setQuests] = useState<QuestModel[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTrailCategory, setActiveTrailCategory] = useState<string>('all');
  const [activeCampaignCategory, setActiveCampaignCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (tabParam === 'campaigns') {
      setActiveTab('campaigns');
    } else if (tabParam === 'trails') {
      setActiveTab('trails');
    }
  }, [tabParam]);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [questsRes, rawCampaigns] = await Promise.all([
        fetchWithCache(
          'quests_feed',
          async () => {
            const res = await api.get('/quests');
            if (!res.data?.success) throw new Error('Quest feed unavailable');
            return (res.data.data as Parameters<typeof normalizeQuest>[0][]).map(normalizeQuest);
          },
          { ttlMs: 120_000, forceRefresh }
        ),
        fetchCampaigns(),
      ]);

      setQuests(questsRes.data);
      setCampaigns(rawCampaigns);
    } catch {
      setError('Could not reach the quest and campaign server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const switchTab = (tab: 'trails' | 'campaigns') => {
    setActiveTab(tab);
    const url = tab === 'campaigns' ? '/quests?tab=campaigns' : '/quests';
    router.replace(url, { scroll: false });
  };

  const filteredQuests = useMemo(() => {
    return quests.filter((q) => {
      const matchCat = activeTrailCategory === 'all' || q.category === activeTrailCategory;
      const matchSearch =
        searchQuery === '' ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [quests, activeTrailCategory, searchQuery]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchCat = activeCampaignCategory === 'all' || c.category === activeCampaignCategory;
      const matchSearch =
        searchQuery === '' ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.municipality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [campaigns, activeCampaignCategory, searchQuery]);

  if (!isReady) return null;

  const trailCategories = [
    { id: 'all', label: 'All Trails' },
    { id: 'eco', label: '🏖️ Eco-Tourism' },
    { id: 'cultural', label: '🏛️ Cultural Heritage' },
    { id: 'food_trade', label: '🍜 Culinary' },
  ];

  const campaignCategories = [
    { id: 'all', label: 'All Campaigns' },
    { id: 'eco', label: '🌿 Eco-Cleanups' },
    { id: 'cultural', label: '🎭 Cultural Festivals' },
    { id: 'sports_adventure', label: '🏆 Sports & Adventure' },
    { id: 'food_trade', label: '🐟 Food & Agri-Trade' },
  ];

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Quest Trails & Campaigns">
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Header Banner & Sub-Feature Tabs */}
          <div className="bg-white rounded-xl border border-[#E3DFD5] p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[#2D6A4F] text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
                  <span>Gamified Tourism & Bounties Engine</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2C221E]">
                  Pangasinan Quest Trails & Campaigns
                </h1>
                <p className="text-xs sm:text-sm text-[#514532] leading-relaxed">
                  Complete permanent GPS check-in trails or join scheduled municipal pre-events and eco-raids to unlock escrow-backed rewards.
                </p>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="inline-flex p-1.5 rounded-xl bg-[#FAF9F5] border border-[#E3DFD5] self-start md:self-center">
                <button
                  onClick={() => switchTab('trails')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
                    activeTab === 'trails'
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'text-[#582F0E] hover:bg-white'
                  }`}
                >
                  <Zap className="w-4 h-4 text-[#FFB703]" />
                  <span>Ongoing Trails</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'trails' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {quests.length}
                  </span>
                </button>

                <button
                  onClick={() => switchTab('campaigns')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
                    activeTab === 'campaigns'
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'text-[#582F0E] hover:bg-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#FFB703]" />
                  <span>Event Campaigns</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'campaigns' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}`}>
                    {campaigns.length} Active
                  </span>
                </button>
              </div>
            </div>

            {/* Escrow Highlight Strip (Visible on Event Campaigns Tab) */}
            {activeTab === 'campaigns' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[#E8E5DE]">
                <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                  <span className="text-[10px] text-gray-500 uppercase font-medium block">Active Pre-Events</span>
                  <span className="text-base sm:text-lg font-bold text-[#2C221E]">{campaigns.length} Events Live</span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                  <span className="text-[10px] text-gray-500 uppercase font-medium block">Total Locked Escrow</span>
                  <span className="text-base sm:text-lg font-bold text-[#2D6A4F]">
                    {(campaigns.reduce((acc, c) => acc + c.totalBudgetMjdq, 0) / 1000).toLocaleString()} JDQ
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                  <span className="text-[10px] text-gray-500 uppercase font-medium block">Promoter Referral Rate</span>
                  <span className="text-base sm:text-lg font-bold text-[#B45309]">Up to 50 JDQ / Friend</span>
                </div>
              </div>
            )}
          </div>

          {/* Filter Chips & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Category Chips tailored to active sub-tab */}
            <div className="flex flex-wrap gap-2">
              {activeTab === 'trails'
                ? trailCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTrailCategory(cat.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98 ${
                        activeTrailCategory === cat.id
                          ? 'bg-[#2D6A4F] text-white shadow-xs'
                          : 'bg-white border border-[#E3DFD5] text-[#582F0E] hover:bg-[#FAF9F5]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))
                : campaignCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCampaignCategory(cat.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98 ${
                        activeCampaignCategory === cat.id
                          ? 'bg-[#2D6A4F] text-white shadow-xs'
                          : 'bg-white border border-[#E3DFD5] text-[#582F0E] hover:bg-[#FAF9F5]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeTab === 'trails' ? 'Search quest trails...' : 'Search event or town...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E3DFD5] rounded-lg pl-9 pr-3 py-2 text-xs text-[#2C221E] focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>
          </div>

          {/* Tab Content Display */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
              <QuestCardSkeleton />
              <QuestCardSkeleton />
              <QuestCardSkeleton />
            </div>
          ) : error ? (
            <div className="bg-white p-10 rounded-xl border border-red-200 text-center text-xs text-[#BC4749] space-y-3 shadow-xs">
              <p className="font-bold">{error}</p>
              <button
                onClick={() => loadData(true)}
                className="px-4 py-2 rounded-lg bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition cursor-pointer active:scale-98"
              >
                Retry Loading
              </button>
            </div>
          ) : activeTab === 'trails' ? (
            /* Ongoing Quest Trails Grid */
            filteredQuests.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-[#E3DFD5] text-center text-xs text-[#837560] shadow-xs">
                No quest trails match your filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredQuests.map((quest) => (
                  <article
                    key={quest.id}
                    className="bg-white rounded-xl border border-[#E3DFD5] hover:border-[#2D6A4F]/50 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition duration-200 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-[#FAF9F5] text-[#2D6A4F] border border-[#E3DFD5]">
                          {quest.category.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleSaved('quests', quest.id)}
                            aria-label={isSaved('quests', quest.id) ? `Remove ${quest.title} from saved quests` : `Save ${quest.title}`}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 cursor-pointer ${
                              isSaved('quests', quest.id)
                                ? 'border-amber-300 bg-amber-100/90 text-[#7D5800] shadow-2xs'
                                : 'border-[#E3DFD5] bg-white text-[#837560] hover:text-[#2D6A4F] hover:border-[#2D6A4F]/40'
                            }`}
                          >
                            <Bookmark className={`h-3.5 w-3.5 ${isSaved('quests', quest.id) ? 'fill-current text-[#B45309]' : ''}`} />
                          </button>
                          <div className="flex items-center gap-1.5 bg-[#FFB703] text-[#582F0E] text-xs font-black px-2.5 py-1 rounded-md shadow-xs">
                            <Award className="w-3.5 h-3.5" />
                            <span>+{quest.rewardPoints} PTS</span>
                          </div>
                        </div>
                      </div>

                      <h2 className="text-base font-bold text-[#2C221E] group-hover:text-[#2D6A4F] transition line-clamp-2">
                        {quest.title}
                      </h2>

                      <p className="text-xs text-[#514532] leading-relaxed line-clamp-3">
                        {quest.description}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#837560] pt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#2D6A4F]" />
                        <span className="truncate font-medium">{quest.locationName}</span>
                        <span className="shrink-0">• {quest.radiusMeters}m radius</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-[#E8E5DE] flex items-center justify-between gap-2">
                      <Link
                        href={`/navigate?name=${encodeURIComponent(quest.locationName)}&lat=${quest.gpsLat}&lng=${quest.gpsLng}&address=${encodeURIComponent(quest.locationName)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-[#2D6A4F] transition"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Navigate</span>
                      </Link>

                      <Link
                        href={`/quests/${quest.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold shadow-xs group-hover:translate-x-0.5 transition"
                      >
                        <span>Start Quest</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            /* Event Campaigns & Pre-Events Grid */
            filteredCampaigns.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-[#E3DFD5] text-center text-xs text-[#837560] shadow-xs">
                No event campaigns match your filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCampaigns.map((camp) => {
                  const timer = calculateTimeRemaining(camp.eventDate);
                  const reservedPercent = Math.min(100, Math.round((camp.reservedParticipants / camp.maxParticipants) * 100));

                  return (
                    <div
                      key={camp.id}
                      className="bg-white rounded-xl border border-[#E3DFD5] overflow-hidden flex flex-col hover:border-[#C7C2B4] transition shadow-xs"
                    >
                      {/* Banner Image with Badges */}
                      <div className="relative h-52 bg-gray-100 overflow-hidden">
                        <img
                          src={camp.bannerImageUrl}
                          alt={camp.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                        {/* Category Chip */}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider">
                            {camp.category.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Countdown Ticker Badge */}
                        <div className="absolute top-3 right-3">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-[#3C220E] text-xs font-bold shadow-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {timer.isPassed
                                ? 'Event Active'
                                : `Kickoff: ${timer.days}d ${timer.hours}h`}
                            </span>
                          </div>
                        </div>

                        {/* Location strip */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                          <div className="flex items-center gap-1.5 font-medium drop-shadow-xs truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#FFB703] shrink-0" />
                            <span className="truncate">{camp.locationName}</span>
                          </div>
                          <span className="text-[10px] text-gray-200 shrink-0 ml-2">
                            {new Date(camp.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Host: {camp.hostName}</span>
                          </div>
                          <h2 className="text-base sm:text-lg font-bold text-[#2C221E] leading-snug">
                            {camp.title}
                          </h2>
                          <p className="text-xs text-[#514532] line-clamp-2 leading-relaxed">
                            {camp.description}
                          </p>
                        </div>

                        {/* Bounty & Referral Highlights */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8E5DE]">
                          <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                            <span className="text-[10px] text-gray-400 font-medium block">Arrival Bounty</span>
                            <span className="text-xs font-bold text-emerald-700">
                              +{(camp.rewardPerParticipantMjdq / 1000).toLocaleString()} JDQ
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
                            <span className="text-[10px] text-gray-400 font-medium block">Promoter Bounty</span>
                            <span className="text-xs font-bold text-amber-700">
                              +{(camp.referralBountyMjdq / 1000).toLocaleString()} JDQ / Ref
                            </span>
                          </div>
                        </div>

                        {/* Pre-Registration Capacity Bar */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-500 font-medium">Reserved Quota</span>
                            <span className="font-bold text-[#582F0E]">
                              {camp.reservedParticipants} / {camp.maxParticipants} slots ({reservedPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-[#2D6A4F] rounded-full transition-all"
                              style={{ width: `${reservedPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Action Button */}
                        <Link
                          href={`/quests/campaigns/${camp.id}`}
                          className="w-full py-3 px-4 rounded-lg bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer mt-1"
                        >
                          <span>View Event & Pre-Register</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </ErrorBoundary>
    </Navigation>
  );
}

export default function QuestsPage() {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<Navigation><div className="p-8 text-center text-xs text-gray-500">Loading quests & events...</div></Navigation>}>
        <QuestsContent />
      </React.Suspense>
    </ErrorBoundary>
  );
}
