/**
 * JuanDerQuest Badges System
 * 
 * Defines badge models and mock inventories for:
 * 1. User Nametag Badges (including Soulbound NFTs and Scout Achievements)
 * 2. Post / Destination Badges (Verification, Nature, Culture, Atmosphere, Web3 Quests)
 */

export type UserBadgeType = 'nft' | 'achievement' | 'civic' | 'scout';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface UserBadge {
  id: string;
  name: string;
  type: UserBadgeType;
  icon: string;
  description: string;
  howToEarn?: string;
  criteria?: string[];
  rarity: BadgeRarity;
  isNft: boolean;
  tokenId?: string;
  network?: string;
  themeColor: {
    bg: string;
    text: string;
    border: string;
    glow?: string;
  };
  unlockedAt?: string;
}

export type DestinationBadgeCategory = 'official' | 'nature' | 'culture' | 'atmosphere' | 'web3';

export interface DestinationBadge {
  id: string;
  name: string;
  category: DestinationBadgeCategory;
  icon: string;
  shortLabel?: string;
  description: string;
  howToEarn?: string;
  criteria?: string[];
  themeColor: {
    bg: string;
    text: string;
    border: string;
  };
}

// ========================================================================
// 1. User Badges Inventory (Including Soulbound NFTs and Achievements)
// ========================================================================

