/**
 * Geographic Area Catalog for JuanDerQuest
 * Supports Google Maps-style area/region queries (e.g. "Pangasinan", "Bolinao", "Dagupan", "Philippines")
 * to display whole geographic zones on the map without pinning an individual spot.
 *
 * Covers all 48 local government units (44 municipalities + 4 cities) of Pangasinan,
 * plus major regional and national boundaries.
 */

export interface AreaDefinition {
  id: string;
  name: string;
  type: 'country' | 'region' | 'province' | 'city' | 'municipality';
  subtitle: string;
  center: [number, number];
  zoom: number;
  keywords: string[];
}

export const KNOWN_AREAS: AreaDefinition[] = [
  // National & Regional
  {
    id: 'philippines',
    name: 'Philippines',
    type: 'country',
    subtitle: 'Country in Southeast Asia • Philippine Archipelago',
    center: [15.89, 120.30],
    zoom: 7,
    keywords: ['philippines', 'pilipinas', 'ph', 'philippine', 'archipelago'],
  },
  {
    id: 'luzon',
    name: 'Luzon',
    type: 'region',
    subtitle: 'Main island group of the Philippines',
    center: [16.20, 120.50],
    zoom: 8,
    keywords: ['luzon', 'northern luzon', 'central luzon'],
  },
  {
    id: 'ilocos',
    name: 'Ilocos Region (Region I)',
    type: 'region',
    subtitle: 'Administrative region in northwestern Luzon including Pangasinan',
    center: [16.50, 120.40],
    zoom: 8,
    keywords: ['ilocos', 'region 1', 'region i', 'ilocandia'],
  },
  {
    id: 'lingayen-gulf',
    name: 'Lingayen Gulf',
    type: 'region',
    subtitle: 'Major coastal gulf and marine basin of Pangasinan',
    center: [16.15, 120.15],
    zoom: 10,
    keywords: ['lingayen gulf', 'gulf', 'baywalk', 'coastal pangasinan'],
  },

  // Provincial
  {
    id: 'pangasinan',
    name: 'Pangasinan',
    type: 'province',
    subtitle: 'Province in Ilocos Region (Region I) • 48 Cities & Municipalities',
    center: [16.03, 120.33],
    zoom: 10,
    keywords: ['pangasinan', 'pangasinan province', 'pang', 'pangasinan tourism', 'panag-asinan'],
  },

  // 4 Cities of Pangasinan
  {
    id: 'alaminos',
    name: 'Alaminos City',
    type: 'city',
    subtitle: 'Component City in Western Pangasinan • Home of the Hundred Islands',
    center: [16.155, 119.980],
    zoom: 12,
    keywords: ['alaminos', 'alaminos city', 'hundred islands city'],
  },
  {
    id: 'dagupan',
    name: 'Dagupan City',
    type: 'city',
    subtitle: 'Independent component city in Central Pangasinan • Bangus Capital of the World',
    center: [16.043, 120.335],
    zoom: 13,
    keywords: ['dagupan', 'dagupan city', 'bangus city'],
  },
  {
    id: 'san-carlos',
    name: 'San Carlos City',
    type: 'city',
    subtitle: 'Component City in Central Pangasinan • Mango & Bamboo Crafts Capital',
    center: [15.928, 120.349],
    zoom: 13,
    keywords: ['san carlos', 'san carlos city', 'binalatongan'],
  },
  {
    id: 'urdaneta',
    name: 'Urdaneta City',
    type: 'city',
    subtitle: 'Component City & Commercial Crossroads in Eastern Pangasinan',
    center: [15.976, 120.571],
    zoom: 13,
    keywords: ['urdaneta', 'urdaneta city'],
  },

  // 44 Municipalities of Pangasinan (Alphabetical)
  {
    id: 'agno',
    name: 'Agno',
    type: 'municipality',
    subtitle: 'Coastal municipality in Western Pangasinan • Umbrella Rocks & Sabangan Beach',
    center: [16.115, 119.800],
    zoom: 12,
    keywords: ['agno', 'umbrella rocks'],
  },
  {
    id: 'aguilar',
    name: 'Aguilar',
    type: 'municipality',
    subtitle: 'Municipality in Central Pangasinan • Daang Kalikasan Gateway',
    center: [15.867, 120.240],
    zoom: 13,
    keywords: ['aguilar'],
  },
  {
    id: 'alcala',
    name: 'Alcala',
    type: 'municipality',
    subtitle: 'Agricultural municipality in Eastern Pangasinan along the Agno River',
    center: [15.848, 120.523],
    zoom: 13,
    keywords: ['alcala', 'carmay'],
  },
  {
    id: 'anda',
    name: 'Anda',
    type: 'municipality',
    subtitle: 'Island municipality in Western Pangasinan • Tondol White Sand Beach',
    center: [16.290, 119.950],
    zoom: 12,
    keywords: ['anda', 'tondol', 'cabarruyan'],
  },
  {
    id: 'asingan',
    name: 'Asingan',
    type: 'municipality',
    subtitle: 'Municipality in Eastern Pangasinan • Ancestral hometown of Pres. Fidel V. Ramos',
    center: [16.002, 120.672],
    zoom: 13,
    keywords: ['asingan', 'fvr'],
  },
  {
    id: 'balungao',
    name: 'Balungao',
    type: 'municipality',
    subtitle: 'Municipality in Eastern Pangasinan • Mount Balungao Hot Springs & Hilltop Adventure',
    center: [15.898, 120.702],
    zoom: 13,
    keywords: ['balungao', 'mt balungao'],
  },
  {
    id: 'bani',
    name: 'Bani',
    type: 'municipality',
    subtitle: 'Municipality in Western Pangasinan • Watermelon Capital & Bangrin Mangrove',
    center: [16.185, 119.865],
    zoom: 12,
    keywords: ['bani', 'olanen', 'surip'],
  },
  {
    id: 'basista',
    name: 'Basista',
    type: 'municipality',
    subtitle: 'Central Pangasinan municipality • Basket Weaving & Rice Fields',
    center: [15.850, 120.400],
    zoom: 13,
    keywords: ['basista'],
  },
  {
    id: 'bautista',
    name: 'Bautista',
    type: 'municipality',
    subtitle: 'Southern Pangasinan • Historical birthplace of the Philippine National Anthem lyrics',
    center: [15.812, 120.485],
    zoom: 13,
    keywords: ['bautista', 'palma'],
  },
  {
    id: 'bayambang',
    name: 'Bayambang',
    type: 'municipality',
    subtitle: 'Municipality in Central-Southern Pangasinan • St. Vincent Ferrer Giant Statue',
    center: [15.810, 120.455],
    zoom: 13,
    keywords: ['bayambang', 'st vincent ferrer', 'mangabul'],
  },
  {
    id: 'binalonan',
    name: 'Binalonan',
    type: 'municipality',
    subtitle: 'Municipality in Eastern Pangasinan • Aviation Hub, Heritage Parish & Rock Garden',
    center: [16.048, 120.598],
    zoom: 13,
    keywords: ['binalonan', 'airfield'],
  },
  {
    id: 'binmaley',
    name: 'Binmaley',
    type: 'municipality',
    subtitle: 'Coastal municipality in Central Pangasinan • Seafood & Bangus Aquaculture Heartland',
    center: [16.027, 120.268],
    zoom: 13,
    keywords: ['binmaley', 'seafood capital'],
  },
  {
    id: 'bolinao',
    name: 'Bolinao',
    type: 'municipality',
    subtitle: 'Coastal eco-tourism haven in Western Pangasinan • Cape Bolinao Lighthouse & Patar Beach',
    center: [16.330, 119.850],
    zoom: 12,
    keywords: ['bolinao', 'patar', 'cape bolinao', 'balingasay'],
  },
  {
    id: 'bugallon',
    name: 'Bugallon',
    type: 'municipality',
    subtitle: 'Gateway municipality to Western Pangasinan • Mount Zion Pilgrim Mountain',
    center: [15.952, 120.218],
    zoom: 13,
    keywords: ['bugallon', 'mt zion'],
  },
  {
    id: 'burgos',
    name: 'Burgos',
    type: 'municipality',
    subtitle: 'Western coastal municipality • Cabongaoan White Beach & Tidal Death Pool',
    center: [16.062, 119.858],
    zoom: 12,
    keywords: ['burgos', 'cabongaoan', 'death pool'],
  },
  {
    id: 'calasiao',
    name: 'Calasiao',
    type: 'municipality',
    subtitle: 'Central Pangasinan • Famous Calasiao Puto & National Cultural Treasure Parish',
    center: [16.012, 120.358],
    zoom: 13,
    keywords: ['calasiao', 'puto calasiao'],
  },
  {
    id: 'dasol',
    name: 'Dasol',
    type: 'municipality',
    subtitle: 'Coastal municipality in Western Pangasinan • Tambobong White Beach & Salt Harvesting',
    center: [15.908, 119.789],
    zoom: 12,
    keywords: ['dasol', 'tambobong', 'colibra'],
  },
  {
    id: 'infanta',
    name: 'Infanta',
    type: 'municipality',
    subtitle: 'Westernmost municipality of Pangasinan • Bordering Zambales coastal trails',
    center: [15.823, 119.907],
    zoom: 12,
    keywords: ['infanta'],
  },
  {
    id: 'labrador',
    name: 'Labrador',
    type: 'municipality',
    subtitle: 'Coastal municipality along Lingayen Gulf • Uyong Beach & Eco-Tourism Parks',
    center: [16.030, 120.143],
    zoom: 13,
    keywords: ['labrador', 'uyong'],
  },
  {
    id: 'laoac',
    name: 'Laoac',
    type: 'municipality',
    subtitle: 'Agricultural municipality in Central-Eastern Pangasinan',
    center: [16.035, 120.552],
    zoom: 13,
    keywords: ['laoac'],
  },
  {
    id: 'lingayen',
    name: 'Lingayen',
    type: 'municipality',
    subtitle: 'Provincial Capital of Pangasinan • Provincial Capitol Complex & Gulf Beachfront',
    center: [16.022, 120.232],
    zoom: 13,
    keywords: ['lingayen', 'capitol', 'lingayen beach'],
  },
  {
    id: 'mabini',
    name: 'Mabini',
    type: 'municipality',
    subtitle: 'Municipality in Western Pangasinan • Cacupangan Cave & Ecotourism Treks',
    center: [16.070, 119.940],
    zoom: 13,
    keywords: ['mabini', 'cacupangan'],
  },
  {
    id: 'malasiqui',
    name: 'Malasiqui',
    type: 'municipality',
    subtitle: 'Spacious town in Central Pangasinan • Agricultural Heartland & Heritage Churches',
    center: [15.918, 120.418],
    zoom: 13,
    keywords: ['malasiqui'],
  },
  {
    id: 'manaoag',
    name: 'Manaoag',
    type: 'municipality',
    subtitle: 'Pilgrimage Capital of the North • Minor Basilica of Our Lady of the Rosary',
    center: [16.044, 120.485],
    zoom: 13,
    keywords: ['manaoag', 'basilica', 'our lady of manaoag'],
  },
  {
    id: 'mangaldan',
    name: 'Mangaldan',
    type: 'municipality',
    subtitle: 'Municipality in Central Pangasinan • Renowned for Carabao Meat Delicacies & Tapa',
    center: [16.071, 120.404],
    zoom: 13,
    keywords: ['mangaldan', 'tapa'],
  },
  {
    id: 'mangatarem',
    name: 'Mangatarem',
    type: 'municipality',
    subtitle: 'Largest municipality by area • Daang Kalikasan & Manleluag Spring National Park',
    center: [15.789, 120.292],
    zoom: 12,
    keywords: ['mangatarem', 'manleluag', 'daang kalikasan'],
  },
  {
    id: 'mapandan',
    name: 'Mapandan',
    type: 'municipality',
    subtitle: 'Inland municipality in Central Pangasinan • Annual Pandan Festival',
    center: [16.028, 120.455],
    zoom: 13,
    keywords: ['mapandan'],
  },
  {
    id: 'natividad',
    name: 'Natividad',
    type: 'municipality',
    subtitle: 'Foothill municipality in Eastern Pangasinan • Sky Plaza & Caraballo Mountain Ridge',
    center: [16.043, 120.797],
    zoom: 13,
    keywords: ['natividad', 'sky plaza', 'maranum falls'],
  },
  {
    id: 'pozorrubio',
    name: 'Pozorrubio',
    type: 'municipality',
    subtitle: 'Northern gateway municipality • Handcrafted Cutlery, Swords & Ornamental Ironworks',
    center: [16.110, 120.545],
    zoom: 13,
    keywords: ['pozorrubio', 'cutlery'],
  },
  {
    id: 'rosales',
    name: 'Rosales',
    type: 'municipality',
    subtitle: 'Major commercial & transport gateway in Southeastern Pangasinan',
    center: [15.892, 120.633],
    zoom: 13,
    keywords: ['rosales', 'sm rosales', 'carmen'],
  },
  {
    id: 'san-fabian',
    name: 'San Fabian',
    type: 'municipality',
    subtitle: 'Coastal municipality in Northern Pangasinan • Long shoreline along Lingayen Gulf',
    center: [16.120, 120.402],
    zoom: 13,
    keywords: ['san fabian', 'sanfabian', 'san fabian beach'],
  },
  {
    id: 'san-jacinto',
    name: 'San Jacinto',
    type: 'municipality',
    subtitle: 'Central Pangasinan municipality • Traditional Corn & Tabungaw Crafts',
    center: [16.072, 120.440],
    zoom: 13,
    keywords: ['san jacinto', 'sanjacinto'],
  },
  {
    id: 'san-manuel',
    name: 'San Manuel',
    type: 'municipality',
    subtitle: 'Eastern Pangasinan • San Roque Multipurpose Dam & Caraballo Ecotourism',
    center: [16.065, 120.668],
    zoom: 13,
    keywords: ['san manuel', 'san roque dam'],
  },
  {
    id: 'san-nicolas',
    name: 'San Nicolas',
    type: 'municipality',
    subtitle: 'Highland border municipality • Headwaters of Agno River & Red Arrow Monument',
    center: [16.072, 120.770],
    zoom: 13,
    keywords: ['san nicolas', 'malico', 'villa verde'],
  },
  {
    id: 'san-quintin',
    name: 'San Quintin',
    type: 'municipality',
    subtitle: 'Eastern Pangasinan foothill municipality • Mountain stream resorts',
    center: [15.985, 120.815],
    zoom: 13,
    keywords: ['san quintin'],
  },
  {
    id: 'santa-barbara',
    name: 'Santa Barbara',
    type: 'municipality',
    subtitle: 'Historic town in Central Pangasinan • Mango seedling propagation center',
    center: [16.002, 120.403],
    zoom: 13,
    keywords: ['santa barbara', 'sta barbara'],
  },
  {
    id: 'santa-maria',
    name: 'Santa Maria',
    type: 'municipality',
    subtitle: 'Eastern Pangasinan • Rice and vegetable granary along the Agno basin',
    center: [15.978, 120.697],
    zoom: 13,
    keywords: ['santa maria', 'sta maria'],
  },
  {
    id: 'santo-tomas',
    name: 'Santo Tomas',
    type: 'municipality',
    subtitle: 'Smallest municipality in Pangasinan • High-density agricultural productivity',
    center: [15.875, 120.585],
    zoom: 13,
    keywords: ['santo tomas', 'sto tomas'],
  },
  {
    id: 'sison',
    name: 'Sison',
    type: 'municipality',
    subtitle: 'Northern highland gateway to Benguet and Baguio City via Kennon Road',
    center: [16.173, 120.510],
    zoom: 13,
    keywords: ['sison', 'antong falls'],
  },
  {
    id: 'sual',
    name: 'Sual',
    type: 'municipality',
    subtitle: 'Deep-water port town in Western Pangasinan • Scenic coves, power station & fishing ports',
    center: [16.115, 120.090],
    zoom: 13,
    keywords: ['sual', 'masloc', 'sual port'],
  },
  {
    id: 'tayug',
    name: 'Tayug',
    type: 'municipality',
    subtitle: 'Eastern Pangasinan • Sunflower Ecofarm & Agricultural Trade Center',
    center: [16.027, 120.745],
    zoom: 13,
    keywords: ['tayug', 'sunflower maze', 'ecofarm'],
  },
  {
    id: 'umingan',
    name: 'Umingan',
    type: 'municipality',
    subtitle: 'Expansive municipality in Southeastern Pangasinan • Bordering Nueva Ecija',
    center: [15.925, 120.840],
    zoom: 12,
    keywords: ['umingan'],
  },
  {
    id: 'urbiztondo',
    name: 'Urbiztondo',
    type: 'municipality',
    subtitle: 'Central Pangasinan municipality • Agriculture along the lower Agno River',
    center: [15.823, 120.332],
    zoom: 13,
    keywords: ['urbiztondo'],
  },
  {
    id: 'villasis',
    name: 'Villasis',
    type: 'municipality',
    subtitle: 'Eastern Pangasinan • Vegetable & Talong (Eggplant) Capital of the Philippines',
    center: [15.902, 120.588],
    zoom: 13,
    keywords: ['villasis', 'talong festival'],
  },
];

