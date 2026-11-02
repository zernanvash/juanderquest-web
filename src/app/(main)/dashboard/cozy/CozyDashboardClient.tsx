'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Sparkles,
  Bell,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { MiniMapPreview } from '@/components/MiniMapPreview';
import { SAMPLE_USER_BADGES, UserBadge } from '@/lib/badges';
import { triggerCelebration } from '@/components/CelebrationEffects';
import { QuestJournalModal } from '@/components/QuestJournalModal';

// Pre-registered expeditions and events
interface RegisteredEvent {
  id: string;
  day: number;
  month: string;
  year: number;
  title: string;
  time: string;
  location: string;
  participants: number;
  maxParticipants: number;
  description: string;
  isRegistered: boolean;
  category: 'festival' | 'eco_quest' | 'cultural';
}

const REGISTERED_EVENTS: RegisteredEvent[] = [
  {
    id: 'ev-1',
    day: 18,
    month: 'Oct',
    year: 2026,
    title: 'Dagupan Bangus Festival & Coastal Grill',
    time: '05:00 PM',
    location: 'Bonuan Tondaligan Beach, Dagupan',
    participants: 412,
    maxParticipants: 500,
    description: 'Pre-registered celebration honoring Pangasinan milkfish with culinary grill stations and cultural dances.',
    isRegistered: true,
    category: 'festival',
  },
  {
    id: 'ev-2',
    day: 20,
    month: 'Oct',
    year: 2026,
    title: 'Hundred Islands Marine Sanctuary Eco-Run',
    time: '08:00 AM',
    location: 'Lucap Wharf, Alaminos City',
    participants: 128,
    maxParticipants: 150,
    description: 'Island hopping kayak expedition and coral reef clean-up with marine biology guides.',
    isRegistered: true,
    category: 'eco_quest',
  },
  {
    id: 'ev-3',
    day: 26,
    month: 'Oct',
    year: 2026,
    title: 'Pista’y Dayat Coastal Thanksgiving Parade',
    time: '09:30 AM',
    location: 'Lingayen Capitol Baywalk, Lingayen',
    participants: 840,
    maxParticipants: 1000,
    description: 'Provincial sea festival showcasing traditional outrigger boats, sand sculpting, and folk music.',
    isRegistered: true,
    category: 'cultural',
  },
  {
    id: 'ev-4',
    day: 26,
    month: 'Oct',
    year: 2026,
    title: 'Lingayen Gulf Sunset Sand Sculpting Showcase',
    time: '04:00 PM',
    location: 'Lingayen Beachfront Park',
    participants: 190,
    maxParticipants: 250,
    description: 'Artisan sand castle contest and coastal night bazaar with live acoustic folk music.',
    isRegistered: true,
    category: 'festival',
  },
  {
    id: 'ev-5',
    day: 26,
    month: 'Oct',
    year: 2026,
    title: 'Capitol Heritage Trail Walking Tour',
    time: '06:30 PM',
    location: 'Pangasinan Provincial Capitol Grounds',
    participants: 75,
    maxParticipants: 100,
    description: 'Guided evening walking quest covering neoclassical architecture and local folklore.',
    isRegistered: true,
    category: 'cultural',
  },
];

interface PhilippineHoliday {
  day: number;
  monthIndex: number;
  name: string;
}

function getPhilippineHolidays(year: number): PhilippineHoliday[] {
  const holidays: PhilippineHoliday[] = [
    { monthIndex: 0, day: 1, name: "New Year's Day" },
    { monthIndex: 3, day: 9, name: 'Day of Valor' },
    { monthIndex: 4, day: 1, name: 'Labor Day' },
    { monthIndex: 5, day: 12, name: 'Independence Day' },
    { monthIndex: 7, day: 21, name: 'Ninoy Aquino Day' },
    { monthIndex: 10, day: 1, name: "All Saints' Day" },
    { monthIndex: 10, day: 30, name: 'Bonifacio Day' },
    { monthIndex: 11, day: 8, name: 'Feast of the Immaculate Conception' },
    { monthIndex: 11, day: 24, name: 'Christmas Eve' },
    { monthIndex: 11, day: 25, name: 'Christmas Day' },
    { monthIndex: 11, day: 30, name: 'Rizal Day' },
    { monthIndex: 11, day: 31, name: "Last Day of the Year" },
  ];

  if (year === 2026) {
    holidays.push(
      { monthIndex: 1, day: 17, name: 'Chinese New Year' },
      { monthIndex: 9, day: 31, name: "All Saints' Day Eve" }
    );
  }

  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;

  [
    { offset: -3, name: 'Maundy Thursday' },
    { offset: -2, name: 'Good Friday' },
    { offset: -1, name: 'Black Saturday' },
  ].forEach(({ offset, name }) => {
    const date = new Date(year, easterMonth, easterDay + offset);
    holidays.push({ monthIndex: date.getMonth(), day: date.getDate(), name });
  });

  const lastDayOfAugust = new Date(year, 7, 31);
  const nationalHeroesDay = new Date(year, 7, 31 - ((lastDayOfAugust.getDay() + 6) % 7));
  holidays.push({
    monthIndex: nationalHeroesDay.getMonth(),
    day: nationalHeroesDay.getDate(),
    name: 'National Heroes Day',
  });

  return holidays;
}

function getPhtDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);

  return {
    year: part('year'),
    monthIndex: part('month') - 1,
    day: part('day'),
  };
}

export function CozyDashboardClient() {
  const router = useRouter();
  const { user } = useAuth();

  // State
  const [todayPht, setTodayPht] = useState(getPhtDate);
  const [calendarView, setCalendarView] = useState(getPhtDate);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => getPhtDate().day);
  const [isCalendarMonthPickerOpen, setIsCalendarMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => getPhtDate().year);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const [currentTime, setCurrentTime] = useState('10:45 AM');

  // Gamified Quest Modal & Activity Tab State
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState<'badges' | 'voting' | 'perks'>('badges');

  // Keep live time ticking
  const todayPhtKey = `${todayPht.year}-${todayPht.monthIndex}-${todayPht.day}`;
  const todayPhtKeyRef = useRef(todayPhtKey);
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const nextPhtDate = getPhtDate();
      const nextPhtDateKey = `${nextPhtDate.year}-${nextPhtDate.monthIndex}-${nextPhtDate.day}`;
      if (todayPhtKeyRef.current !== nextPhtDateKey) {
        todayPhtKeyRef.current = nextPhtDateKey;
        setTodayPht(nextPhtDate);
      }
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Click-outside listener for notifications dropdown
  const notifRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  const totalPoints = user?.points || 1250;

  const changeCalendarMonth = (year: number, monthIndex: number) => {
    const targetMonth = new Date(year, monthIndex, 1);
    const targetYear = targetMonth.getFullYear();
    const targetMonthIndex = targetMonth.getMonth();
    const day = Math.min(
      selectedCalendarDay,
      new Date(targetYear, targetMonthIndex + 1, 0).getDate()
    );
    setCalendarView({ year: targetYear, monthIndex: targetMonthIndex, day });
    setSelectedCalendarDay(day);
    setIsCalendarMonthPickerOpen(false);
  };

  // Events based on selected calendar day (empty array if no events on that day)
  const selectedDateEvents = useMemo(() => {
    const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(calendarView.year, calendarView.monthIndex, 1, 12)));
    return REGISTERED_EVENTS.filter((event) =>
      event.day === selectedCalendarDay &&
      event.month === month &&
      event.year === calendarView.year
    );
  }, [selectedCalendarDay, calendarView]);
  const selectedDayEvents = useMemo(() => {
    return selectedDateEvents;
  }, [selectedDateEvents]);
  const calendarHolidays = useMemo(
    () => getPhilippineHolidays(calendarView.year),
    [calendarView.year]
  );

  const calendarMonthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(calendarView.year, calendarView.monthIndex, 1, 12)));
  const calendarMonthShort = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(calendarView.year, calendarView.monthIndex, 1, 12)));
  const daysInCalendarMonth = new Date(calendarView.year, calendarView.monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(calendarView.year, calendarView.monthIndex, 1).getDay();
  const calendarCellCount = Math.ceil((firstWeekday + daysInCalendarMonth) / 7) * 7;
  const calendarDates = Array.from({ length: calendarCellCount }, (_, index) => {
    const day = index - firstWeekday + 1;
    const date = new Date(calendarView.year, calendarView.monthIndex, day);
    return {
      day: date.getDate(),
      monthIndex: date.getMonth(),
      inCurrentMonth: day >= 1 && day <= daysInCalendarMonth,
    };
  });

  const [claimedPerks, setClaimedPerks] = useState<string[]>([]);
  const [voucherToast, setVoucherToast] = useState<{ title: string; code: string } | null>(null);

  const handleClaimPerk = (code: string, title: string) => {
    if (!claimedPerks.includes(code)) {
      setClaimedPerks((prev) => [...prev, code]);
      setVoucherToast({ title, code });
      triggerCelebration({ type: 'confetti', count: 30, playAudio: true });
      setTimeout(() => setVoucherToast(null), 4500);
    }
  };

  return (
    <>
      {/* --------------------------------------------------------- */}
      {/* 1. TOP PANORAMA BANNER (With HUD elements inside & unclipped dropdown) */}
      {/* --------------------------------------------------------- */}
      <div className="relative rounded-3xl min-h-[210px] sm:min-h-[230px] flex items-end z-20">
            {/* INNER IMAGE BOX (Takes care of rounded corners and image clipping) */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden border-2 border-[#DFD7C7] shadow-sm bg-[#EFE8D8] pointer-events-none">
              <Image
                src="/cozy/island_cozy_banner.jpg"
                alt="Pangasinan Island Camp Banner"
                fill
                priority
                className="object-cover object-center"
              />
              {/* Soft gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
            </div>

            {/* TOP BAR INSIDE THE BANNER: Date/Season/Time on Left, Search/Notif/Profile on Right */}
            <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
              {/* Left: Date, Season & Time Pill (Aligned horizontally with Profile) */}
              <div className="pointer-events-auto inline-flex items-center gap-2 bg-[#FAF7F0]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#D5CCBC] shadow-xs text-xs font-bold text-[#2A3F30]">
                <div className="flex items-center gap-1.5 text-[#245C36]">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#5B8E67]" />
                  <span>
                    {new Intl.DateTimeFormat('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'Asia/Manila',
                    }).format(new Date())}
                  </span>
                </div>
                <span className="text-[#C4B9A7] font-normal">•</span>
                <span className="text-[#3F5A46]">🍃 Amihan Season</span>
                <span className="text-[#C4B9A7] font-normal">•</span>
                <span className="text-[#8C5E35]">⏰ {currentTime}</span>
              </div>

              {/* Right: Search, Notification, and Profile */}
              <div className="pointer-events-auto flex items-center justify-end gap-2 sm:gap-2.5">
                {/* 1. Search Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  className="relative hidden sm:block"
                >
                  <div className="flex items-center bg-[#FAF7F0]/95 backdrop-blur-md border border-[#D5CCBC] rounded-full px-3.5 py-1.5 shadow-xs hover:border-[#5B8E67] focus-within:border-[#244E36] focus-within:ring-2 focus-within:ring-[#5B8E67]/20 transition-all">
                    <Image
                      src="/icons/search.png"
                      alt="Search"
                      width={16}
                      height={16}
                      className="w-4 h-4 mr-2 shrink-0 [image-rendering:pixelated] object-contain"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search islands, quests, spots..."
                      className="bg-transparent text-xs text-[#2D3A2F] placeholder:text-[#8E9B90] focus:outline-none w-36 md:w-52 font-semibold"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-[#7A6046] hover:text-[#2D3A2F] text-xs font-bold ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </form>

                {/* 2. Notifications Bell with Popover */}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen((prev) => !prev)}
                    title="Expedition Notifications"
                    aria-label="Expedition Notifications"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FAF7F0]/95 backdrop-blur-md border border-[#D5CCBC] text-[#8C5E35] hover:text-[#244E36] flex items-center justify-center shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer relative"
                  >
                    <Image
                      src="/icons/notif.png"
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-1 ring-white" />
                  </button>

                  {/* Notifications Popover Dropdown (Unclipped! Floats cleanly over banner and below sections) */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 top-12 w-72 sm:w-80 bg-[#FAF7F0] border-2 border-[#D5CCBC] rounded-2xl shadow-2xl p-3.5 z-50 text-[#2D3A2F] animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E3DCce]">
                        <div className="flex items-center gap-1.5 font-extrabold text-xs text-[#1F452C]">
                          <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span>Island Activity</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          3 new
                        </span>
                      </div>

                      <div className="divide-y divide-[#EFEAE0] my-1 text-xs">
                        <div className="py-2">
                          <p className="font-bold text-[#1F452C] leading-tight">Hundred Islands Hopping</p>
                          <p className="text-[11px] text-[#55695A] mt-0.5">Pre-registered expedition starts tomorrow at 8:00 AM.</p>
                          <span className="text-[9px] text-[#8C5E35] font-semibold mt-1 block">10m ago</span>
                        </div>
                        <div className="py-2">
                          <p className="font-bold text-[#1F452C] leading-tight">Mangrove Planting XP</p>
                          <p className="text-[11px] text-[#55695A] mt-0.5">You earned +10 XP for planting native mangroves in Bani.</p>
                          <span className="text-[9px] text-[#8C5E35] font-semibold mt-1 block">1h ago</span>
                        </div>
                        <div className="py-2">
                          <p className="font-bold text-[#1F452C] leading-tight">Amihan Season Active</p>
                          <p className="text-[11px] text-[#55695A] mt-0.5">Local boat operators offering 15% off island hopping passes.</p>
                          <span className="text-[9px] text-[#8C5E35] font-semibold mt-1 block">3h ago</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E3DCce] flex items-center justify-between text-[11px]">
                        <Link
                          href="/quests"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="font-bold text-[#245C36] hover:underline"
                        >
                          View all quests →
                        </Link>
                        <button
                          type="button"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-[#8C5E35] hover:text-[#1F452C] font-semibold cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Explorer Profile Pill */}
                <Link
                  href="/profile"
                  title={user?.name || 'Explorer Juan'}
                  className="flex items-center gap-2 bg-[#FAF7F0]/95 backdrop-blur-md border border-[#D5CCBC] rounded-full p-1 sm:pr-3.5 shadow-xs hover:border-[#5B8E67] hover:scale-102 transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#244E36] border border-[#306346] text-[#E0EEDF] flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user?.name?.[0]?.toUpperCase() || 'J'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-none">
                    <span className="text-xs font-bold text-[#1F452C] truncate max-w-[120px]">
                      {user?.name || 'Explorer Juan'}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 flex items-center gap-0.5 mt-0.5">
                      ⭐ {totalPoints.toLocaleString()} XP
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Banner Content (Bottom): Welcome back, Juander! */}
            <div className="relative z-10 p-5 sm:p-6 text-white max-w-2xl pointer-events-auto">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl sm:text-2xl">🍃</span>
                <h2 className="text-xl sm:text-3xl font-black drop-shadow-md tracking-tight">
                  Welcome back, Juander!
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100 drop-shadow-sm font-medium">
                Here is your live expedition overview of Pangasinan Island • JuanDer Without Limits 🌲
              </p>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. EXPEDITION CENTER: EXPANDED 2/3 CALENDAR + 1/3 LIVE GPS */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* ------------------------------------------------------- */}
            {/* 2A. EXPANDED CALENDAR & EVENT SPOTLIGHT (2/3 Column)    */}
            {/* ------------------------------------------------------- */}
            <div className="lg:col-span-2 flex h-full flex-col justify-between border-2 border-[#582F0E] bg-[#FAF9F5] p-4 sm:p-5">
              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Header with Title and Month selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="flex items-center gap-2 font-mono text-sm font-black uppercase tracking-wide text-[#1B4332] sm:text-base">
                        <span className="flex h-8 w-8 items-center justify-center border-2 border-[#582F0E] bg-[#FFB703] text-[#3E1F0A] shadow-[2px_2px_0_#3E1F0A]">🍃</span>
                        Expedition Calendar &amp; Island Events
                      </h3>
                      <p className="mt-1 text-[11px] text-[#514532]">
                        Select a date to preview scheduled expeditions, local festivals, and joined traveler parties.
                      </p>
                    </div>
                    <div className="relative flex items-center gap-1.5 self-start shrink-0">
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(calendarView.year, calendarView.monthIndex - 1)}
                        aria-label="Previous month"
                        className="flex h-8 w-8 items-center justify-center border-2 border-[#582F0E] bg-[#E8F5E9] text-[#1B4332] shadow-[2px_2px_0_#3E1F0A] transition hover:bg-[#D8F3DC] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMonthPickerYear(calendarView.year);
                          setIsCalendarMonthPickerOpen((open) => !open);
                        }}
                        aria-expanded={isCalendarMonthPickerOpen}
                        aria-controls="cozy-calendar-month-picker"
                        aria-label={`Choose calendar month, currently ${calendarMonthLabel}`}
                        className="min-w-32 border-2 border-[#582F0E] bg-[#FFB703] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wide text-[#3E1F0A] shadow-[2px_2px_0_#3E1F0A] transition hover:bg-[#FFCA5C] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                      >
                        {calendarMonthLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(calendarView.year, calendarView.monthIndex + 1)}
                        aria-label="Next month"
                        className="flex h-8 w-8 items-center justify-center border-2 border-[#582F0E] bg-[#E8F5E9] text-[#1B4332] shadow-[2px_2px_0_#3E1F0A] transition hover:bg-[#D8F3DC] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      {isCalendarMonthPickerOpen && (
                        <div
                          id="cozy-calendar-month-picker"
                          role="group"
                          aria-label="Choose calendar month"
                          className="absolute right-0 top-full z-30 mt-2 w-56 border-4 border-[#582F0E] bg-[#FAF9F5] p-3 shadow-[4px_4px_0_#3E1F0A]"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setMonthPickerYear((current) => current - 1)}
                              aria-label="Previous year"
                              className="border-2 border-[#582F0E] bg-[#E8F5E9] p-1 text-[#1B4332] shadow-[2px_2px_0_#3E1F0A] hover:bg-[#D8F3DC]"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="font-mono text-xs font-black text-[#1B4332]">{monthPickerYear}</span>
                            <button
                              type="button"
                              onClick={() => setMonthPickerYear((current) => current + 1)}
                              aria-label="Next year"
                              className="border-2 border-[#582F0E] bg-[#E8F5E9] p-1 text-[#1B4332] shadow-[2px_2px_0_#3E1F0A] hover:bg-[#D8F3DC]"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {Array.from({ length: 12 }, (_, monthIndex) => {
                              const label = new Date(2026, monthIndex, 1)
                                .toLocaleString('en-US', { month: 'short' });
                              const isCurrentMonth = calendarView.year === monthPickerYear &&
                                calendarView.monthIndex === monthIndex;

                              return (
                                <button
                                  key={monthIndex}
                                  type="button"
                                  onClick={() => changeCalendarMonth(monthPickerYear, monthIndex)}
                                  aria-pressed={isCurrentMonth}
                                  className={`border-2 border-[#582F0E] px-2 py-1.5 font-mono text-[10px] font-black uppercase transition ${
                                    isCurrentMonth
                                      ? 'bg-[#FFB703] text-[#3E1F0A] shadow-[2px_2px_0_#3E1F0A]'
                                      : 'bg-[#FAF9F5] text-[#514532] hover:bg-[#E8F5E9] hover:text-[#1B4332]'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden border-2 border-[#3E1F0A] bg-[#3E1F0A]">
                    <div className="grid grid-cols-7 gap-px text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                        <span
                          key={i}
                          className={`bg-[#1B4332] py-2 font-mono text-[9px] font-black uppercase tracking-wider sm:text-[10px] ${i === 0 ? 'text-[#FFB703]' : 'text-[#FAF9F5]'
                            }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>

                    {/* Calendar Days for the current month */}
                    <div className="grid grid-cols-7 gap-px text-center">
                      {calendarDates.map(({ day, monthIndex, inCurrentMonth }, index) => {
                        if (!inCurrentMonth) {
                          return <div key={`pad-${index}`} className="min-h-10 bg-[#E3DFD5] sm:min-h-14" aria-hidden="true" />;
                        }

                        const hasEvent = REGISTERED_EVENTS.some((event) =>
                          event.day === day &&
                          event.month === calendarMonthShort &&
                          event.year === calendarView.year
                        );
                        const holidaysOnDay = calendarHolidays.filter(
                          (holiday) => holiday.day === day && holiday.monthIndex === monthIndex
                        );
                        const hasHoliday = holidaysOnDay.length > 0;
                        const isSelected = selectedCalendarDay === day;
                        const isToday = day === todayPht.day &&
                          monthIndex === todayPht.monthIndex &&
                          calendarView.year === todayPht.year;
                        const dateLabel = new Date(calendarView.year, monthIndex, day).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        });

                        return (
                          <div key={`${monthIndex}-${day}`} className="min-h-10 sm:min-h-14">
                            <button
                              type="button"
                              onClick={() => setSelectedCalendarDay(day)}
                              aria-label={`${dateLabel}${hasEvent ? ', scheduled expedition or quest' : ''}${hasHoliday ? `, Philippine holiday: ${holidaysOnDay.map((holiday) => holiday.name).join(', ')}` : ''}${isToday ? ', today' : ''}`}
                              aria-current={isToday ? 'date' : undefined}
                              aria-pressed={isSelected}
                              className={`flex h-full min-h-10 w-full flex-col items-start justify-between p-1 font-mono transition-colors cursor-pointer select-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#FFB703] sm:min-h-14 sm:p-1.5 ${isSelected
                                ? 'bg-[#FFB703] text-[#3E1F0A] font-black shadow-[inset_0_0_0_1px_#582F0E]'
                                : isToday
                                  ? 'bg-[#D8F3DC] text-[#1B4332] font-black shadow-[inset_0_0_0_3px_#2D6A4F] hover:bg-[#B7E4C7]'
                                  : 'bg-[#FAF9F5] text-[#514532] font-bold hover:bg-[#FFF8E1]'
                                }`}
                            >
                              <span className="text-xs sm:text-sm leading-none tabular-nums">{day}</span>
                              <span className="flex min-h-3 w-full items-center gap-1 overflow-hidden">
                                {hasEvent && (
                                  <>
                                    <span
                                      className={`h-2 w-2 border border-[#582F0E] ${isSelected ? 'bg-[#1B4332]' : 'bg-[#FFB703]'}`}
                                      aria-hidden="true"
                                    />
                                    <span className={`hidden text-[8px] font-black uppercase tracking-wide sm:inline ${isSelected ? 'text-[#3E1F0A]' : 'text-[#582F0E]'}`}>
                                      Quest
                                    </span>
                                  </>
                                )}
                                {hasHoliday && (
                                  <>
                                    <span
                                      className={`h-2 w-2 border border-[#1B4332] ${isSelected ? 'bg-[#1B4332]' : 'bg-[#2D6A4F]'}`}
                                      aria-hidden="true"
                                    />
                                    <span
                                      title={holidaysOnDay.map((holiday) => holiday.name).join(', ')}
                                      className={`truncate text-[8px] font-black uppercase leading-none tracking-tight ${isSelected ? 'text-[#3E1F0A]' : 'text-[#1B4332]'}`}
                                    >
                                      {holidaysOnDay[0].name}
                                    </span>
                                  </>
                                )}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Calendar Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-4 border-t-2 border-[#3E1F0A] bg-[#F5F3ED] px-3 py-2.5 font-mono text-[9px] font-black uppercase tracking-wide text-[#514532] sm:gap-6">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 border border-[#582F0E] bg-[#FFB703]" />
                        <span>Expedition Event</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 border border-[#1B4332] bg-[#2D6A4F]" />
                        <span>PH Holiday</span>
                      </span>
                      {calendarView.year === todayPht.year && calendarView.monthIndex === todayPht.monthIndex && (
                        <span className="flex items-center gap-1.5">
                          <span className="h-3.5 w-3.5 border-2 border-[#2D6A4F] bg-[#D8F3DC]" />
                          <span>Today</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 border-2 border-[#582F0E] bg-[#FFB703]" />
                        <span>Selected Day</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Event Spotlight Cards or Empty State (Aligned bottom rectangle) */}
                {selectedDayEvents.length > 0 ? (
                  <div
                    role="region"
                    aria-label="Events for selected date"
                    tabIndex={0}
                    className="mt-4 max-h-[175px] w-full min-w-0 space-y-3 overflow-y-auto overscroll-contain no-scrollbar touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]"
                  >
                    {selectedDayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="w-full border-2 border-[#582F0E] bg-[#FFF8E1] p-3 text-xs shadow-[2px_2px_0_#3E1F0A] transition-all animate-in fade-in zoom-in-95 duration-150 sm:p-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 min-w-0">
                            {/* Prominent Time badge on upper left + Location */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 border-2 border-[#3E1F0A] bg-[#1B4332] px-2 py-1 font-mono text-[10px] font-black uppercase tracking-wide text-white shadow-[2px_2px_0_#3E1F0A]">
                                <span className="text-[11px]">⏰</span>
                                <span>{event.time}</span>
                              </span>

                              <span className="flex items-center gap-1 text-[11px] font-bold text-[#6D431D]">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#D97706]" />
                                <span className="truncate">{event.location}</span>
                              </span>
                            </div>

                            <h4 className="font-mono text-sm font-black text-[#1B4332] leading-snug sm:text-base">
                              {event.title}
                            </h4>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-[#514532] line-clamp-2">
                              {event.description}
                            </p>
                          </div>

                          <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1.5">
                            <span className="border-2 border-[#1B4332] bg-[#D8F3DC] px-2 py-1 font-mono text-[9px] font-black uppercase text-[#1B4332] shadow-[2px_2px_0_#1B4332]">
                              ✓ Pre-Registered
                            </span>
                            <span className="font-mono text-[9px] font-black text-[#582F0E]">
                              👥 {event.participants} / {event.maxParticipants} Explorers
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 flex min-h-[110px] items-center justify-center border-2 border-dashed border-[#9A6035] bg-[#FFF8E1] p-5 text-center text-xs animate-in fade-in duration-150">
                    <div className="flex flex-col items-center gap-1.5 text-[#8C7A68]">
                      <span className="flex h-8 w-8 items-center justify-center border-2 border-[#582F0E] bg-[#FFB703] text-lg text-[#3E1F0A]">✦</span>
                      <p className="font-mono text-xs font-black uppercase text-[#1B4332]">No quests scheduled</p>
                      <p className="text-[10px] text-[#7A6B56]">
                        Choose a day marked with a gold quest icon to view its expedition.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------- */}
            {/* 2B. LIVE RADAR & GPS MINI MAP (1/3 Column)             */}
            {/* ------------------------------------------------------- */}
            <div className="lg:col-span-1 bg-[#FAF7F0] rounded-3xl p-5 sm:p-6 border-2 border-[#E3DCce] shadow-sm flex flex-col justify-between h-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-base font-extrabold text-[#1F452C] flex items-center gap-2">
                  <span>🧭</span> Island GPS Radar
                </h3>
                <Link
                  href="/map"
                  className="text-xs font-bold text-[#245C36] hover:underline flex items-center gap-1"
                >
                  Full Map <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Leaflet GPS Radar Mini Map Preview (Flexes to fill matching height with calendar) */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#DFD7C7] shadow-inner bg-[#EFE8D8] w-full flex-1 min-h-[260px] my-1 flex flex-col">
                <MiniMapPreview
                  lat={16.0315}
                  lng={120.2312}
                  name="Lingayen Gulf Beachfront"
                  municipality="Lingayen"
                  zoom={13}
                  height="h-full w-full"
                  hideBadge={true}
                />
                {/* Live Status overlay badge */}
                <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-emerald-800 border border-emerald-300 shadow-xs flex items-center gap-1.5 pointer-events-none">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                  </span>
                  <span>Live GPS Active</span>
                </div>
              </div>

              {/* Coordinates Pill */}
              <div className="mt-3.5 bg-[#EFEAE0] rounded-2xl p-3.5 border border-[#DFD7C7] text-xs shrink-0">
                <div className="flex items-center justify-between font-bold text-[#1F452C]">
                  <span>Coordinates:</span>
                  <span className="font-mono text-[#8C5E35]">16.0315° N, 120.2312° E</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. TABBED ISLAND ACTIVITY HUB (Badges, Voting, MSME Perks) */}
          {/* ========================================================= */}
          <div className="bg-[#FAF7F0] rounded-3xl p-5 sm:p-6 border-2 border-[#E3DCce] shadow-sm">
            {/* Header & Activity Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#E3DCce]">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#1F452C] flex items-center gap-2">
                  <span>🌿</span> Island Activity &amp; Explorer Hub
                </h3>
                <p className="text-xs text-[#5D6B5F] mt-0.5">
                  Track your explorer milestones, cast community votes, and claim MSME rewards.
                </p>
              </div>

              {/* Tabs Switcher (Parchment Wood RPG styling) */}
              <div className="flex items-center gap-1.5 bg-[#EFEAE0] p-1.5 rounded-2xl border border-[#DFD7C7] self-start sm:self-auto overflow-x-auto">
                <button
                  onClick={() => setActiveActivityTab('badges')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeActivityTab === 'badges'
                    ? 'bg-[#245C36] text-white shadow-xs scale-102'
                    : 'text-[#55695A] hover:bg-[#E3DCce]'
                    }`}
                >
                  <span>🏅</span>
                  <span>Badges (8)</span>
                </button>
                <button
                  onClick={() => setActiveActivityTab('voting')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeActivityTab === 'voting'
                    ? 'bg-[#245C36] text-white shadow-xs scale-102'
                    : 'text-[#55695A] hover:bg-[#E3DCce]'
                    }`}
                >
                  <span>🗳️</span>
                  <span>Juan Choice</span>
                </button>
                <button
                  onClick={() => setActiveActivityTab('perks')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeActivityTab === 'perks'
                    ? 'bg-[#245C36] text-white shadow-xs scale-102'
                    : 'text-[#55695A] hover:bg-[#E3DCce]'
                    }`}
                >
                  <span>🏪</span>
                  <span>MSME Perks (3)</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: BADGES */}
            {activeActivityTab === 'badges' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-[#5D6B5F]">
                    Click any badge to inspect its rarity, folklore story, and unlock requirements.
                  </p>
                  <Link
                    href="/profile"
                    className="text-xs font-extrabold text-[#245C36] hover:underline flex items-center gap-1 shrink-0"
                  >
                    View All in Profile <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 sm:gap-4 text-center">
                  {SAMPLE_USER_BADGES.slice(0, 8).map((badge) => (
                    <button
                      key={badge.id}
                      onClick={() => setSelectedBadge(badge)}
                      className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-105 active:scale-95 bg-[#EFEAE0]/60 hover:bg-[#EFEAE0] p-3 rounded-2xl border border-[#DFD7C7]"
                    >
                      <div className="w-13 h-13 rounded-full bg-[#FAF7F0] border-2 border-[#DFD7C7] flex items-center justify-center text-2xl shadow-xs group-hover:border-[#245C36] group-hover:bg-[#E2EFE4] transition-all mb-1.5">
                        {badge.icon || '🏅'}
                      </div>
                      <span className="text-xs font-bold text-[#2A3F30] truncate w-full group-hover:text-[#245C36]">
                        {badge.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-[#8C5E35] font-semibold mt-0.5">
                        {badge.tier || 'Gold'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: JUAN CHOICE VOTING */}
            {activeActivityTab === 'voting' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="bg-gradient-to-r from-[#8C5E35] to-[#6E4220] rounded-2xl py-2 px-4 text-white shadow-xs inline-flex items-center gap-2">
                    <span className="text-sm">🌅</span>
                    <span className="text-xs font-black">
                      Active Theme: Best Sunset &amp; Coastal Trails in Pangasinan
                    </span>
                  </div>

                  <Link
                    href="/community-choice"
                    className="text-xs font-bold text-[#245C36] hover:underline flex items-center gap-1"
                  >
                    Leaderboard &amp; Voting <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      rank: '🥇',
                      name: 'Patar White Beach',
                      municipality: 'Bolinao',
                      votes: 942,
                      highlight: 'Pristine coral sands & sunset lighthouse',
                      href: '/spots',
                    },
                    {
                      rank: '🥈',
                      name: "Governor's Island Peak",
                      municipality: 'Alaminos',
                      votes: 815,
                      highlight: '360° Hundred Islands viewpoint',
                      href: '/spots',
                    },
                    {
                      rank: '🥉',
                      name: 'Bonuan Tondaligan Beach',
                      municipality: 'Dagupan',
                      votes: 670,
                      highlight: 'Famous seafood & bangus grill walk',
                      href: '/spots',
                    },
                  ].map((spot, i) => (
                    <Link
                      key={i}
                      href={spot.href}
                      className="bg-[#EFEAE0] hover:bg-[#E5DFD3] rounded-2xl p-4 border border-[#DFD7C7] flex items-center justify-between transition-all hover:scale-102 group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">{spot.rank}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1F452C] group-hover:text-[#245C36] truncate">
                            {spot.name}
                          </p>
                          <p className="text-[11px] text-[#8C5E35] font-semibold">
                            {spot.municipality}
                          </p>
                          <p className="text-[10px] text-[#5D6B5F] mt-1 line-clamp-1">
                            {spot.highlight}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right pl-3">
                        <span className="text-sm font-black text-[#8C5E35] block">{spot.votes}</span>
                        <span className="text-[9px] font-bold text-[#7A8B7E] uppercase">votes</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: LOCAL MSME PERKS & VOUCHERS */}
            {activeActivityTab === 'perks' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-[#5D6B5F]">
                    Redeem your Explorer XP with verified Pangasinan MSMEs for authentic dining, tours, and artisan goods.
                  </p>
                  <Link
                    href="/shop"
                    className="text-xs font-bold text-[#245C36] hover:underline flex items-center gap-1 shrink-0"
                  >
                    Browse Full Voucher Shop <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Voucher 1: Bangus Grill */}
                  <div className="bg-[#FAF1DF] rounded-2xl p-4 border border-[#E8DCC2] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                          Culinary Partner
                        </span>
                        <span className="text-lg">🐟</span>
                      </div>
                      <h4 className="text-sm font-black text-[#582F0E]">
                        Dagupeña Bangus Grill &amp; Cafe
                      </h4>
                      <p className="text-[11px] text-[#69481E] mt-1 font-semibold">
                        15% OFF Grilled Boneless Bangus &amp; Seafood Platters
                      </p>
                      <p className="text-[10px] text-[#7A6B56] mt-1 leading-relaxed">
                        Valid on dining along Bonuan Tondaligan Beach Promenade.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#E8DCC2] flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#8C5E35]">150 XP</span>
                      <button
                        onClick={() => handleClaimPerk('BANGUS-PERK-15', 'Dagupeña Bangus Grill')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#8C5E35] hover:bg-[#6E4220] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                      >
                        {claimedPerks.includes('BANGUS-PERK-15') ? '✓ Claimed' : 'Claim Voucher'}
                      </button>
                    </div>
                  </div>

                  {/* Voucher 2: Lucap Wharf Eco-Kayak */}
                  <div className="bg-[#EFEAE0] rounded-2xl p-4 border border-[#DFD7C7] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Eco-Tour Partner
                        </span>
                        <span className="text-lg">🛶</span>
                      </div>
                      <h4 className="text-sm font-black text-[#1F452C]">
                        Lucap Wharf Eco-Kayak &amp; Island Rentals
                      </h4>
                      <p className="text-[11px] text-[#245C36] mt-1 font-semibold">
                        Free Snorkeling Gear Rental with Island Hopping Pass
                      </p>
                      <p className="text-[10px] text-[#5D6B5F] mt-1 leading-relaxed">
                        Valid at Lucap Wharf Alaminos Tourist Information Center.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#DFD7C7] flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#8C5E35]">200 XP</span>
                      <button
                        onClick={() => handleClaimPerk('LUCAP-SNORKEL-FREE', 'Lucap Wharf Eco-Kayak')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#245C36] hover:bg-[#1B4332] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                      >
                        {claimedPerks.includes('LUCAP-SNORKEL-FREE') ? '✓ Claimed' : 'Claim Voucher'}
                      </button>
                    </div>
                  </div>

                  {/* Voucher 3: Bolinao Handwoven Buri Crafts */}
                  <div className="bg-[#EFEAE0] rounded-2xl p-4 border border-[#DFD7C7] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          Artisan Partner
                        </span>
                        <span className="text-lg">🧺</span>
                      </div>
                      <h4 className="text-sm font-black text-[#1F452C]">
                        Bolinao Buri Weavers &amp; Salt Artisans
                      </h4>
                      <p className="text-[11px] text-[#245C36] mt-1 font-semibold">
                        ₱100 Discount on Handcrafted Buri Mats &amp; Sea Salt
                      </p>
                      <p className="text-[10px] text-[#5D6B5F] mt-1 leading-relaxed">
                        Directly supports women artisans and traditional Dasol salt pans.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#DFD7C7] flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#8C5E35]">100 XP</span>
                      <button
                        onClick={() => handleClaimPerk('BOLINAO-BURI-100', 'Bolinao Buri Weavers')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#245C36] hover:bg-[#1B4332] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                      >
                        {claimedPerks.includes('BOLINAO-BURI-100') ? '✓ Claimed' : 'Claim Voucher'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

      {/* ------------------------------------------------------------- */}
      {/* BADGE PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FAF7F0] rounded-3xl max-w-sm w-full p-6 border-4 border-[#DFD7C7] shadow-2xl relative text-center">
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#EFEAE0] hover:bg-[#DFD7C7] text-[#55695A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-20 h-20 rounded-full bg-[#EFEAE0] border-4 border-[#245C36] flex items-center justify-center text-4xl mx-auto shadow-md mb-4">
              {selectedBadge.icon || '🏅'}
            </div>

            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              {selectedBadge.rarity.toUpperCase()} BADGE
            </span>

            <h4 className="text-lg font-black text-[#1F452C] mt-2">
              {selectedBadge.name}
            </h4>

            <p className="text-xs text-[#5D6B5F] mt-2 leading-relaxed">
              {selectedBadge.description}
            </p>

            {selectedBadge.howToEarn && (
              <div className="mt-4 p-3 rounded-2xl bg-[#EFEAE0] text-left text-xs border border-[#DFD7C7]">
                <span className="font-bold text-[#1F452C] block mb-0.5">How to Earn:</span>
                <p className="text-[#5D6B5F] text-[11px] leading-relaxed">
                  {selectedBadge.howToEarn}
                </p>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setSelectedBadge(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#245C36] hover:bg-[#1B4332] text-white font-extrabold text-xs shadow-xs transition-colors"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* FLOATING BOUNCING QUEST ICON (Keeps bouncing on hover)        */}
      {/* ============================================================= */}
      <div className="fixed bottom-6 right-6 z-40 animate-bounce pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsQuestModalOpen(true)}
          className="group relative flex h-16 w-16 items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          title="Active Quests Journal"
          aria-label="Active Quests Journal"
        >
          <Image
            src="/images/quest.png"
            alt=""
            width={128}
            height={128}
            className="h-16 w-16 object-contain drop-shadow-md transition-transform group-hover:rotate-6"
          />

          {/* Red indicator dot on the upper right side */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 ring-2 ring-white border border-red-600 shadow-xs" />
          </span>
        </button>
      </div>

      {/* QUEST JOURNAL POP-UP MODAL */}
      <QuestJournalModal
        isOpen={isQuestModalOpen}
        onClose={() => setIsQuestModalOpen(false)}
      />

      {/* VOUCHER CLAIM TOAST */}
      {voucherToast && (
        <div className="fixed bottom-20 right-6 z-50 bg-[#1F452C] text-white p-4 rounded-2xl shadow-xl border-2 border-emerald-400/40 flex items-center gap-3.5 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center text-xl shrink-0">
            🎟️
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider block">
              Voucher Unlocked!
            </span>
            <p className="text-xs font-bold">{voucherToast.title}</p>
            <p className="text-[11px] font-mono text-emerald-200 mt-0.5">
              Code: <span className="font-black text-amber-300 select-all">{voucherToast.code}</span>
            </p>
          </div>
          <button
            onClick={() => setVoucherToast(null)}
            className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