export const SAMPLE_USER_BADGES: UserBadge[] = [
  // --- Soulbound NFTs & Web3 Badges ---
  {
    id: 'nft-hundred-islands-pioneer',
    name: 'Hundred Islands Pioneer',
    type: 'nft',
    icon: '💎',
    description: 'Soulbound NFT earned by verifying visits to all 4 major islands in Alaminos during Season 1.',
    howToEarn: 'Complete on-site GPS check-ins at Governor Island, Quezon Island, Children’s Island, and Marcos Island within a single season.',
    criteria: [
      'Verified GPS proximity (≤ 100m) at 4 pilot islands',
      'Leave No Trace eco-commitment submission',
      'Minted to Base Sepolia smart contract ledger',
    ],
    rarity: 'legendary',
    isNft: true,
    tokenId: '#0042',
    network: 'Base L2',
    themeColor: {
      bg: 'bg-gradient-to-r from-amber-500/15 to-purple-500/15',
      text: 'text-amber-900',
      border: 'border-amber-400/60',
      glow: 'shadow-[0_0_12px_rgba(251,191,36,0.35)]',
    },
    unlockedAt: '2026-10-01',
  },
  {
    id: 'nft-bolinao-twilight',
    name: 'Bolinao Twilight Sentinel',
    type: 'nft',
    icon: '🌅',
    description: 'Special edition Cape Bolinao twilight check-in NFT commemorating coastal exploration.',
    howToEarn: 'Check in at Cape Bolinao Lighthouse or Patar Beach during golden hour (5:00 PM – 6:30 PM) with photographic proof.',
    criteria: [
      'Golden hour GPS timestamp verification',
      '1 approved scenic sunset photograph',
      'Base L2 Soulbound proof of expedition',
    ],
    rarity: 'epic',
    isNft: true,
    tokenId: '#0118',
    network: 'Base L2',
    themeColor: {
      bg: 'bg-gradient-to-r from-orange-500/15 to-rose-500/15',
      text: 'text-orange-950',
      border: 'border-orange-400/60',
      glow: 'shadow-[0_0_10px_rgba(249,115,22,0.3)]',
    },
    unlockedAt: '2026-10-03',
  },
  {
    id: 'nft-manaoag-genesis',
    name: 'Manaoag Pilgrim Genesis',
    type: 'nft',
    icon: '🏛️',
    description: 'Genesis Soulbound badge for cultural and spiritual heritage patron pilgrims.',
    howToEarn: 'Visit the Minor Basilica of Our Lady of the Rosary of Manaoag and complete the spiritual heritage trail quest.',
    criteria: [
      'Manaoag Church GPS perimeter check-in',
      'Heritage etiquette compliance pledge',
      'Community cultural archive contributor',
    ],
    rarity: 'legendary',
    isNft: true,
    tokenId: '#0007',
    network: 'Base L2',
    themeColor: {
      bg: 'bg-gradient-to-r from-yellow-500/15 to-amber-500/15',
      text: 'text-amber-950',
      border: 'border-yellow-500/60',
      glow: 'shadow-[0_0_12px_rgba(234,179,8,0.35)]',
    },
    unlockedAt: '2026-09-28',
  },
  {
    id: 'nft-lingayen-navigator',
    name: 'Lingayen Gulf Navigator',
    type: 'nft',
    icon: '🌊',
    description: 'ERC-5192 Soulbound token for maritime historical trail completion.',
    howToEarn: 'Navigate through the Lingayen Capitol Beachfront and the Veterans Memorial Park using sovereign turn-by-turn routing.',
    criteria: [
      'Valhalla sovereign navigation route completion',
      'Provincial capitol complex checkpoint validation',
      'Maritime trail history checkpoint reached',
    ],
    rarity: 'rare',
    isNft: true,
    tokenId: '#0891',
    network: 'Base L2',
    themeColor: {
      bg: 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15',
      text: 'text-cyan-950',
      border: 'border-cyan-400/60',
      glow: 'shadow-[0_0_8px_rgba(6,182,212,0.25)]',
    },
    unlockedAt: '2026-10-05',
  },

  // --- Civic & LGU Badges ---
  {
    id: 'badge-lgu-ranger',
    name: 'Provincial LGU Ranger',
    type: 'civic',
    icon: '🛡️',
    description: 'Accredited civic scout assisting municipal tourism bureaus with on-site validations.',
    howToEarn: 'Awarded to vetted community leaders and rangers who have verified at least 15 public safety or crowd reports.',
    criteria: [
      'Accredited by Pangasinan Tourism LGU partner program',
      '15+ crowd or trail condition audits submitted',
      'High reliability community trust rating (>95%)',
    ],
    rarity: 'epic',
    isNft: false,
    themeColor: {
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      border: 'border-blue-300',
    },
  },
  {
    id: 'badge-civic-voter',
    name: 'JuanChoice Civic Elector',
    type: 'civic',
    icon: '🗳️',
    description: 'Active community voter in monthly Pangasinan tourism development ballots.',
    howToEarn: 'Cast quadratic votes in at least 3 monthly JuanChoice tourism spotlight governance rounds.',
    criteria: [
      'Participated in 3+ community governance ballots',
      'mJDQ voting stake verified',
      'Helped elect community destination spotlights',
    ],
    rarity: 'common',
    isNft: false,
    themeColor: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-900',
      border: 'border-indigo-200',
    },
  },

  // --- Scout & Achievement Badges ---
  {
    id: 'badge-eco-guardian',
    name: 'Eco-Heritage Guardian',
    type: 'achievement',
    icon: '🌿',
    description: 'Maintains Leave No Trace compliance across fragile reef and mangrove biomes.',
    howToEarn: 'Earned by logging 5 zero-waste check-ins at officially designated marine reserves and protected mangrove eco-parks.',
    criteria: [
      '5 protected sanctuary check-ins',
      'Zero trash violation reports',
      'Leave No Trace pledge badge holder',
    ],
    rarity: 'rare',
    isNft: false,
    themeColor: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
    },
  },
  {
    id: 'badge-sovereign-explorer',
    name: 'Sovereign Explorer',
    type: 'scout',
    icon: '🧭',
    description: 'Navigated over 10 distinct Pangasinan municipalities using sovereign OSM routing.',
    howToEarn: 'Use JuanDerQuest Sovereign Valhalla navigation across 10 different towns in eastern and western Pangasinan.',
    criteria: [
      '10 municipalities traversed with sovereign routing',
      'Crowd-diversion alternative routes accepted',
      'Zero commercial map API dependencies',
    ],
    rarity: 'epic',
    isNft: false,
    themeColor: {
      bg: 'bg-teal-50',
      text: 'text-teal-950',
      border: 'border-teal-300',
    },
  },
  {
    id: 'badge-master-photographer',
    name: 'Master Lens Scout',
    type: 'achievement',
    icon: '📸',
    description: 'Over 20 community photo submissions approved by tourism reviewers.',
    howToEarn: 'Contribute 20 high-resolution geotagged photographs that pass community moderator review.',
    criteria: [
      '20 verified photo approvals by admin dashboard',
      'Accurate GPS location metadata match',
      'Original photography license granted to LGU catalog',
    ],
    rarity: 'rare',
    isNft: false,
    themeColor: {
      bg: 'bg-purple-50',
      text: 'text-purple-900',
      border: 'border-purple-200',
    },
  },
  {
    id: 'badge-bangus-connoisseur',
    name: 'Bangus Connoisseur',
    type: 'achievement',
    icon: '🐟',
    description: 'Explored Dagupan and Binmaley seafood culinary heritage centers.',
    howToEarn: 'Complete culinary quest checkpoints in Dagupan City and Binmaley seafood culinary strips.',
    criteria: [
      'Boneless bangus culinary landmark check-in',
      'Traditional salt bed or fish pond heritage visit',
      'Food trail review published',
    ],
    rarity: 'common',
    isNft: false,
    themeColor: {
      bg: 'bg-sky-50',
      text: 'text-sky-900',
      border: 'border-sky-200',
    },
  },
  {
    id: 'badge-trail-pioneer',
    name: 'The Trail Pioneer',
    type: 'scout',
    icon: '⚡',
    description: 'Completed custom multi-stop corridor route itinerary with low crowd impact.',
    howToEarn: 'Finish a planned multi-stop travel corridor trail during low crowd pressure periods.',
    criteria: [
      '3+ consecutive corridor stops visited',
      'Off-peak itinerary execution confirmed',
      'Reduced destination crowding impact',
    ],
    rarity: 'rare',
    isNft: false,
    themeColor: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300',
    },
  },
  {
    id: 'badge-night-camper',
    name: 'Twilight Camper',
    type: 'achievement',
    icon: '🌙',
    description: 'Verified evening patron at authorized coastal camping grounds.',
    howToEarn: 'Verify an overnight stay or late evening visit at an authorized provincial camping zone.',
    criteria: [
      'Evening GPS check-in (after 8:00 PM)',
      'Authorized eco-campground zone',
      'Adherence to coastal quiet hours',
    ],
    rarity: 'common',
    isNft: false,
    themeColor: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300',
    },
  },
];

