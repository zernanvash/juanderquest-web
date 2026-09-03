import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Award,
  CalendarDays,
  Compass,
  Flag,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  Bookmark,
  Share2,
  type LucideIcon
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { findPublicTraveler, publicTravelerProfiles } from '@/lib/community';

export function generateStaticParams() {
  return publicTravelerProfiles.map(({ id }) => ({ id }));
}

export default async function PublicTravelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = findPublicTraveler(id);
  if (!profile) notFound();

  const stats: Array<{ label: string; value: number | string; subtext: string; icon: LucideIcon; color: string }> = [
    { label: 'Scout Level', value: `Lv. ${profile.scoutLevel}`, subtext: profile.title, icon: Award, color: 'text-[#B45309] bg-amber-100/70' },
    { label: 'Verified Places', value: profile.verifiedDestinations, subtext: 'On-site check-ins', icon: MapPin, color: 'text-[#2D6A4F] bg-emerald-100/70' },
    { label: 'Municipalities', value: `${profile.municipalitiesExplored} / 44`, subtext: 'Pangasinan towns', icon: Compass, color: 'text-blue-700 bg-blue-100/70' },
    { label: 'Contributions', value: profile.communityActivities, subtext: 'Community tips & logs', icon: Users, color: 'text-purple-700 bg-purple-100/70' },
  ];

  return (
    <Navigation>
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Prototype Transparency Pill */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-white to-amber-50/60 p-4 text-xs text-[#7D5800] shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-[#B45309] shrink-0" />
            <span>
              <strong>Privacy-Safe Public Passport:</strong> This preview showcases verified expedition achievements without exposing private wallet balances or precise GPS logs.
            </span>
          </div>
          <span className="shrink-0 rounded-full bg-amber-200/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#582F0E]">
            Prototype Spec
          </span>
        </div>

        {/* Profile Card with Cover Banner */}
        <section className="overflow-hidden rounded-3xl border border-[#E3DFD5] bg-white shadow-xs">
          {/* Panoramic Expedition Cover Banner */}
          <div className="relative h-36 sm:h-44 bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#40916C] overflow-hidden">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FAF9F5_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="absolute bottom-3 right-4 flex items-center gap-2 text-white/85 text-[10px] font-bold uppercase tracking-wider bg-black/25 px-3 py-1 rounded-full backdrop-blur-xs">
              <Compass className="h-3.5 w-3.5 text-[#FFB703]" />
              <span>Pangasinan Explorer Passport · 2026</span>
            </div>
          </div>

          <div className="px-6 pb-8 sm:px-8">
            <div className="-mt-14 sm:-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              
              {/* Avatar + Primary Identity Info */}
              <div className="flex min-w-0 flex-col gap-3.5 sm:flex-row sm:items-end">
                <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FFB703] to-[#F59E0B] text-2xl sm:text-3xl font-black text-[#582F0E] shadow-md ring-2 ring-[#2D6A4F]/20">
                  {profile.initials}
                  <span
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#2D6A4F] text-white shadow-xs"
                    title="Verified Community Scout"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#FFB703]" />
                  </span>
                </div>

                <div className="min-w-0 pb-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#2C221E] tracking-tight">
                      {profile.displayName}
                    </h1>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-[#2D6A4F] border border-emerald-200">
                      Level {profile.scoutLevel}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-[#837560]">{profile.handle}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#7D5800] border border-amber-200">
                      <Award className="h-3 w-3 text-[#B45309]" />
                      {profile.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#514532] font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-[#2D6A4F]" />
                      {profile.homeMunicipality}
                    </span>
                  </div>
                </div>
              </div>

              {/* Passport Seal Pill */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3DFD5] bg-[#FAF9F5] px-4 py-2 text-xs font-bold text-[#582F0E] shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5 text-[#FFB703]" />
                  <span>Public Traveler Passport</span>
                </span>
              </div>
            </div>

            {/* Bio & Travel Status */}
            <div className="mt-6 pt-5 border-t border-[#F2EFE9] space-y-3">
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-[#514532]">
                {profile.bio}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF9F5] border border-[#E3DFD5] px-3 py-1 text-[11px] font-bold text-[#2C221E]">
                  <Compass className="h-3.5 w-3.5 text-[#2D6A4F]" />
                  <span>{profile.status}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Expedition Metrics Grid */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, subtext, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-[#E3DFD5] bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#837560]">
                  Verified
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-[#2C221E] tracking-tight">{value}</div>
                <div className="text-xs font-bold text-[#582F0E] mt-0.5">{label}</div>
                <div className="text-[10px] text-[#837560] font-medium">{subtext}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Showcase & Timeline Section */}
        <div className="grid gap-6 lg:grid-cols-5 items-start">
          
          {/* Soulbound Achievement Showcase */}
          <section className="space-y-4 rounded-3xl border border-[#E3DFD5] bg-white p-5 sm:p-6 shadow-xs lg:col-span-3">
            <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-3">
              <div>
                <h2 className="font-serif text-base sm:text-lg font-black text-[#582F0E]">
                  Passport Showcase
                </h2>
                <p className="text-[11px] text-[#837560]">Curated Soulbound achievement badges</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-[#7D5800]">
                {profile.badges.length} Badges
              </span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {profile.badges.map((badge) => (
                <div
                  key={badge.name}
                  className="group relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-4 shadow-2xs hover:shadow-xs transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-[#7D5800] border border-amber-300/80 shadow-2xs">
                      <Sparkles className="h-5 w-5 text-[#B45309]" />
                    </div>
                    <span className="rounded-full bg-white/90 border border-amber-200 px-2 py-0.5 text-[9px] font-black uppercase text-[#B45309]">
                      Soulbound
                    </span>
                  </div>
                  <h3 className="mt-3 text-xs font-black text-[#582F0E] group-hover:text-[#2D6A4F] transition">
                    {badge.name}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#6B5E4C]">
                    {badge.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Public Activity Trail */}
          <section className="space-y-4 rounded-3xl border border-[#E3DFD5] bg-white p-5 sm:p-6 shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between border-b border-[#E8E5DE] pb-3">
              <div>
                <h2 className="font-serif text-base sm:text-lg font-black text-[#582F0E]">
                  Public Activity
                </h2>
                <p className="text-[11px] text-[#837560]">Recent verified actions &amp; logs</p>
              </div>
              <CalendarDays className="h-4 w-4 text-[#2D6A4F]" />
            </div>

            <div className="space-y-4 pt-1">
              {profile.recentActivity.map((activity, idx) => (
                <div key={`${activity.label}-${idx}`} className="relative pl-5 border-l-2 border-emerald-300/70 space-y-1 group">
                  <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[#2D6A4F] ring-4 ring-emerald-100" />
                  <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-[#2D6A4F] border border-emerald-200/60">
                    {activity.label}
                  </span>
                  <p className="text-xs font-bold text-[#2C221E] leading-snug">
                    {activity.detail}
                  </p>
                  <p className="text-[10px] text-[#837560] font-semibold">
                    {activity.period}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Security & Privacy Guarantee Callout */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E3DFD5] bg-[#FAF9F5] p-5 text-xs text-[#514532] shadow-2xs">
          <div className="flex items-center gap-3">
            <Flag className="h-5 w-5 text-[#2D6A4F] shrink-0" />
            <p className="leading-relaxed">
              <strong>Strict Privacy Standard:</strong> JuanDerQuest public profiles never expose wallet private balances, email addresses, exact live GPS coordinates, or private ballot votes.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white px-4 py-2 font-bold transition shadow-xs active:scale-95"
          >
            <span>Back to Feed</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </div>
    </Navigation>
  );
}
