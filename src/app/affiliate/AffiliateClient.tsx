'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  Clock3,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Ticket,
  ArrowRight,
  Send,
  Building2,
  HelpCircle,
  Lock,
  ChevronDown,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth';
import { triggerCelebration } from '@/components/CelebrationEffects';

const STORAGE_KEY = 'jdq_merchant_application_v1';

const PANGASINAN_MUNICIPALITIES = [
  'Alaminos City (Hundred Islands)',
  'Dagupan City (Bangus Capital)',
  'Bolinao (Cape & Beaches)',
  'Lingayen (Provincial Capitol)',
  'San Carlos City',
  'Urdaneta City',
  'Calasiao (Puto Specialty)',
  'Manaoag (Minor Basilica)',
  'Dasol (Salt Capital)',
  'Burgos (Cabongaoan Beach)',
  'Anda (Tondol White Sand)',
  'Binmaley',
  'Sual',
  'Infanta',
  'Agno',
  'Mabini',
  'Bani',
  'San Fabian',
  'Mangaldan',
  'Bayambang',
  'Rosales',
  'Tayug',
  'Other Pangasinan Municipality',
];

const BUSINESS_CATEGORIES = [
  { id: 'dining', label: 'Food & Dining (Restaurant, Grill, Cafe, Street Food)' },
  { id: 'pasalubong', label: 'Souvenirs & Pasalubong (Bangus, Salt, Puto, Crafts)' },
  { id: 'lodging', label: 'Lodging & Homestay (Resort, Hotel, Transient House)' },
  { id: 'adventure', label: 'Adventure & Eco-Tours (Boat Tour, Island Hopping, Rental)' },
  { id: 'heritage', label: 'Cultural & Heritage (Artisan Workshop, Farm Tourism)' },
  { id: 'retail', label: 'Retail & Specialty Store' },
];

const SPONSORSHIP_OPTIONS = [
  { id: 'quest_stop', label: 'Co-sponsor an official tourism quest (checkpoint or arrival point)' },
  { id: 'voucher_perk', label: 'Offer $mJDQ reward vouchers & discounts in the Merchant Shop' },
  { id: 'map_pin', label: 'Feature our store with a verified business beacon on the interactive map' },
  { id: 'event_sponsor', label: 'Festival & seasonal tourism promotion partner' },
];

interface ApplicationData {
  businessName: string;
  category: string;
  municipality: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  sponsorshipGoals: string[];
  proposalDetails: string;
  submittedAt: string;
  referenceId: string;
  status: 'pending' | 'approved' | 'in_review';
}