// Default selected badges for guest / demo users
export const DEFAULT_ACTIVE_BADGE_IDS = [
  'nft-hundred-islands-pioneer',
  'badge-eco-guardian'
];

// ========================================================================
// 2. Post / Destination Badges Inventory (Many sample badges across types)
// ========================================================================

export const SAMPLE_DESTINATION_BADGES: DestinationBadge[] = [
  // --- Official & Verification Badges ---
  {
    id: 'dest-lgu-certified',
    name: 'LGU Certified Safe',
    category: 'official',
    icon: '🛡️',
    description: 'Verified and inspected by the Municipal Tourism and Safety Office.',
    howToEarn: 'Conferred by the local government unit following bi-annual health, emergency readiness, and safety audits.',
    criteria: [
      'Municipal tourism accreditation on file',
      'Lifeguard & first aid responder station active',
      'Compliance with provincial eco-regulations',
    ],
    themeColor: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
    },
  },
  {
    id: 'dest-juanchoice-winner',
    name: 'JuanChoice Spotlight',
    category: 'official',
    icon: '✨',
    description: 'Elected top community highlight in the monthly provincial governance round.',
    howToEarn: 'Voted #1 destination by JuanDerQuest token electors in the decentralized monthly JuanChoice governance round.',
    criteria: [
      'Over 1,000 quadratic community votes cast',
      'Certified community favorite for current quarter',
      'Receives mJDQ reward pool spotlight boost',
    ],
    themeColor: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300',
    },
  },
  {
    id: 'dest-national-heritage',
    name: 'National Cultural Treasure',
    category: 'official',
    icon: '🏛️',
    description: 'Officially recognized historical landmark protected by national heritage laws.',
    howToEarn: 'Designated by the National Historical Commission of the Philippines (NHCP) and National Museum.',
    criteria: [
      'NHCP historical marker installed',
      'Preserved architectural integrity',
      'Documented historical significance in Pangasinan history',
    ],
    themeColor: {
      bg: 'bg-stone-100',
      text: 'text-stone-900',
      border: 'border-stone-300',
    },
  },

  // --- Nature & Eco Badges ---
  {
    id: 'dest-marine-sanctuary',
    name: 'Marine Coral Sanctuary',
    category: 'nature',
    icon: '🤿',
    description: 'Protected reef habitat supporting sea turtle nesting and giant clam gardens.',
    howToEarn: 'Designated marine protected area (MPA) verified by community biologists and municipal maritime patrols.',
    criteria: [
      'Designated no-anchor reef preservation zone',
      'Giant clam nursery or coral restoration project active',
      'Strict eco-diver carrying capacity enforced',
    ],
    themeColor: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-900',
      border: 'border-cyan-300',
    },
  },
  {
    id: 'dest-pristine-beach',
    name: 'Pristine White Sands',
    category: 'nature',
    icon: '🌊',
    description: 'Fine coral sand with crystalline waters and natural tidal sandbars.',
    howToEarn: 'Consistently rated 4.8+ stars for shoreline cleanliness with uncommercialized natural beachscapes.',
    criteria: [
      'High water clarity & low turbidity ratings',
      'Natural coral-limestone geological formations',
      'Community cleanup drives logged monthly',
    ],
    themeColor: {
      bg: 'bg-sky-50',
      text: 'text-sky-900',
      border: 'border-sky-200',
    },
  },
  {
    id: 'dest-scenic-summit',
    name: 'Scenic Highland Ridge',
    category: 'nature',
    icon: '⛰️',
    description: 'Elevated panoramic viewpoint overlooking the Lingayen Gulf and Cordilleras.',
    howToEarn: 'Pioneer vantage point mapped with elevation contours and scenic sunrise vistas.',
    criteria: [
      'Over 150m elevation overlooking gulf or valleys',
      'Marked hiking trail with safety railings',
      'Curated photo checkpoint location',
    ],
    themeColor: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      border: 'border-emerald-200',
    },
  },
  {
    id: 'dest-ecotourism',
    name: 'Zero-Waste Eco-Reserve',
    category: 'nature',
    icon: '🌿',
    description: 'Sustainable tourism zone practicing community-led mangrove reforestation.',
    howToEarn: 'Awarded to locations that mandate reusable containers and partner with local mangrove planters.',
    criteria: [
      'Zero single-use plastics policy enforced',
      'Active mangrove or native tree planting trail',
      'Solar-powered lighting or low-impact infrastructure',
    ],
    themeColor: {
      bg: 'bg-green-50',
      text: 'text-green-900',
      border: 'border-green-300',
    },
  },

  // --- Culture & Gastronomy Badges ---
  {
    id: 'dest-bangus-capital',
    name: 'Dagupan Bangus Haven',
    category: 'culture',
    icon: '🐟',
    description: 'Authentic boneless milkfish cuisine and traditional aquaculture ponds.',
    howToEarn: 'Certified member of the Dagupan City Bangus culinary heritage network.',
    criteria: [
      'Fresh estuary aquaculture sourcing verified',
      'Traditional deboning and marination craft heritage',
      'Featured in annual Bangus Festival official guide',
    ],
    themeColor: {
      bg: 'bg-teal-50',
      text: 'text-teal-900',
      border: 'border-teal-200',
    },
  },
  {
    id: 'dest-native-delicacy',
    name: 'Native Delicacy Trail',
    category: 'culture',
    icon: '🥭',
    description: 'Known for traditional tupig, puto Calasiao, and heirloom salt pans.',
    howToEarn: 'Culinary preservation stop verified for selling authentic handmade Pangasinan delicacies.',
    criteria: [
      'Traditional clay oven or clay vat cooking methods',
      'Locally sourced glutinous rice and coconut husk firewood',
      'Recommended food artisan stop on provincial trail',
    ],
    themeColor: {
      bg: 'bg-orange-50',
      text: 'text-orange-950',
      border: 'border-orange-200',
    },
  },
  {
    id: 'dest-centuries-old',
    name: 'Centuries-Old Landmark',
    category: 'culture',
    icon: '📜',
    description: 'Preserved Spanish colonial brickwork, belfries, or maritime beacons.',
    howToEarn: 'Architectural structures dating to the 16th–19th centuries standing in continuous civic or cultural use.',
    criteria: [
      'Century-plus historical provenance verified',
      'Original coral-stone or terracotta brick masonry',
      'Documented local historical marker',
    ],
    themeColor: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-900',
      border: 'border-yellow-200',
    },
  },

  // --- Atmosphere & Crowd Badges ---
  {
    id: 'dest-quiet-oasis',
    name: 'Calm Zen Sanctuary',
    category: 'atmosphere',
    icon: '🧘',
    description: 'Low crowd pressure and peaceful acoustic ambiance. Ideal for mindful retreats.',
    howToEarn: 'Maintains low noise index and consistent green crowd status (<30% peak capacity) during daylight hours.',
    criteria: [
      '24-hr crowd estimator reports tranquil foot traffic',
      'Absence of motorized watercraft noise',
      'Mindful traveler code observed on grounds',
    ],
    themeColor: {
      bg: 'bg-lime-50',
      text: 'text-lime-900',
      border: 'border-lime-200',
    },
  },
  {
    id: 'dest-golden-hour',
    name: 'Golden Hour Sunset',
    category: 'atmosphere',
    icon: '🌅',
    description: 'Unobstructed western horizon view renowned for spectacular twilight skies.',
    howToEarn: 'Verified western coastline orientation with panoramic horizon views unobstructed by hills.',
    criteria: [
      'West-facing coastal azimuth angle (250°–290°)',
      'Scenic reflections over open water or salt beds',
      'High traveler check-in volume between 5:00–6:30 PM',
    ],
    themeColor: {
      bg: 'bg-rose-50',
      text: 'text-rose-900',
      border: 'border-rose-200',
    },
  },
  {
    id: 'dest-hidden-gem',
    name: 'Secret Local Gem',
    category: 'atmosphere',
    icon: '💎',
    description: 'Off-the-beaten-path destination uncovered by pioneer community scouts.',
    howToEarn: 'Discovered and validated by certified JuanDerQuest scouts with fewer than 50 crowd visits per week.',
    criteria: [
      'Original geotagged submission by pioneer explorer',
      'Low tourist saturation / authentic local vibe',
      'Unspoiled natural or cultural surroundings',
    ],
    themeColor: {
      bg: 'bg-purple-50',
      text: 'text-purple-900',
      border: 'border-purple-200',
    },
  },
  {
    id: 'dest-photographers-paradise',
    name: "Photographer's Choice",
    category: 'atmosphere',
    icon: '📸',
    description: 'Dramatic rock formations, tidal pools, or historic architectural backdrops.',
    howToEarn: 'Awarded when over 80% of traveler reviews commend exceptional aesthetic and photography conditions.',
    criteria: [
      'Distinctive natural rock arches or tidal geometry',
      'High quality community photo submission density',
      'Top rated photo spot on Explore feed',
    ],
    themeColor: {
      bg: 'bg-fuchsia-50',
      text: 'text-fuchsia-900',
      border: 'border-fuchsia-200',
    },
  },

  // --- Web3 & Quest Bounty Badges ---
  {
    id: 'dest-soulbound-quest',
    name: 'Soulbound NFT Quest',
    category: 'web3',
    icon: '🪙',
    description: 'Features an on-site checkpoint quest granting verifiable soulbound credentials.',
    howToEarn: 'Eligible for in-app AR viewfinder check-in and minting of an immutable Base L2 Soulbound badge upon completion.',
    criteria: [
      'AR geospatial marker active on coordinates',
      'Automatic smart contract minting bridge available',
      'Provides permanent cryptographic verification of visit',
    ],
    themeColor: {
      bg: 'bg-amber-100/70',
      text: 'text-amber-950',
      border: 'border-amber-400',
    },
  },
  {
    id: 'dest-bounty-active',
    name: '500 mJDQ Bounty Active',
    category: 'web3',
    icon: '🏆',
    description: 'Verified check-in submissions currently receive elevated community rewards.',
    howToEarn: 'Sponsored by municipal tourism boards or local merchants to distribute bonus reward points.',
    criteria: [
      '500 mJDQ reward pool currently active',
      'Requires verified GPS check-in & photo proof',
      'Points redeemable for local partner vouchers',
    ],
    themeColor: {
      bg: 'bg-emerald-100/70',
      text: 'text-emerald-950',
      border: 'border-emerald-400',
    },
  },
];

