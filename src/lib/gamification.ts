'use client';

import { useState, useEffect, useCallback } from 'react';
import { KNOWN_AREAS } from '@/lib/areas';
import { triggerCelebration } from '@/components/CelebrationEffects';

export interface ScoutTier {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  perk: string;
  badgeIcon: string;
}

export const SCOUT_TIERS: ScoutTier[] = [
  { level: 1, title: 'Novice Wanderer', minXp: 0, maxXp: 100, perk: 'Unlocked basic quests & community feed', badgeIcon: '🌱' },
  { level: 2, title: 'Islet Nomad', minXp: 100, maxXp: 250, perk: '5% voucher discount at Lucap Wharf merchants', badgeIcon: '🍃' },
  { level: 3, title: 'Coastal Scout', minXp: 250, maxXp: 450, perk: 'Ability to vote in JuanChoice bonus rounds', badgeIcon: '🧭' },
  { level: 4, title: 'Reef Ranger', minXp: 450, maxXp: 700, perk: 'Can submit hidden gem destination spots', badgeIcon: '🐠' },
  { level: 5, title: 'Island Guardian', minXp: 700, maxXp: 1000, perk: 'Verified curator voting weight + 10% voucher boost', badgeIcon: '🛡️' },
  { level: 6, title: 'Archipelago Legend', minXp: 1000, maxXp: 99999, perk: 'Exclusive gold passport frame & honorary LGU flair', badgeIcon: '👑' },
];

export interface DailyTask {
  id: 'daily_tip' | 'daily_vote' | 'daily_explore';
  title: string;
  description: string;
  xpReward: number;
  icon: string;
  completed: boolean;
}

