'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Flame,
  Search,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { fetchCampaigns, CampaignModel } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function calculateTimeRemaining(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, isPassed: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return { days, hours, minutes, isPassed: false };
}

function CampaignsContent() {
  const [campaigns, setCampaigns] = useState<CampaignModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchCampaigns();
        setCampaigns(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
      const matchSearch =
        searchQuery === '' ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.municipality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [campaigns, selectedCategory, searchQuery]);

  const categories = [
    { id: 'all', label: 'All Campaigns' },
    { id: 'eco', label: '🌿 Eco-Cleanups' },
    { id: 'cultural', label: '🎭 Cultural Festivals' },
    { id: 'sports_adventure', label: '🏆 Sports & Adventure' },
    { id: 'food_trade', label: '🐟 Food & Agri-Trade' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2C221E] pb-24">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-8">
        {/* Editorial Header Section */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#E3DFD5] shadow-xs space-y-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[#2D6A4F] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
              <span>Municipal Pre-Events & Growth Campaigns</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2C221E]">
              Pangasinan Tourism Campaigns
            </h1>
            <p className="text-xs sm:text-sm text-[#514532] leading-relaxed">
              Explore upcoming municipal festivals, coastal eco-raids, and cultural tours. Pre-register to lock in early-bird reward allocations and earn referral bounties by inviting fellow travelers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[#E8E5DE]">
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
              <span className="text-[10px] text-gray-500 uppercase font-medium block">Active Campaigns</span>
              <span className="text-base sm:text-lg font-bold text-[#2C221E]">{campaigns.length} Events Live</span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
              <span className="text-[10px] text-gray-500 uppercase font-medium block">Escrow Reward Pool</span>
              <span className="text-base sm:text-lg font-bold text-[#2D6A4F]">
                {(campaigns.reduce((acc, c) => acc + c.totalBudgetMjdq, 0) / 1000).toLocaleString()} JDQ
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E3DFD5]">
              <span className="text-[10px] text-gray-500 uppercase font-medium block">Referral Bounties</span>
              <span className="text-base sm:text-lg font-bold text-[#B45309]">Up to 50 JDQ / Friend</span>
            </div>
          </div>
        </div>

        {/* Filter Chips & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2">
          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98 ${
                  selectedCategory === cat.id
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
              placeholder="Search event or town..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E3DFD5] rounded-lg pl-9 pr-3 py-2 text-xs text-[#2C221E] focus:outline-none focus:border-[#2D6A4F]"
            />
          </div>
        </div>

        {/* Campaign Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-xl p-6 border border-[#E3DFD5] animate-pulse space-y-4">
                <div className="h-48 bg-gray-200 rounded-lg" />
                <div className="h-4 bg-gray-200 rounded-sm w-3/4" />
                <div className="h-3 bg-gray-200 rounded-sm w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl p-8 border border-red-200 text-center space-y-3">
            <p className="text-xs text-red-600 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2D6A4F] text-white rounded-lg text-xs font-bold"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-[#E3DFD5] text-center space-y-3">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-[#582F0E]">No Campaigns Match Your Filter</h3>
            <p className="text-xs text-gray-500">Try selecting another category or clear your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
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
                      href={`/campaigns/${camp.id}`}
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
        )}
      </main>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <ErrorBoundary>
      <CampaignsContent />
    </ErrorBoundary>
  );
}