// ========================================================================
// 3. Helper Functions & Local Storage Management
// ========================================================================

const STORAGE_KEY_ACTIVE_BADGES = 'juanderquest_active_badges';
const EVENT_BADGES_UPDATED = 'juanderquest_badges_updated';

/**
 * Returns currently active badge IDs chosen by the user for their nametag.
 */
export function getActiveNametagBadgeIds(): string[] {
  if (typeof window === 'undefined') return DEFAULT_ACTIVE_BADGE_IDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_BADGES);
    if (!raw) return DEFAULT_ACTIVE_BADGE_IDS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_ACTIVE_BADGE_IDS;
  } catch {
    return DEFAULT_ACTIVE_BADGE_IDS;
  }
}

/**
 * Returns full UserBadge objects for the active nametag badge IDs.
 */
export function getActiveNametagBadges(): UserBadge[] {
  const ids = getActiveNametagBadgeIds();
  return SAMPLE_USER_BADGES.filter((b) => ids.includes(b.id));
}

/**
 * Sets active badge IDs for the user's nametag (max 3 badges).
 */
export function setActiveNametagBadgeIds(badgeIds: string[]): void {
  if (typeof window === 'undefined') return;
  const bounded = badgeIds.slice(0, 3);
  localStorage.setItem(STORAGE_KEY_ACTIVE_BADGES, JSON.stringify(bounded));
  window.dispatchEvent(new CustomEvent(EVENT_BADGES_UPDATED, { detail: bounded }));
}