export interface MunicipalityStamp {
  id: string;
  name: string;
  province: string;
  title: string;
  tag: string;
  icon: string;
  color: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export const INITIAL_MUNICIPALITY_STAMPS: MunicipalityStamp[] = [
  {
    id: 'alaminos',
    name: 'Alaminos City',
    province: 'Pangasinan',
    title: 'Hundred Islands Marine Sanctuary',
    tag: 'Island Hopping',
    icon: '🏝️',
    color: '#2A9D8F',
    description: '123 ancient coral mushroom islands scattered across emerald waters.',
    unlocked: true,
    unlockedAt: 'Oct 14, 2026',
  },
  {
    id: 'bolinao',
    name: 'Bolinao',
    province: 'Pangasinan',
    title: 'Cape Bolinao & Patar Sands',
    tag: 'Coastal Heritage',
    icon: '🌊',
    color: '#E76F51',
    description: 'Historic Spanish lighthouse perched above turquoise limestone cliffs.',
    unlocked: true,
    unlockedAt: 'Oct 16, 2026',
  },
  {
    id: 'bani',
    name: 'Bani',
    province: 'Pangasinan',
    title: 'Bangrin Mangrove Protected Haven',
    tag: 'Eco-Sanctuary',
    icon: '🌿',
    color: '#2D6A4F',
    description: 'Vital nursery for migratory Pacific birds and lush mangrove forests.',
    unlocked: false,
  },
  {
    id: 'dagupan',
    name: 'Dagupan City',
    province: 'Pangasinan',
    title: 'Bonuan Blue Beach & Riverways',
    tag: 'Culinary Capital',
    icon: '🐟',
    color: '#457B9D',
    description: 'Home of the World’s Longest Barbecue and legendary milkfish festivals.',
    unlocked: false,
  },
  {
    id: 'lingayen',
    name: 'Lingayen',
    province: 'Pangasinan',
    title: 'Provincial Capitol & Gulf Walk',
    tag: 'Provincial Seat',
    icon: '🏛️',
    color: '#8338EC',
    description: 'Stately neoclassical provincial capitol facing the vast Lingayen Gulf.',
    unlocked: false,
  },
  {
    id: 'dasol',
    name: 'Dasol',
    province: 'Pangasinan',
    title: 'Tambobong White Sand Cove',
    tag: 'Artisan Salt',
    icon: '🧂',
    color: '#E9C46A',
    description: 'Pristine salt beds producing world-class artisanal Pangasinan sea salt.',
    unlocked: false,
  },
];

const PANGASINAN_STAMP_ICONS: Record<string, string> = {
  alaminos: '🏝️',
  dagupan: '🐟',
  'san-carlos': '🧺',
  urdaneta: '🚉',
  agno: '🪨',
  aguilar: '🌾',
  alcala: '🐂',
  anda: '🐚',
  asingan: '🏺',
  balungao: '⛰️',
  bani: '🌿',
  basista: '🧵',
  bautista: '🎼',
  bayambang: '🗿',
  binalonan: '🛩️',
  binmaley: '🦪',
  bolinao: '🌊',
  bugallon: '🧗',
  burgos: '🦋',
  calasiao: '🍡',
  dasol: '🧂',
  infanta: '🐢',
  labrador: '🐕',
  laoac: '🐓',
  lingayen: '🏛️',
  mabini: '🪸',
  malasiqui: '🥭',
  manaoag: '⛪',
  mangaldan: '🦀',
  mangatarem: '🌳',
  mapandan: '🍊',
  natividad: '🕊️',
  pozorrubio: '🎪',
  rosales: '🌻',
  'san-fabian': '🐬',
  'san-jacinto': '🐝',
  'san-manuel': '🪵',
  'san-nicolas': '🧱',
  'san-quintin': '🎣',
  'santa-barbara': '🌷',
  'santa-maria': '🐄',
  'santo-tomas': '🕯️',
  sison: '🚂',
  sual: '⚓',
  tayug: '🎋',
  umingan: '🐃',
  urbiztondo: '🪷',
  villasis: '🍅',
};

function buildAllPossiblePangasinanStamps(): MunicipalityStamp[] {
  const byId = new Map<string, MunicipalityStamp>();

  for (const area of KNOWN_AREAS) {
    if (area.type !== 'city' && area.type !== 'municipality') continue;
    byId.set(area.id, {
      id: area.id,
      name: area.name,
      province: 'Pangasinan',
      title: area.name,
      tag: area.type === 'city' ? 'City' : 'Municipality',
      icon: PANGASINAN_STAMP_ICONS[area.id] ?? '📍',
      color: '#D8B36A',
      description: area.subtitle,
      unlocked: false,
    });
  }

  for (const stamp of INITIAL_MUNICIPALITY_STAMPS) {
    const existing = byId.get(stamp.id);
    if (existing) {
      byId.set(stamp.id, { ...existing, ...stamp });
    } else {
      byId.set(stamp.id, stamp);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function mergeSavedMunicipalityStamps(
  savedStamps: MunicipalityStamp[] | undefined
): MunicipalityStamp[] {
  const savedById = new Map((savedStamps ?? []).map((stamp) => [stamp.id, stamp]));
  const catalogStamps = buildAllPossiblePangasinanStamps();
  const catalogIds = new Set(catalogStamps.map((stamp) => stamp.id));

  return [
    ...catalogStamps.map((stamp) => {
      const savedStamp = savedById.get(stamp.id);
      return savedStamp
        ? { ...stamp, unlocked: savedStamp.unlocked, unlockedAt: savedStamp.unlockedAt }
        : stamp;
    }),
    ...(savedStamps ?? []).filter((stamp) => !catalogIds.has(stamp.id)),
  ];
}

export interface GamificationState {
  xp: number;
  streakDays: number;
  lastActiveDate: string;
  tasks: DailyTask[];
  stamps: MunicipalityStamp[];
  islandRating: number;
}

const STORAGE_KEY = 'jdq_gamification_state_v1';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getInitialState(): GamificationState {
  const today = getTodayString();
  return {
    xp: 340,
    streakDays: 3,
    lastActiveDate: today,
    islandRating: 4.8,
    tasks: [
      {
        id: 'daily_tip',
        title: 'Daily Eco-Tip',
        description: 'Read today’s island sustainability tip in the sidebar',
        xpReward: 20,
        icon: '🍃',
        completed: false,
      },
      {
        id: 'daily_vote',
        title: 'JuanChoice Vote',
        description: 'Cast a vote in the community destination spotlight',
        xpReward: 35,
        icon: '✨',
        completed: false,
      },
      {
        id: 'daily_explore',
        title: 'Destination Scout',
        description: 'Bookmark or inspect a destination on the map or feed',
        xpReward: 25,
        icon: '🧭',
        completed: false,
      },
    ],
    stamps: buildAllPossiblePangasinanStamps(),
  };
}

// Global broadcast bus for toast notifications
export interface XpNotification {
  id: string;
  amount: number;
  reason: string;
  isLevelUp?: boolean;
  newLevelTitle?: string;
}

let notificationListeners: Array<(notif: XpNotification) => void> = [];

export function subscribeXpNotifications(listener: (notif: XpNotification) => void) {
  notificationListeners.push(listener);
  return () => {
    notificationListeners = notificationListeners.filter((l) => l !== listener);
  };
}

export function broadcastXp(notif: XpNotification) {
  notificationListeners.forEach((l) => l(notif));
}

export function triggerTaskCompletion(taskId: DailyTask['id']) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('jdq:task-completed', { detail: { taskId } }));
}

export function useGamification() {
  const [state, setState] = useState<GamificationState>(getInitialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Add XP action
  const addXp = useCallback((amount: number, reason: string) => {
    setState((prev) => {
      const newXp = prev.xp + amount;
      const prevTier = SCOUT_TIERS.slice().reverse().find((t) => prev.xp >= t.minXp) || SCOUT_TIERS[0];
      const newTier = SCOUT_TIERS.slice().reverse().find((t) => newXp >= t.minXp) || SCOUT_TIERS[0];
      const isLevelUp = newTier.level > prevTier.level;

      queueMicrotask(() => {
        triggerCelebration({
          type: isLevelUp ? 'stars' : 'poppers',
          playAudio: true,
        });

        broadcastXp({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          amount,
          reason,
          isLevelUp,
          newLevelTitle: isLevelUp ? newTier.title : undefined,
        });
      });

      return {
        ...prev,
        xp: newXp,
      };
    });
  }, []);

  // Complete task action
  const completeTask = useCallback((taskId: DailyTask['id']) => {
    setState((prev) => {
      const target = prev.tasks.find((t) => t.id === taskId);
      if (!target || target.completed) return prev;

      const nextTasks = prev.tasks.map((t) => (t.id === taskId ? { ...t, completed: true } : t));
      const allCompleted = nextTasks.every((t) => t.completed);
      const bonusStreakXp = allCompleted ? 50 : 0;
      const totalXpGain = target.xpReward + bonusStreakXp;

      const newXp = prev.xp + totalXpGain;
      const prevTier = SCOUT_TIERS.slice().reverse().find((t) => prev.xp >= t.minXp) || SCOUT_TIERS[0];
      const newTier = SCOUT_TIERS.slice().reverse().find((t) => newXp >= t.minXp) || SCOUT_TIERS[0];
      const isLevelUp = newTier.level > prevTier.level;

      queueMicrotask(() => {
        triggerCelebration({
          type: allCompleted ? 'stars' : 'poppers',
          playAudio: true,
        });

        broadcastXp({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          amount: target.xpReward,
          reason: target.title,
          isLevelUp,
          newLevelTitle: isLevelUp ? newTier.title : undefined,
        });

        if (allCompleted) {
          setTimeout(() => {
            broadcastXp({
              id: `${Date.now()}-bonus`,
              amount: 50,
              reason: 'Daily Punchcard Completed! 3-Day Streak!',
            });
          }, 600);
        }
      });

      return {
        ...prev,
        xp: newXp,
        tasks: nextTasks,
      };
    });
  }, []);

  // Unlock stamp action
  const unlockStamp = useCallback((stampId: string) => {
    setState((prev) => {
      const stamp = prev.stamps.find((s) => s.id === stampId);
      if (!stamp || stamp.unlocked) return prev;

      queueMicrotask(() => {
        triggerCelebration({ type: 'stars', playAudio: true });

        broadcastXp({
          id: `${Date.now()}-stamp`,
          amount: 75,
          reason: `New Municipality Stamp: ${stamp.name}!`,
        });
      });

      return {
        ...prev,
        xp: prev.xp + 75,
        stamps: prev.stamps.map((s) =>
          s.id === stampId ? { ...s, unlocked: true, unlockedAt: new Date().toISOString() } : s
        ),
      };
    });
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: GamificationState = JSON.parse(saved);
        const migrated: GamificationState = {
          ...getInitialState(),
          ...parsed,
          stamps: mergeSavedMunicipalityStamps(parsed.stamps),
        };
        const today = getTodayString();
        // Reset daily tasks if date changed
        if (migrated.lastActiveDate !== today) {
          migrated.lastActiveDate = today;
          migrated.tasks = migrated.tasks.map((t) => ({ ...t, completed: false }));
          migrated.streakDays = migrated.streakDays + 1;
        }
        setState(migrated);
      }
    } catch {
      // Fallback to default
    }
    setIsLoaded(true);
  }, []);

  // Listen for task completion events from other components
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleCustomTask = (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId: DailyTask['id'] }>;
      if (customEvent.detail?.taskId) {
        completeTask(customEvent.detail.taskId);
      }
    };
    window.addEventListener('jdq:task-completed', handleCustomTask);
    return () => window.removeEventListener('jdq:task-completed', handleCustomTask);
  }, [completeTask]);

  // Save to localStorage when state updates
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore write errors
    }
  }, [state, isLoaded]);

  // Compute tier and progress
  const currentTier = SCOUT_TIERS.slice().reverse().find((t) => state.xp >= t.minXp) || SCOUT_TIERS[0];
  const nextTier = SCOUT_TIERS.find((t) => t.level === currentTier.level + 1) || null;
  const tierRange = nextTier ? nextTier.minXp - currentTier.minXp : 100;
  const currentTierProgress = nextTier ? state.xp - currentTier.minXp : tierRange;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentTierProgress / tierRange) * 100)));
  const nextLevelRemainingXp = nextTier ? Math.max(0, nextTier.minXp - state.xp) : 0;

  return {
    isLoaded,
    xp: state.xp,
    streakDays: state.streakDays,
    islandRating: state.islandRating,
    tasks: state.tasks,
    stamps: state.stamps,
    currentTier,
    nextTier,
    progressPercent,
    nextLevelRemainingXp,
    addXp,
    completeTask,
    unlockStamp,
  };
}
