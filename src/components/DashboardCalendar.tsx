'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD for multi-day
  municipality: string;
  category: 'festival' | 'eco_quest' | 'dao_voting' | 'cultural' | 'market';
  description: string;
  badge?: string;
  highlight?: boolean;
  spotId?: string;
  actionUrl?: string;
  actionLabel?: string;
  /** Plan 71: town name for `/map?area=` (omitted for province-wide events). */
  mapArea?: string;
}

// Authentic Pangasinan provincial festival, tourism, and community governance calendar
export const PANGASINAN_EVENTS: CalendarEvent[] = [
  {
    id: 'ev-bangus-fest-2026',
    mapArea: 'Dagupan',
    title: 'Dagupan Bangus Festival & Gilon-Gilon',
    date: '2026-10-18',
    endDate: '2026-10-24',
    municipality: 'Dagupan City',
    category: 'festival',
    description: 'Annual world-famous celebration honoring the milkfish capital with street dancing, culinary expositions, and grill promenades.',
    badge: 'Major Provincial Festival',
    highlight: true,
    spotId: 'spot-bonuan-blue-beach',
    actionUrl: '/spots/spot-bonuan-blue-beach',
    actionLabel: 'Explore Dagupan Hub',
  },
  {
    id: 'ev-pista-dayat-2026',
    mapArea: 'Lingayen',
    title: 'Pista’y Dayat (Sea & Coastal Festival)',
    date: '2026-10-26',
    endDate: '2026-10-28',
    municipality: 'Lingayen & Coastal LGUs',
    category: 'festival',
    description: 'Thanksgiving coastal festival along Lingayen Gulf featuring sand-sculpting competitions, coastal walks, and regatta races.',
    badge: 'Coastal Celebration',
    highlight: true,
    spotId: 'spot-lingayen-baywalk',
    actionUrl: '/spots/spot-lingayen-baywalk',
    actionLabel: 'View Lingayen Baywalk',
  },
  {
    id: 'ev-hundred-islands-cleanup',
    mapArea: 'Alaminos',
    title: 'Hundred Islands Marine Sanctuary Eco-Quest',
    date: '2026-10-14',
    municipality: 'Alaminos City',
    category: 'eco_quest',
    description: 'Low-tide marine park reef monitoring and Lucap gateway verification for registered eco-scouts.',
    badge: '+100 XP Bounty',
    spotId: 'spot-hundred-islands',
    actionUrl: '/quests',
    actionLabel: 'View Quest Info',
  },
  {
    id: 'ev-juanchoice-round-2',
    title: 'JuanChoice Community Spotlight: Round 2',
    date: '2026-10-20',
    endDate: '2026-10-25',
    municipality: 'Pangasinan-Wide (48 LGUs)',
    category: 'dao_voting',
    description: 'Vote for emerging hidden gems to receive spotlight allocation and provincial tourism promotion. Advances Round Streak.',
    badge: 'Civic Governance',
    highlight: true,
    actionUrl: '/choice',
    actionLabel: 'Enter JuanChoice',
  },
  {
    id: 'ev-puto-calasiao-weekend',
    mapArea: 'Calasiao',
    title: 'Calasiao Puto & Culinary Weekend Expo',
    date: '2026-10-17',
    municipality: 'Calasiao',
    category: 'market',
    description: 'Showcase of authentic bite-sized rice delicacies and regional northern Luzon trade stalls.',
    badge: 'Gastronomy Fair',
    actionUrl: '/explore',
    actionLabel: 'Explore Stalls',
  },
  {
    id: 'ev-bolinao-lighthouse-walk',
    mapArea: 'Bolinao',
    title: 'Cape Bolinao Historical Sunset Trail',
    date: '2026-10-24',
    municipality: 'Bolinao',
    category: 'cultural',
    description: 'Guided heritage walk from Punta Piedra Point to Cape Bolinao Lighthouse atop Punta de Piedra bluff.',
    badge: 'Heritage Walk',
    spotId: 'spot-cape-bolinao-lighthouse',
    actionUrl: '/spots/spot-cape-bolinao-lighthouse',
    actionLabel: 'View Lighthouse',
  },
  {
    id: 'ev-manaoag-pilgrim-feast',
    mapArea: 'Manaoag',
    title: 'Minor Basilica of Manaoag Rosary Assembly',
    date: '2026-10-11',
    municipality: 'Manaoag',
    category: 'cultural',
    description: 'Annual autumn veneration and historic bell-tower heritage exposition for northern Luzon travelers.',
    badge: 'Pilgrimage Heritage',
    spotId: 'spot-minor-basilica-of-manaoag',
    actionUrl: '/spots/spot-minor-basilica-of-manaoag',
    actionLabel: 'View Basilica Hub',
  },
  {
    id: 'ev-antong-falls-ecotrek',
    mapArea: 'Sison',
    title: 'Antong Falls Protected Watershed Eco-Trek',
    date: '2026-10-31',
    municipality: 'Sison',
    category: 'eco_quest',
    description: 'Forest reserve trail cleanup and geotagged spring documentation with indigenous guides.',
    badge: '+120 XP Bounty',
    spotId: 'spot-antong-falls',
    actionUrl: '/spots/spot-antong-falls',
    actionLabel: 'View Antong Falls',
  },
  {
    id: 'ev-tayug-sunflower-harvest',
    mapArea: 'Tayug',
    title: 'Tayug Agri-Park Sunflower Maze Opening',
    date: '2026-10-28',
    municipality: 'Tayug',
    category: 'market',
    description: 'Seasonal blooming opening of eastern Pangasinan’s agri-tourism sunflower landscape.',
    badge: 'Agri-Tourism',
    spotId: 'spot-tayug-sunflower-maze',
    actionUrl: '/spots/spot-tayug-sunflower-maze',
    actionLabel: 'View Sunflower Maze',
  },
];