/**
 * Subscribes to badge selection updates across the application.
 */
export function onBadgesUpdated(callback: (badgeIds: string[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<string[]>;
    callback(custom.detail || getActiveNametagBadgeIds());
  };
  window.addEventListener(EVENT_BADGES_UPDATED, handler);
  return () => window.removeEventListener(EVENT_BADGES_UPDATED, handler);
}

/**
 * Deterministically assigns sample destination badges to a spot based on its ID or category.
 * Used for rich variety during testing and demos.
 */
export function getSampleDestinationBadges(spotIdOrSlug: string, category?: string): DestinationBadge[] {
  let hash = 0;
  for (let i = 0; i < spotIdOrSlug.length; i++) {
    hash = (hash << 5) - hash + spotIdOrSlug.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const badges: DestinationBadge[] = [];

  // Always assign an official or atmosphere badge
  const officialOptions = SAMPLE_DESTINATION_BADGES.filter(b => b.category === 'official');
  const atmosphereOptions = SAMPLE_DESTINATION_BADGES.filter(b => b.category === 'atmosphere');
  const natureOptions = SAMPLE_DESTINATION_BADGES.filter(b => b.category === 'nature');
  const cultureOptions = SAMPLE_DESTINATION_BADGES.filter(b => b.category === 'culture');
  const web3Options = SAMPLE_DESTINATION_BADGES.filter(b => b.category === 'web3');

  // Badge 1: Verification / Official
  badges.push(officialOptions[positiveHash % officialOptions.length]);

  // Badge 2: Nature or Culture depending on category
  if (category?.toLowerCase().includes('heritage') || category?.toLowerCase().includes('food') || category?.toLowerCase().includes('culture')) {
    badges.push(cultureOptions[(positiveHash + 1) % cultureOptions.length]);
  } else {
    badges.push(natureOptions[(positiveHash + 1) % natureOptions.length]);
  }

  // Badge 3: Atmosphere or Web3 Quest
  if (positiveHash % 2 === 0) {
    badges.push(atmosphereOptions[(positiveHash + 2) % atmosphereOptions.length]);
  } else {
    badges.push(web3Options[(positiveHash + 2) % web3Options.length]);
  }

  return badges;
}

/**
 * Deterministically returns 1-3 user badges for a given user identifier.
 * If isCurrentUser is true, returns their locally selected nametag badges.
 */
export function getUserBadges(userIdOrName: string, isCurrentUser = false): UserBadge[] {
  if (isCurrentUser) {
    return getActiveNametagBadges();
  }
  if (!userIdOrName) return [SAMPLE_USER_BADGES[0]];
  let hash = 0;
  for (let i = 0; i < userIdOrName.length; i++) {
    hash = (hash << 5) - hash + userIdOrName.charCodeAt(i);
    hash |= 0;
  }
  const pos = Math.abs(hash);
  const count = (pos % 2) + 1;
  const b1 = SAMPLE_USER_BADGES[pos % SAMPLE_USER_BADGES.length];
  if (count === 1) return [b1];
  const b2 = SAMPLE_USER_BADGES[(pos + 3) % SAMPLE_USER_BADGES.length];
  return b1.id === b2.id ? [b1] : [b1, b2];
}