export function AffiliateClient() {
  const { user } = useAuth();
  const [existingApp, setExistingApp] = useState<ApplicationData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState(BUSINESS_CATEGORIES[0].id);
  const [municipality, setMunicipality] = useState(PANGASINAN_MUNICIPALITIES[0]);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [sponsorshipGoals, setSponsorshipGoals] = useState<string[]>([
    'quest_stop',
    'voucher_perk',
  ]);
  const [proposalDetails, setProposalDetails] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing application from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ApplicationData;
        setExistingApp(parsed);
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  // Pre-fill user details if available and form is blank
  useEffect(() => {
    if (user && !contactName) {
      setContactName(user.displayName || '');
    }
    if (user && !contactEmail && user.email) {
      setContactEmail(user.email);
    }
  }, [user, contactName, contactEmail]);

  const toggleSponsorshipGoal = (id: string) => {
    setSponsorshipGoals((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStartEditing = () => {
    if (existingApp) {
      setBusinessName(existingApp.businessName);
      setCategory(existingApp.category);
      setMunicipality(existingApp.municipality);
      setContactName(existingApp.contactName);
      setContactEmail(existingApp.contactEmail);
      setContactPhone(existingApp.contactPhone);
      setSponsorshipGoals(existingApp.sponsorshipGoals);
      setProposalDetails(existingApp.proposalDetails);
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!businessName.trim()) {
      setFormError('Please enter your business or establishment name.');
      return;
    }
    if (!contactName.trim()) {
      setFormError('Please enter the owner or contact person name.');
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setFormError('Please enter a valid business contact email address.');
      return;
    }
    if (!contactPhone.trim() || contactPhone.length < 7) {
      setFormError('Please enter a valid contact phone number.');
      return;
    }
    if (sponsorshipGoals.length === 0) {
      setFormError('Please select at least one sponsorship or partnership goal.');
      return;
    }

    setIsSubmitting(true);

    const refId = `JDQ-MERCH-${Date.now().toString(36).toUpperCase()}`;
    const payload: ApplicationData = {
      businessName: businessName.trim(),
      category,
      municipality,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      sponsorshipGoals,
      proposalDetails: proposalDetails.trim(),
      submittedAt: new Date().toISOString(),
      referenceId: existingApp ? existingApp.referenceId : refId,
      status: 'pending',
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setExistingApp(payload);
      setIsFormOpen(false);
      triggerCelebration({ type: 'poppers', playAudio: true });
    } catch {
      // ignore storage write errors
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Navigation>
      <div className="mx-auto w-full max-w-5xl space-y-8 sm:space-y-10 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-border-default)] bg-white p-6 sm:p-10 shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
          />
          <div className="relative max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#2D6A4F] shadow-xs">
                <Store aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900">
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                Coming Soon • Merchant Portal
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-[#2D6A4F]">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[#FFB703]" />
                Applications Open
              </span>
            </div>

            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2D6A4F]">
              JuanDerQuest Merchant &amp; Partner Network
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#582F0E]">
              Merchant Affiliate Hub
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-[#514532]">
              Promote your local Pangasinan restaurant, resort, artisan shop, or tour service directly to thousands
              of active eco-travelers and quest hunters. While the full self-service analytics dashboard is in active
              development, local businesses can apply now to become an accredited merchant affiliate and co-sponsor
              official tourism quests.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {!existingApp || isFormOpen ? (
                <a
                  href="#apply-form"
                  onClick={() => setIsFormOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1B4332] active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>Apply to Become an Affiliate</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1B4332] active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>View / Edit Your Application</span>
                </button>
              )}
              <Link
                href="/quests"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[#FAF9F5] px-5 py-3 text-sm font-bold text-[#582F0E] transition hover:bg-white active:scale-98"
              >
                <Zap className="w-4 h-4 text-[#FFB703]" />
                <span>Browse Active Quests</span>
              </Link>
              <Link
                href="/shop"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-transparent px-5 py-3 text-sm font-bold text-[#582F0E] transition hover:bg-stone-50 active:scale-98"
              >
                <Ticket className="w-4 h-4 text-[#2D6A4F]" />
                <span>View Merchant Shop</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Existing Application Status Banner (if user already submitted) */}
        {existingApp && !isFormOpen && (
          <section
            aria-label="Your Application Status"
            className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-white p-6 sm:p-8 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-1">
                    <Clock3 className="w-3 h-3" />
                    <span>Application Under Review</span>
                  </div>
                  <h2 className="text-xl font-black text-[#582F0E]">
                    {existingApp.businessName}
                  </h2>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Reference Tracking Code
                </span>
                <code className="text-xs font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                  {existingApp.referenceId}
                </code>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#514532]">
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-gray-400 block text-[10px] font-bold">Municipality</span>
                <span className="font-bold text-[#582F0E]">{existingApp.municipality}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-gray-400 block text-[10px] font-bold">Contact Person</span>
                <span className="font-bold text-[#582F0E]">{existingApp.contactName}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-gray-400 block text-[10px] font-bold">Submitted Date</span>
                <span className="font-bold text-[#582F0E]">
                  {new Date(existingApp.submittedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-100/50 border border-emerald-200 text-xs text-[#2D6A4F] leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700" />
              <p>
                <strong>What happens next:</strong> Our Pangasinan tourism partner desk will review your
                establishment credentials within 24 to 48 business hours. Once accredited, you will receive an
                onboarding pack to configure quest bounties and live merchant shop vouchers.
              </p>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleStartEditing}
                className="text-xs font-bold text-[#2D6A4F] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Edit submitted application details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        )}

        {/* 4 Superpowers Grid */}
        <section aria-labelledby="merchant-perks-title" className="space-y-4">
          <div>
            <h2 id="merchant-perks-title" className="text-xl sm:text-2xl font-black text-[#582F0E]">
              Why Partner with JuanDerQuest?
            </h2>
            <p className="text-xs sm:text-sm text-[#837560]">
              Convert digital tourist curiosity into physical foot traffic at your cash register.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <article className="p-5 sm:p-6 rounded-2xl bg-white border border-[var(--color-border-default)] shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-[#582F0E]">
                  Quest Co-Sponsorship &amp; Waypoints
                </h3>
              </div>
              <p className="text-xs text-[#514532] leading-relaxed">
                Be designated as an official arrival checkpoint or reward claim hub for tourism quests.
                Travelers are guided to your venue by GPS to complete photo proofs and claim bounties.
              </p>
            </article>

            <article className="p-5 sm:p-6 rounded-2xl bg-white border border-[var(--color-border-default)] shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5 text-[#2D6A4F]" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-[#582F0E]">
                  Merchant Shop Voucher Redemption
                </h3>
              </div>
              <p className="text-xs text-[#514532] leading-relaxed">
                Offer exclusive dining discounts, tasting samplers, or pasalubong tokens in the in-app
                Merchant Shop. Explorers redeem their earned $mJDQ rewards right at your counter.
              </p>
            </article>

            <article className="p-5 sm:p-6 rounded-2xl bg-white border border-[var(--color-border-default)] shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-[#582F0E]">
                  Verified Sovereign Map Beacon
                </h3>
              </div>
              <p className="text-xs text-[#514532] leading-relaxed">
                Gain a verified merchant pin on our high-resolution OpenStreetMap Leaflet engine with
                sovereign turn-by-turn routing via the Valhalla OSM daemon.
              </p>
            </article>

            <article className="p-5 sm:p-6 rounded-2xl bg-white border border-[var(--color-border-default)] shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-[#582F0E]">
                  Foot-Traffic &amp; Sentiment Analytics
                </h3>
              </div>
              <p className="text-xs text-[#514532] leading-relaxed">
                Access verified arrival counters, peak traveler hour graphs, and authentic traveler
                endorsements from the Scout Field Logbook.
              </p>
            </article>
          </div>
        </section>

        {/* Sneak Peek: Upcoming Merchant Dashboard (Locked Preview) */}
        <section aria-labelledby="dashboard-preview-title" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 id="dashboard-preview-title" className="text-xl sm:text-2xl font-black text-[#582F0E]">
                Merchant Control Room Preview
              </h2>
              <p className="text-xs sm:text-sm text-[#837560]">
                A peek into the upcoming dashboard interface available to accredited merchant affiliates.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-mono font-bold text-gray-500">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span>Preview Mode</span>
            </span>
          </div>

          <div className="relative rounded-3xl border border-[var(--color-border-default)] bg-[#FAF9F5] p-5 sm:p-8 overflow-hidden space-y-6">
            {/* KPI Cards Mockup */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-[#E3DFD5] shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">
                  Verified Visitors
                </span>
                <p className="text-2xl font-black text-[#2D6A4F]">142</p>
                <span className="text-[10px] font-extrabold text-emerald-600">
                  ↑ +28% this month
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E3DFD5] shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">
                  $mJDQ Token Volume
                </span>
                <p className="text-2xl font-black text-amber-600">3,850</p>
                <span className="text-[10px] font-extrabold text-gray-500">
                  Redeemed by travelers
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E3DFD5] shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">
                  Active Vouchers
                </span>
                <p className="text-2xl font-black text-[#582F0E]">54</p>
                <span className="text-[10px] font-extrabold text-emerald-600">
                  3 active campaigns
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E3DFD5] shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">
                  Scout Rating
                </span>
                <p className="text-2xl font-black text-[#2D6A4F]">4.9 ★</p>
                <span className="text-[10px] font-extrabold text-gray-500">
                  92 verified reviews
                </span>
              </div>
            </div>

            {/* Active Quest Sponsorship Spotlight Card */}
            <div className="p-5 rounded-2xl bg-white border border-[#E3DFD5] space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E5DE]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                    🏆
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#582F0E]">
                      Hundred Islands Maritime Trail Quest
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Official Marine Checkpoint &amp; Rest Stop Sponsor
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Active Campaign
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#514532]">
                <span>
                  <strong>Perk Offered:</strong> 10% Off Lunch on 100 mJDQ Voucher
                </span>
                <span className="text-emerald-700 font-bold">
                  ✓ Geofence Radius Verification: 100m Active
                </span>
              </div>
            </div>

            {/* Teaser Overlay Banner */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-950">
                  Self-Service Campaign Creator Coming Soon
                </p>
                <p className="leading-relaxed">
                  The automated voucher generator and self-service quest sponsorship bidding tool are
                  currently in alpha engineering. Submit your application below to secure priority onboarding
                  and white-glove setup.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Application Form Section */}
        {(!existingApp || isFormOpen) && (
          <section
            id="apply-form"
            aria-labelledby="apply-form-title"
            className="rounded-3xl border border-[var(--color-border-default)] bg-white p-6 sm:p-10 shadow-sm space-y-6"
          >
            <div className="border-b border-[var(--color-border-default)] pb-4">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#2D6A4F] mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>Join the Merchant Network</span>
              </div>
              <h2 id="apply-form-title" className="text-2xl sm:text-3xl font-black text-[#582F0E]">
                Apply for Merchant Affiliate Accreditation
              </h2>
              <p className="text-xs sm:text-sm text-[#514532] mt-1">
                Complete this quick application to feature your establishment in quests, the interactive map,
                and the merchant voucher shop.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 animate-in fade-in"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="biz-name" className="text-xs font-bold text-[#582F0E] block">
                    Business / Establishment Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="biz-name"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Alaminos Bangus Grill & Pasalubong Center"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-default)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] bg-[#FAF9F5]"
                  />
                </div>

                {/* Business Category */}
                <div className="space-y-1.5">
                  <label htmlFor="biz-cat" className="text-xs font-bold text-[#582F0E] block">
                    Business Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="biz-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-default)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] bg-[#FAF9F5]"
                  >
                    {BUSINESS_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Municipality */}
                <div className="space-y-1.5">
                  <label htmlFor="biz-muni" className="text-xs font-bold text-[#582F0E] block">
                    Pangasinan Municipality <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="biz-muni"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-default)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] bg-[#FAF9F5]"
                  >
                    {PANGASINAN_MUNICIPALITIES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Name */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="text-xs font-bold text-[#582F0E] block">
                    Owner / Authorized Representative <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-default)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] bg-[#FAF9F5]"
                  />
                </div>

                {/* Contact Email */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="text-xs font-bold text-[#582F0E] block">
                    Business Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="merchant@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-default)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] bg-[#FAF9F5]"
                  />
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="contact-phone" className="text-xs font-bold text-[#582F0E] block">
                    Mobile / Telephone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. 0917-123-4567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-default)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] bg-[#FAF9F5]"
                  />
                </div>
              </div>

              {/* Sponsorship Goals Checkboxes */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-[#582F0E] block">
                  Desired Partnership &amp; Promotion Channels <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {SPONSORSHIP_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--color-border-default)] bg-[#FAF9F5] hover:bg-white transition cursor-pointer select-none text-xs text-[#514532]"
                    >
                      <input
                        type="checkbox"
                        checked={sponsorshipGoals.includes(opt.id)}
                        onChange={() => toggleSponsorshipGoal(opt.id)}
                        className="mt-0.5 rounded border-gray-300 text-[#2D6A4F] focus:ring-[#2D6A4F]"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Proposal Details */}
              <div className="space-y-1.5 pt-2">
                <label htmlFor="proposal" className="text-xs font-bold text-[#582F0E] block">
                  Perk or Sponsorship Concept (Optional)
                </label>
                <textarea
                  id="proposal"
                  rows={3}
                  value={proposalDetails}
                  onChange={(e) => setProposalDetails(e.target.value)}
                  placeholder="e.g. We would like to offer a 10% discount on fresh Bangus lunch to travelers who arrive via the Hundred Islands Trail Quest..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-default)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] bg-[#FAF9F5]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-[var(--color-border-default)]">
                {existingApp && isFormOpen && (
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-3 rounded-xl border border-[var(--color-border-default)] text-xs font-bold text-gray-600 hover:bg-stone-50 cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Submitting Application...'
                      : existingApp
                      ? 'Update Application'
                      : 'Submit Merchant Application'}
                  </span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Merchant FAQs */}
        <section aria-labelledby="merchant-faq-title" className="space-y-4">
          <div>
            <h2 id="merchant-faq-title" className="text-xl sm:text-2xl font-black text-[#582F0E]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#837560]">
              Everything you need to know about the JuanDerQuest Merchant Affiliate program.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              {
                q: 'Who can apply to become an affiliate merchant?',
                a: 'Any legally operating food establishment, resort, inn, craft artisan, boat tour operator, or tourism enterprise located within the 48 municipalities and cities of Pangasinan.',
              },
              {
                q: 'What does it mean to co-sponsor a quest?',
                a: 'When you sponsor a quest, your business location becomes an official waypoint or completion checkpoint. Travelers follow GPS directions to your venue to take verified arrival photos or claim quest rewards, guaranteeing foot traffic.',
              },
              {
                q: 'How does the $mJDQ voucher settlement work?',
                a: 'Travelers earn $mJDQ points by visiting cultural landmarks and completing eco-challenges. In the Merchant Shop, they can redeem these points for voucher tickets (e.g. 10% off meal or free souvenir). You verify the voucher on-site upon presentation.',
              },
              {
                q: 'Is there any fee to join during the Alpha pilot?',
                a: 'No. Participation during the initial alpha rollout is 100% free for approved local Pangasinan merchants as part of our academic tourism promotion initiative.',
              },
            ].map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-[var(--color-border-default)] bg-white overflow-hidden shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-[#582F0E] hover:bg-stone-50 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#514532] leading-relaxed border-t border-stone-100 bg-[#FAF9F5]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Footnote on Phase 2 & Governance */}
        <p className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-4 text-center text-xs leading-relaxed text-[#837560]">
          JuanDerQuest Merchant Affiliate Hub is an active academic research and tourism promotion initiative
          in partnership with Universidad de Dagupan. All applications are subject to community and LGU safety
          guidelines.
        </p>
      </div>
    </Navigation>
  );
}