const CATEGORY_STYLES: Record<
  CalendarEvent['category'],
  { label: string; badgeBg: string; text: string; border: string; dot: string; lightBg: string }
> = {
  festival: {
    label: 'Festival',
    badgeBg: 'bg-amber-100 text-amber-900',
    text: 'text-amber-800',
    border: 'border-amber-200/80',
    dot: 'bg-amber-500',
    lightBg: 'bg-amber-50/60',
  },
  eco_quest: {
    label: 'Eco-Quest',
    badgeBg: 'bg-emerald-100 text-emerald-900',
    text: 'text-emerald-800',
    border: 'border-emerald-200/80',
    dot: 'bg-emerald-500',
    lightBg: 'bg-emerald-50/60',
  },
  dao_voting: {
    label: 'Governance',
    badgeBg: 'bg-purple-100 text-purple-900',
    text: 'text-purple-800',
    border: 'border-purple-200/80',
    dot: 'bg-purple-500',
    lightBg: 'bg-purple-50/60',
  },
  cultural: {
    label: 'Heritage',
    badgeBg: 'bg-blue-100 text-blue-900',
    text: 'text-blue-800',
    border: 'border-blue-200/80',
    dot: 'bg-blue-500',
    lightBg: 'bg-blue-50/60',
  },
  market: {
    label: 'Food & Expo',
    badgeBg: 'bg-orange-100 text-orange-900',
    text: 'text-orange-800',
    border: 'border-orange-200/80',
    dot: 'bg-orange-500',
    lightBg: 'bg-orange-50/60',
  },
};

/** Festivals, heritage events and food fairs come back every year; one-off rounds and quests do not. */
const ANNUAL_CATEGORIES = new Set<CalendarEvent['category']>(['festival', 'cultural', 'market']);
const DAY_MS = 86_400_000;

/** Today's date in Manila as YYYY-MM-DD. */
export function manilaDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const shiftYear = (date: string, years: number) => `${Number(date.slice(0, 4)) + years}${date.slice(4)}`;

/**
 * Moves each annual event to its current or next occurrence (so the calendar never goes stale)
 * and drops one-off events that have ended. Dates stay YYYY-MM-DD strings.
 */
