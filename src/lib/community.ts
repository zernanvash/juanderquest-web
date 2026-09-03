export interface PublicTravelerProfile {
  id: string;
  displayName: string;
  handle: string;
  initials: string;
  status: string;
  homeMunicipality: string;
  bio: string;
  scoutLevel: number;
  verifiedDestinations: number;
  municipalitiesExplored: number;
  communityActivities: number;
  title: string;
  badges: Array<{ name: string; description: string }>;
  recentActivity: Array<{ label: string; detail: string; period: string }>;
}

export const publicTravelerProfiles: PublicTravelerProfile[] = [
  {
    id: 'juan-explorer',
    displayName: 'Juan Explorer',
    handle: '@juanexplores',
    initials: 'JE',
    status: 'Building my Western Pangasinan trail',
    homeMunicipality: 'Dagupan City',
    bio: 'Beach walks, heritage stops, and locally owned food spots across Pangasinan.',
    scoutLevel: 8,
    verifiedDestinations: 24,
    municipalitiesExplored: 9,
    communityActivities: 6,
    title: 'Coastal Trailblazer',
    badges: [
      { name: 'Coastal Explorer', description: 'Completed a verified coastal destination circuit.' },
      { name: 'Community Voter', description: 'Participated in a Community Choice preview round.' },
      { name: 'Hidden Gem Scout', description: 'Shared a destination approved by the community.' },
    ],
    recentActivity: [
      { label: 'Verified destination', detail: 'Completed a Pangasinan coastal stop', period: 'This month' },
      { label: 'Community activity', detail: 'Joined a local tourism event', period: 'Last month' },
    ],
  },
  {
    id: 'maya-travels',
    displayName: 'Maya Travels',
    handle: '@mayatravels',
    initials: 'MT',
    status: 'Searching for heritage stories and quiet places',
    homeMunicipality: 'Lingayen',
    bio: 'A heritage enthusiast documenting accessible and community-managed destinations.',
    scoutLevel: 6,
    verifiedDestinations: 17,
    municipalitiesExplored: 7,
    communityActivities: 9,
    title: 'Heritage Keeper',
    badges: [
      { name: 'Heritage Keeper', description: 'Completed verified cultural heritage quests.' },
      { name: 'Community Builder', description: 'Joined verified community activities.' },
    ],
    recentActivity: [
      { label: 'Tourism circuit', detail: 'Advanced the Central Pangasinan heritage trail', period: 'This month' },
      { label: 'Helpful contribution', detail: 'Added accessibility information', period: 'This month' },
    ],
  },
  {
    id: 'pao-local-scout',
    displayName: 'Pao Local Scout',
    handle: '@paolocalscout',
    initials: 'PS',
    status: 'Finding family-run food stops in every town',
    homeMunicipality: 'Alaminos City',
    bio: 'Local-food traveler and community guide focused on small Pangasinan businesses.',
    scoutLevel: 5,
    verifiedDestinations: 14,
    municipalitiesExplored: 6,
    communityActivities: 4,
    title: 'Culinary Scout',
    badges: [
      { name: 'Food Explorer', description: 'Completed verified culinary quests.' },
      { name: 'Local Supporter', description: 'Visited participating local enterprises.' },
    ],
    recentActivity: [
      { label: 'Verified destination', detail: 'Completed a local food trail stop', period: 'This week' },
      { label: 'Saved collection', detail: 'Updated a private weekend itinerary', period: 'This week' },
    ],
  },
];

export const communityChoicePreview = {
  round: 'September 2026 Community Choice Preview',
  closesLabel: 'UI preview — voting is not active',
  entries: [
    { rank: 1, slug: 'patar-white-beach', name: 'Patar White Beach', municipality: 'Bolinao', votes: 428, share: 34 },
    { rank: 2, slug: 'hundred-islands-national-park', name: 'Hundred Islands National Park', municipality: 'Alaminos City', votes: 361, share: 29 },
    { rank: 3, slug: 'bolinao-falls-1', name: 'Bolinao Falls 1', municipality: 'Bolinao', votes: 247, share: 20 },
    { rank: 4, slug: 'pangasinan-provincial-capitol', name: 'Pangasinan Provincial Capitol', municipality: 'Lingayen', votes: 134, share: 11 },
    { rank: 5, slug: 'minor-basilica-of-manaoag', name: 'Minor Basilica of Our Lady of Manaoag', municipality: 'Manaoag', votes: 76, share: 6 },
  ],
};

export function findPublicTraveler(id: string) {
  return publicTravelerProfiles.find((profile) => profile.id === id);
}
