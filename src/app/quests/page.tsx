'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, normalizeQuest, QuestModel, fetchCampaigns, CampaignModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { QuestCardSkeleton } from '@/components/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSavedLibrary } from '@/lib/saved-library';
import { appRoutes } from '@/lib/routes';
import { COPY, formatPoints } from '@/lib/copy';
import { DestinationMedia } from '@/components/DestinationMedia';
import {
  Compass,
  MapPin,
  Award,
  ArrowRight,
  Trophy,
  Sparkles,
  Filter,
  Calendar,
  Clock,
  ChevronRight,
  Search,
  Zap,
  Flame,
  Users,
  Bookmark,
  ArrowUp,
  Loader2,
} from 'lucide-react';

function isUsableQuestImage(url?: string | null): boolean {
  if (!url) return false;
  // Filter out the generic interior furniture stock photo used in some seed records
  if (url.includes('1513694203232-719a280e022f')) return false;
  return true;
}

function calculateTimeRemaining(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, isPassed: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return { days, hours, minutes, isPassed: false };
}

function QuestsContent() {
  const { user, isLoading } = useAuth();
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
  const [questError, setQuestError] = useState<string | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const error = activeTab === 'trails' ? questError : campaignError;

  const [activeTrailCategory, setActiveTrailCategory] = useState<string>('all');
  const [activeCampaignCategory, setActiveCampaignCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Progressive batch rendering / Infinite scroll adaptation
  const [visibleCount, setVisibleCount] = useState<number>(16);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabParam === 'campaigns') {
      setActiveTab('campaigns');
    } else if (tabParam === 'trails') {
      setActiveTab('trails');
    }
  }, [tabParam]);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setQuestError(null);
    setCampaignError(null);
    try {
      const [questsResult, campaignsResult] = await Promise.allSettled([
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

      if (questsResult.status === 'fulfilled') setQuests(questsResult.value.data);
      else setQuestError('Could not reach the quest server.');
      if (campaignsResult.status === 'fulfilled') setCampaigns(campaignsResult.value);
      else setCampaignError('Event previews could not be loaded.');
    } catch {
      setQuestError('Could not reach the quest server.');
      setCampaignError('Event previews could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handlePreviewChange = () => {
      loadData(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('jdq:preview-mode-changed', handlePreviewChange);
      return () => {
        window.removeEventListener('jdq:preview-mode-changed', handlePreviewChange);
      };
    }
  }, [loadData]);

  const switchTab = (tab: 'trails' | 'campaigns') => {
    setActiveTab(tab);
    const url = tab === 'campaigns' ? '/quests?tab=campaigns' : '/quests';
    router.replace(url, { scroll: false });
  };

  const { mainQuests, practiceQuests } = useMemo(() => {
    const matching = quests.filter((q) => {
      const matchCat = activeTrailCategory === 'all' || q.category === activeTrailCategory;
      const matchSearch =
        searchQuery === '' ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
    const main: QuestModel[] = [];
    const practice: QuestModel[] = [];
    for (const q of matching) {
      if (q.isTest || /^SIM\s*[•·-]/i.test(q.title)) {
        practice.push(q);
      } else {
        main.push(q);
      }
    }
    return { mainQuests: main, practiceQuests: practice };
  }, [quests, activeTrailCategory, searchQuery]);

  const filteredQuests = mainQuests;

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

  // Reset visible batch count on filter change
  useEffect(() => {
    setVisibleCount(16);
  }, [activeTab, activeTrailCategory, activeCampaignCategory, searchQuery]);

  // Adaptive infinite scroll sentinel observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { rootMargin: '500px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, activeTab]);

  const paginatedQuests = useMemo(() => {
    return filteredQuests.slice(0, visibleCount);
  }, [filteredQuests, visibleCount]);

  const paginatedCampaigns = useMemo(() => {
    return filteredCampaigns.slice(0, visibleCount);
  }, [filteredCampaigns, visibleCount]);

  const totalFilteredCount = activeTab === 'trails' ? filteredQuests.length : filteredCampaigns.length;
  const currentVisibleCount = Math.min(visibleCount, totalFilteredCount);
  const hasMoreToLoad = currentVisibleCount < totalFilteredCount;

  if (isLoading) return null;

  const trailCategories = [
    { id: 'all', label: 'All Eco-Quests' },
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

  const renderQuestCard = (quest: QuestModel) => {
    const hasPhoto = isUsableQuestImage(quest.markerImageUrl);
    return (
      <article
        key={quest.id}
        className="bg-white rounded-2xl border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]/50 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition duration-200 group"
      >
        <div className="space-y-3">
          <div className="relative w-full h-36 rounded-xl overflow-hidden bg-stone-100 shrink-0">
            {hasPhoto ? (
              <img
                src={quest.markerImageUrl!}
                alt={quest.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/illustrations/nature-coast.svg';
                }}
              />
            ) : (
              <DestinationMedia
                destinationName={quest.title}
                alt={quest.title}
                category={quest.category}
                municipality={quest.locationName}
                variant="illustration"
                className="w-full h-full"
              />
            )}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-white/95 text-[var(--color-brand-primary)] border border-white/40 shadow-xs backdrop-blur-xs">
                {quest.category.replace('_', ' ')}
              </span>
              {quest.isTest && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-100/95 text-amber-900 border border-amber-300">
                  Practice
                </span>
              )}
            </div>
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-[var(--color-brand-accent)] text-[var(--color-brand-brown)] text-xs font-black px-2.5 py-1 rounded-md shadow-xs">
                <Award className="w-3.5 h-3.5" />
                <span>{formatPoints(quest.rewardPoints, { signed: true })}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleSaved('quests', quest.id)}
                aria-label={isSaved('quests', quest.id) ? `Remove ${quest.title} from saved quests` : `Save ${quest.title}`}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 cursor-pointer ${
                  isSaved('quests', quest.id)
                    ? 'border-amber-300 bg-amber-100/95 text-[#7D5800] shadow-2xs'
                    : 'border-white/60 bg-white/90 text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)]'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isSaved('quests', quest.id) ? 'fill-current text-[#B45309]' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-[var(--color-brand-brown)] group-hover:text-[var(--color-brand-primary)] transition line-clamp-2 leading-snug">
              {quest.title.replace(/^SIM\s*[•·-]\s*/i, '')}
            </h2>

            <div className="flex items-center gap-1 text-[11px] text-[var(--color-brand-primary)] font-medium truncate pt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{quest.locationName}</span>
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
            {quest.description}
          </p>

          <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] font-medium pt-0.5">
            <span className="px-2 py-0.5 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)]">
              {quest.radiusMeters}m geofence
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              GPS Verified
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between gap-2">
          <Link
            href={`/navigate?name=${encodeURIComponent(quest.locationName)}&lat=${quest.gpsLat}&lng=${quest.gpsLng}&address=${encodeURIComponent(quest.locationName)}`}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)] transition py-1"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Directions</span>
          </Link>

          <Link
            href={appRoutes.quest(quest.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white text-xs font-bold shadow-xs group-hover:translate-x-0.5 transition active:scale-95"
          >
            <span>{COPY.quest.viewCta}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </article>
    );
  };

  return (
    <Navigation>
      <ErrorBoundary fallbackTitle="Unable to display Eco-Quests & Campaigns">
        <div className="space-y-6 w-full">
          {/* Header Banner & Sub-Feature Tabs */}
          <div className="bg-white rounded-2xl border border-[var(--color-border-default)] p-5 sm:p-7 lg:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-brand-primary)]/10 border border-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)] text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand-accent)]" />
                  <span>Location-Based Challenges &amp; Bounties</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[var(--color-brand-brown)]">
                  {COPY.quest.titlePlural}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                  Explore location-based Eco-Quests across Pangasinan. Physical visits on-site unlock points, badges, and verified traveler progression.
                </p>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="inline-flex p-1.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] self-start md:self-center shrink-0">
                <button
                  onClick={() => switchTab('trails')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
                    activeTab === 'trails'
                      ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                      : 'text-[var(--color-brand-brown)] hover:bg-white'
                  }`}
                >
                  <Zap className="w-4 h-4 text-[var(--color-brand-accent)]" />
                  <span>{COPY.quest.titlePlural}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'trails' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {mainQuests.length}
                  </span>
                </button>

                <button
                  onClick={() => switchTab('campaigns')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-98 ${
                    activeTab === 'campaigns'
                      ? 'bg-[var(--color-brand-primary)] text-white shadow-xs'
                      : 'text-[var(--color-brand-brown)] hover:bg-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[var(--color-brand-accent)]" />
                  <span>Event Campaigns</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'campaigns' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}`}>
                    {campaigns.length} Previews
                  </span>
                </button>
              </div>
            </div>

            {/* Event previews status bar */}
            {activeTab === 'campaigns' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
                <div className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium block">Event concepts</span>
                  <span className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">{campaigns.length} previews</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium block">Registration</span>
                  <span className="text-base sm:text-lg font-bold text-[var(--color-brand-primary)]">Under development</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium block">Rewards and referrals</span>
                  <span className="text-base sm:text-lg font-bold text-[var(--color-brand-accent-dark)]">Not available yet</span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium block">Pilot Territory</span>
                  <span className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">Pangasinan Coastal</span>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Controls Bar (Category Chips + Live Search + Quick Metric) */}
          <div className="sticky top-0 z-20 bg-[#FAF9F5]/90 backdrop-blur-md py-3 -mx-3 px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-y border-[var(--color-border-subtle)] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Category Chips tailored to active sub-tab */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {activeTab === 'trails'
                ? trailCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTrailCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 active:scale-98 ${
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
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 active:scale-98 ${
                        activeCampaignCategory === cat.id
                          ? 'bg-[#2D6A4F] text-white shadow-xs'
                          : 'bg-white border border-[#E3DFD5] text-[#582F0E] hover:bg-[#FAF9F5]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
            </div>

            {/* Search Input & Item Count */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="hidden md:inline text-xs font-semibold text-[var(--color-text-muted)]">
                {totalFilteredCount} {activeTab === 'trails' ? 'Eco-Quests' : 'campaigns'}
              </span>
              <div className="relative min-w-[200px] sm:min-w-[240px] flex-1 sm:flex-none">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={activeTab === 'trails' ? 'Search Eco-Quests, town, tag...' : 'Search event or town...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#E3DFD5] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#2C221E] focus:outline-none focus:border-[#2D6A4F] shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Tab Content Display */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5" aria-busy="true">
              <QuestCardSkeleton />
              <QuestCardSkeleton />
              <QuestCardSkeleton />
            </div>
          ) : error ? (
            <div className="bg-white p-10 rounded-2xl border border-red-200 text-center text-xs text-[#BC4749] space-y-3 shadow-xs">
              <p className="font-bold">{error}</p>
              <button
                onClick={() => loadData(true)}
                className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition cursor-pointer active:scale-98 shadow-xs"
              >
                Retry Loading
              </button>
            </div>
          ) : activeTab === 'trails' ? (
            /* Ongoing Eco-Quests Grid - Responsive 3 Columns */
            filteredQuests.length === 0 && practiceQuests.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#E3DFD5] text-center text-xs text-[#837560] shadow-xs">
                No Eco-Quests match your filter.
              </div>
            ) : (
              <div className="space-y-6">
                {paginatedQuests.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {paginatedQuests.map(renderQuestCard)}
                  </div>
                )}

                {practiceQuests.length > 0 && (
                  <details className="bg-white rounded-2xl border border-[#E3DFD5] p-4 sm:p-5 shadow-xs">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-xs sm:text-sm font-bold text-[#582F0E]">
                      <span>Practice &amp; Calibration Eco-Quests ({practiceQuests.length})</span>
                      <span className="text-[11px] font-semibold text-[#2D6A4F]">Show / Hide</span>
                    </summary>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      {practiceQuests.map(renderQuestCard)}
                    </div>
                  </details>
                )}

                {/* Adaptive Infinite Scroll Sentinel & Counter */}
                <div
                  ref={sentinelRef}
                  className="py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border-subtle)]"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span>
                      Showing {currentVisibleCount} of {totalFilteredCount} Eco-Quests
                    </span>
                    {hasMoreToLoad ? (
                      <span className="inline-flex items-center gap-1 text-[var(--color-brand-primary)] font-bold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading more Eco-Quests as you scroll...</span>
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">• All Eco-Quests displayed</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-subtle)] text-[var(--color-brand-brown)] font-bold transition active:scale-95 cursor-pointer shadow-2xs text-[11px]"
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>Top</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Event Campaigns & Pre-Events Grid - Responsive 3 Columns */
            filteredCampaigns.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#E3DFD5] text-center text-xs text-[#837560] shadow-xs">
                No event campaigns match your filter.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {paginatedCampaigns.map((camp) => {
                    const timer = calculateTimeRemaining(camp.eventDate);

                    return (
                      <div
                        key={camp.id}
                        className="bg-white rounded-2xl border border-[#E3DFD5] overflow-hidden flex flex-col hover:border-[#C7C2B4] transition shadow-xs group"
                      >
                        {/* Banner Image with Badges */}
                        <div className="relative h-48 sm:h-52 bg-gray-100 overflow-hidden">
                          <img
                            src={camp.bannerImageUrl}
                            alt={camp.title}
                            className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

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
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Host: {camp.hostName}</span>
                            </div>
                            <h2 className="text-base font-bold text-[#2C221E] leading-snug line-clamp-2">
                              {camp.title}
                            </h2>
                            <p className="text-xs text-[#514532] line-clamp-2 leading-relaxed">
                              {camp.description}
                            </p>
                          </div>

                          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                            Event registration, capacity, and rewards are under development.
                          </p>

                          {/* Action Button */}
                          <Link
                            href={appRoutes.campaign(camp.id)}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#2D6A4F] hover:bg-[#245740] text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-xs"
                          >
                            <span>View event preview</span>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Adaptive Infinite Scroll Sentinel for campaigns */}
                <div
                  ref={sentinelRef}
                  className="py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border-subtle)]"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span>
                      Showing {currentVisibleCount} of {totalFilteredCount} campaigns
                    </span>
                    {hasMoreToLoad ? (
                      <span className="inline-flex items-center gap-1 text-[var(--color-brand-primary)] font-bold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading more as you scroll...</span>
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">• All campaigns displayed</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-[var(--color-border-default)] bg-white hover:bg-[var(--color-bg-subtle)] text-[var(--color-brand-brown)] font-bold transition active:scale-95 cursor-pointer shadow-2xs text-[11px]"
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>Top</span>
                  </button>
                </div>
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