export function projectEvents(events: CalendarEvent[], today: string): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const ev of events) {
    const end = ev.endDate ?? ev.date;
    if (!ANNUAL_CATEGORIES.has(ev.category)) {
      if (end >= today) out.push(ev);
      continue;
    }
    let years = Number(today.slice(0, 4)) - Number(ev.date.slice(0, 4));
    if (shiftYear(end, years) < today) years += 1;
    out.push({ ...ev, date: shiftYear(ev.date, years), endDate: ev.endDate ? shiftYear(ev.endDate, years) : undefined });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** Whole days from `today` to `date` (both YYYY-MM-DD). */
export function daysBetween(today: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

export function countdownLabel(ev: CalendarEvent, today: string): string {
  if (ev.date <= today && (ev.endDate ?? ev.date) >= today) return ev.date === today && !ev.endDate ? 'Today' : 'Happening now';
  const days = daysBetween(today, ev.date);
  if (days === 1) return 'Tomorrow';
  if (days < 14) return `In ${days} days`;
  return `In ${Math.round(days / 7)} weeks`;
}

const formatDay = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...options });

export function DashboardCalendar({ today: todayProp }: { today?: string } = {}) {
  const today = todayProp ?? manilaDateString();
  const events = useMemo(() => projectEvents(PANGASINAN_EVENTS, today), [today]);
  const upcoming = useMemo(() => events.filter((ev) => (ev.endDate ?? ev.date) >= today).slice(0, 3), [events, today]);
  const firstFocus = upcoming[0] && upcoming[0].date > today ? upcoming[0].date : today;
  const [isExpandedGrid, setIsExpandedGrid] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date(Number(firstFocus.slice(0, 4)), Number(firstFocus.slice(5, 7)) - 1, 1));
  const [selectedDate, setSelectedDate] = useState<string>(firstFocus);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Month navigation
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const jumpTo = (date: string) => {
    setViewDate(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1));
    setSelectedDate(date);
  };
  const jumpToToday = () => jumpTo(today);

  // Days in month calculation
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedCategory !== 'all' && ev.category !== selectedCategory) return false;
      return true;
    });
  }, [events, selectedCategory]);

  // Map events to date strings
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      if (!ev.endDate || ev.endDate === ev.date) {
        if (!map[ev.date]) map[ev.date] = [];
        map[ev.date].push(ev);
      } else {
        const start = new Date(`${ev.date}T00:00:00Z`);
        const end = new Date(`${ev.endDate}T00:00:00Z`);
        const cur = new Date(start);
        while (cur <= end) {
          const key = cur.toISOString().split('T')[0];
          if (!map[key]) map[key] = [];
          map[key].push(ev);
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
      }
    });
    return map;
  }, [filteredEvents]);

  // Selected date events
  const activeEvents = useMemo(() => {
    return eventsByDate[selectedDate] || [];
  }, [eventsByDate, selectedDate]);

  // Total active events count in this month
  const monthEventsCount = (() => {
    const set = new Set<string>();
    Object.entries(eventsByDate).forEach(([d, evs]) => {
      if (d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
        evs.forEach((e) => set.add(e.id));
      }
    });
    return set.size;
  })();

  return (
    <section className="bg-white rounded-3xl border border-[#E3DFD5] shadow-xs overflow-hidden">
      {/* 1. Header Bar: Compact, High-Contrast & Streamlined */}
      <div className="bg-gradient-to-r from-[#173F31] via-[#1B4332] to-[#2D6A4F] text-white px-5 py-3.5 sm:px-6 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Expedition &amp; Festival Calendar
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/15">
                <Sparkles className="w-2.5 h-2.5" /> Pangasinan
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80">
              Provincial festivals, eco-bounties, voting rounds, and local cultural expos
            </p>
          </div>
        </div>

        {/* Category Filters (Pills) */}
        <div className="flex items-center gap-1.5 flex-wrap self-start md:self-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'festival', label: 'Festivals' },
            { id: 'eco_quest', label: 'Eco-Quests' },
            { id: 'dao_voting', label: 'Voting' },
          ].map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                  active
                    ? 'bg-amber-400 text-[#1B4332] font-black shadow-2xs'
                    : 'bg-white/10 text-emerald-50 hover:bg-white/20'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plan 71: compact "coming up" strip by default; the month grid opens on demand. */}
      <div className="px-4 pt-3 sm:px-5 lg:px-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-[#2C221E]">
          {isExpandedGrid ? `${monthName} ${year}` : 'Coming up in Pangasinan'}
          <span className="ml-2 text-[10px] font-bold text-[#837560]">Today · {formatDay(today, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </p>
        <button
          type="button"
          aria-expanded={isExpandedGrid}
          onClick={() => setIsExpandedGrid((open) => !open)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3DFD5] bg-[#FAF9F5] hover:bg-white px-2.5 py-1.5 text-[11px] font-black text-[#2D6A4F] transition cursor-pointer"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          {isExpandedGrid ? 'Collapse calendar' : 'Expand full month'}
        </button>
      </div>

      {!isExpandedGrid ? (
        <div className="p-4 sm:p-5 lg:p-6 pt-3 sm:pt-3 lg:pt-3">
          {upcoming.length === 0 ? (
            <p className="rounded-2xl border border-[#E3DFD5] bg-[#FAF9F5] p-4 text-xs text-[#837560]">No upcoming events listed yet.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="Upcoming events">
              {upcoming.map((ev) => {
                const style = CATEGORY_STYLES[ev.category];
                return (
                  <li key={ev.id} className={`min-w-0 rounded-2xl border ${style.border} ${style.lightBg} p-3.5 flex flex-col gap-2`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${style.badgeBg}`}>{style.label}</span>
                      <span className="text-[10px] font-black text-[#2C221E] bg-white/80 border border-black/5 rounded-full px-2 py-0.5 shrink-0">
                        {countdownLabel(ev, today)}
                      </span>
                    </div>
                    <h3 className="text-xs font-extrabold text-[#2C221E] leading-snug">{ev.title}</h3>
                    <p className="text-[10px] font-mono text-[#837560]">
                      {formatDay(ev.date, { month: 'short', day: 'numeric', ...(ev.date.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}) })}
                      {ev.endDate ? ` – ${formatDay(ev.endDate, { month: 'short', day: 'numeric' })}` : ''}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                      <TownPill ev={ev} />
                      {ev.actionUrl && (
                        <Link href={ev.actionUrl} className="text-[11px] font-extrabold text-[#2D6A4F] hover:underline">
                          {ev.actionLabel || 'View'} →
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
      <div className="p-4 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Month Matrix */}
        <div className="lg:col-span-7 space-y-3">
          {/* Month Controller */}
          <div className="flex items-center justify-between pb-2 border-b border-[#F2EFE9]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#2C221E]">
                {monthName} {year}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#2D6A4F] border border-emerald-200">
                {monthEventsCount} {monthEventsCount === 1 ? 'event' : 'events'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={jumpToToday}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#2C221E] transition cursor-pointer"
              >
                Today
              </button>

              <div className="flex items-center border border-[#E3DFD5] rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 hover:bg-stone-100 text-stone-600 transition cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-4 bg-[#E3DFD5]" />
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 hover:bg-stone-100 text-stone-600 transition cursor-pointer"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase text-[#837560] py-0.5">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-10 sm:h-12 rounded-xl bg-stone-50/40" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const events = eventsByDate[dateStr] || [];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === today;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative h-10 sm:h-12 p-1.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer select-none group ${
                    isSelected
                      ? 'bg-emerald-50 border-[#2D6A4F] ring-2 ring-[#2D6A4F]/25 shadow-xs'
                      : isToday
                      ? 'bg-amber-50/80 border-amber-300'
                      : events.length > 0
                      ? 'bg-[#FAF9F5] hover:bg-white border-[#E3DFD5] hover:border-[#2D6A4F]/50 shadow-2xs'
                      : 'bg-white border-[#F0ECE1] hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  <div className="flex items-center justify-between leading-none">
                    <span
                      className={`text-xs font-extrabold ${
                        isSelected
                          ? 'text-[#2D6A4F]'
                          : isToday
                          ? 'text-amber-900'
                          : 'text-[#2C221E]'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Today" />
                    )}
                  </div>

                  {/* Event indicators dots/chips */}
                  {events.length > 0 && (
                    <div className="flex items-center gap-1 overflow-hidden pt-0.5">
                      {events.slice(0, 3).map((ev) => {
                        const style = CATEGORY_STYLES[ev.category];
                        return (
                          <span
                            key={ev.id}
                            className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`}
                            title={`${ev.title} (${style.label})`}
                          />
                        );
                      })}
                      {events.length > 3 && (
                        <span className="text-[8px] font-black text-[#837560] leading-none">
                          +{events.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Category Legend */}
          <div className="flex items-center justify-between gap-2 pt-2.5 text-[10px] text-[#837560] flex-wrap border-t border-[#F2EFE9]">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-[#2C221E]">Legend:</span>
              {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
                <div key={key} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span>{style.label}</span>
                </div>
              ))}
            </div>

            <div className="font-bold text-[#2D6A4F]">
              {formatDay(selectedDate, { month: 'short', day: 'numeric' })}: {activeEvents.length} {activeEvents.length === 1 ? 'event' : 'events'}
            </div>
          </div>
        </div>

        {/* Right Column: Day Schedule & Event Details */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2EFE9]">
            <div>
              <span className="text-[10px] font-black uppercase text-[#837560] block tracking-wider">
                Schedule Feed
              </span>
              <h3 className="text-sm font-extrabold text-[#2C221E]">
                {formatDay(selectedDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-[#2C221E] text-[10px] font-extrabold">
              {activeEvents.length} {activeEvents.length === 1 ? 'Activity' : 'Activities'}
            </span>
          </div>

          {/* Event Cards Feed */}
          {activeEvents.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] space-y-2">
              <CalendarIcon className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-bold text-[#2C221E]">No scheduled activities on this date</p>
              <p className="text-[11px] text-[#837560] leading-relaxed">
                Click any highlighted date with colored dots on the calendar to inspect provincial festivities and eco-bounties.
              </p>
              {upcoming[0] && (
                <button
                  type="button"
                  onClick={() => jumpTo(upcoming[0].date)}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#2D6A4F] hover:underline cursor-pointer"
                >
                  <span>Jump to {upcoming[0].title} ({formatDay(upcoming[0].date, { month: 'short', day: 'numeric' })})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {activeEvents.map((ev) => {
                const style = CATEGORY_STYLES[ev.category];
                return (
                  <article
                    key={ev.id}
                    className={`p-4 rounded-2xl border ${style.border} ${style.lightBg} space-y-2 transition-all shadow-2xs hover:shadow-xs`}
                  >
                    {/* Event Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span
                          className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${style.badgeBg}`}
                        >
                          {ev.badge || style.label}
                        </span>
                        <h4 className="text-xs font-extrabold text-[#2C221E] leading-snug">
                          {ev.title}
                        </h4>
                      </div>

                      <TownPill ev={ev} />
                    </div>

                    {/* Event Description */}
                    <p className="text-xs text-[#514532] leading-relaxed">
                      {ev.description}
                    </p>

                    {/* Action Footer */}
                    <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-[#837560] font-mono">
                        {ev.endDate ? `${ev.date} – ${ev.endDate}` : ev.date}
                      </span>

                      {ev.actionUrl ? (
                        <Link
                          href={ev.actionUrl}
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-[#2D6A4F] hover:text-[#1B4332] hover:underline group cursor-pointer"
                        >
                          <span>{ev.actionLabel || 'View Activity'}</span>
                          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}
    </section>
  );
}

/** The event's town; opens the map focused on it when we know which town it is. */
function TownPill({ ev }: { ev: CalendarEvent }) {
  const body = (
    <>
      <MapPin className="w-3 h-3 text-[#2D6A4F] shrink-0" />
      <span className="truncate">{ev.municipality}</span>
    </>
  );
  if (!ev.mapArea) {
    return <span className="flex items-center gap-1 text-[10px] font-bold text-[#837560] min-w-0">{body}</span>;
  }
  return (
    <Link
      href={`/map?area=${encodeURIComponent(ev.mapArea)}`}
      title={`View ${ev.mapArea} on the map`}
      className="flex items-center gap-1 text-[10px] font-bold text-[#837560] hover:text-[#2D6A4F] hover:underline min-w-0"
    >
      {body}
    </Link>
  );
}