/**
 * Searches areas matching a given string query.
 */
export function findMatchingAreas(query: string): AreaDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  return KNOWN_AREAS.filter((area) => {
    if (area.name.toLowerCase().includes(q)) return true;
    if (area.keywords.some((kw) => kw.includes(q) || q.includes(kw))) return true;
    return false;
  }).sort((a, b) => {
    const aExact = a.id === q || a.name.toLowerCase() === q;
    const bExact = b.id === q || b.name.toLowerCase() === q;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aNameStarts = a.name.toLowerCase().startsWith(q);
    const bNameStarts = b.name.toLowerCase().startsWith(q);
    if (aNameStarts && !bNameStarts) return -1;
    if (!aNameStarts && bNameStarts) return 1;

    const aNameInc = a.name.toLowerCase().includes(q);
    const bNameInc = b.name.toLowerCase().includes(q);
    if (aNameInc && !bNameInc) return -1;
    if (!aNameInc && bNameInc) return 1;

    return 0;
  });
}

/**
 * Finds a single area definition matching by ID, exact name, or primary keyword.
 */
export function findAreaByIdOrName(query: string): AreaDefinition | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  return (
    KNOWN_AREAS.find((area) => area.id.toLowerCase() === q) ||
    KNOWN_AREAS.find((area) => area.name.toLowerCase() === q) ||
    KNOWN_AREAS.find((area) => area.keywords.some((kw) => kw === q)) ||
    KNOWN_AREAS.find(
      (area) =>
        area.name.toLowerCase().includes(q) ||
        area.keywords.some((kw) => kw.includes(q) || q.includes(kw))
    )
  );
}
