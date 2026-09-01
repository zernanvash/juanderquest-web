import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.jdq.zernanvash.dev';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jdq_token') || sessionStorage.getItem('jdq_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const uuid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

export type ProposalVoteChoice = 'yes' | 'no';

export const buildProposalVotePayload = (choice: ProposalVoteChoice) => ({
  choice,
  idempotency_key: uuid(),
});

// ---- Normalized models (backend returns snake_case; pages consume camelCase) ----

export interface UserModel {
  id: string;
  seedId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  role: 'user' | 'admin';
  points: number; // demo_points
}

export interface QuestModel {
  id: string;
  title: string;
  description: string;
  category: 'eco' | 'cultural' | 'food_trade';
  locationName: string;
  gpsLat: number;
  gpsLng: number;
  radiusMeters: number;
  baseRewardPhp?: number;
  difficultyFactor?: number;
  geoMultiplier?: number;
  rewardPoints: number;
  markerCode?: string; // present on detail only; list does not expose markers
  markerImageUrl: string;
}

export interface PayoutRecipient {
  user_id: string;
  display_name: string;
  role: string;
  duty: string;
  share_bps: number;
}

export interface ProposalModel {
  id: string;
  title: string;
  locationName: string;
  category: string;
  description: string;
  state: string;
  submittedBy: string;
  submittedById: string;
  recipients: PayoutRecipient[];
  organizerBondMjdq: number;
  bondStatus: string;
  eligibleVoterSnapshot: number;
  quorumRequired: number;
  yesVotes: number;
  noVotes: number;
  votes: number;
  voteFeeMjdq: number;
  escrowMjdq: number;
  votingClosesAt?: string;
  createdAt: string;
}

export interface SubmissionModel {
  id: string;
  questId: string;
  questTitle: string;
  category: string;
  rewardPoints: number;
  status: 'pending' | 'approved' | 'rejected';
  capturedLat: number;
  capturedLng: number;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface VoucherModel {
  id: string;
  merchantName: string;
  title: string;
  description: string;
  costPoints: number;
}

export interface RedemptionModel {
  id: string;
  code: string;
  costPoints: number;
  voucherTitle: string;
  merchantName: string;
}

export interface GovernanceConfigModel {
  proposalVoteFeeMjdq: number;
  feedbackVoteFeeMjdq: number;
  burnBps: number;
  organizerBondMjdq: number;
  quorumFloor: number;
  quorumPercent: number;
  settlement: string;
}

export interface WalletModel {
  settlement: string;
  unit: string;
  balanceMjdq: number;
  balanceJdq: number;
}

export interface SpotModel {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  municipality: string;
  address: string;
  gpsLat: number;
  gpsLng: number;
  priceLevel: number;
  hours: Record<string, string>;
  amenities: string[];
  imageUrl: string;
  assetIds?: string[];
  sourceType: string;
  sourceName: string;
  trustLevel: string;
  questId?: string;
  distanceKm?: number;
  recommendationScore?: number;
  recommendationReasons: string[];
  saved: boolean;
  trendScore: number;
  crowdStatus: 'quiet' | 'moderate' | 'estimated_busy' | 'unknown';
  crowdConfidence: string;
  crowdUpdatedAt?: string;
}

export interface UploadedAssetModel {
  asset_id: string;
  url: string;
  mime_type: string;
  media_type: 'image' | 'video';
  width: number;
  height: number;
  size_bytes: number;
}

export function isVideoMedia(url?: string, mimeType?: string, mediaType?: string): boolean {
  if (mediaType === 'video') return true;
  if (mimeType && mimeType.startsWith('video/')) return true;
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.m4v') ||
    cleanUrl.includes('spot_video')
  );
}

export async function uploadSpotMedia(file: File): Promise<UploadedAssetModel> {
  const formData = new FormData();
  formData.append('media', file);
  const res = await api.post('/spot-media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export const uploadSpotPhoto = uploadSpotMedia;


const DEFAULT_SPOT_IMAGES: Record<string, string> = {
  'hundred-islands-national-park': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
  'patar-white-beach': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'bolinao-falls-1': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
  'third-wave-cafe-dagupan': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
  'minor-basilica-of-manaoag': 'https://images.unsplash.com/photo-1548625361-16a9a087192a?auto=format&fit=crop&w=1200&q=80',
};

export function normalizeSpot(raw: any): SpotModel {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    category: raw.category,
    subcategory: raw.subcategory,
    tags: raw.tags || [],
    municipality: raw.municipality,
    address: raw.address,
    gpsLat: Number(raw.gps_lat),
    gpsLng: Number(raw.gps_lng),
    priceLevel: Number(raw.price_level) || 0,
    hours: raw.hours || {},
    amenities: raw.amenities || [],
    imageUrl: raw.image_url || DEFAULT_SPOT_IMAGES[raw.slug] || '',
    assetIds: raw.asset_ids || [],
    sourceType: raw.source_type,
    sourceName: raw.source_name,
    trustLevel: raw.trust_level,
    questId: raw.quest_id,
    distanceKm: raw.distance_km === undefined ? undefined : Number(raw.distance_km),
    recommendationScore: Number(raw.recommendation_score) || 0,
    recommendationReasons: raw.recommendation_reasons || [],
    saved: !!raw.saved,
    trendScore: Number(raw.trend_score) || 0,
    crowdStatus: raw.crowd_status || 'unknown',
    crowdConfidence: raw.crowd_confidence || 'none',
    crowdUpdatedAt: raw.crowd_updated_at || undefined,
  };
}

// ---- Mappers ----

type BackendUser = {
  id: string;
  seed_id: string;
  display_name: string;
  email: string;
  avatar_url: string;
  role: 'user' | 'admin';
  demo_points: number;
};

export function normalizeUser(raw: BackendUser): UserModel {
  return {
    id: raw.id,
    seedId: raw.seed_id,
    displayName: raw.display_name,
    email: raw.email,
    avatarUrl: raw.avatar_url || '',
    role: raw.role,
    points: Number(raw.demo_points) || 0,
  };
}

type BackendQuest = {
  id: string;
  title: string;
  description: string;
  category: QuestModel['category'];
  location_name: string;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  base_reward_php?: number;
  difficulty_factor?: number;
  geo_multiplier?: number;
  reward_points: number;
  marker_code?: string;
  marker_image_url?: string;
};

export function normalizeQuest(raw: BackendQuest): QuestModel {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    locationName: raw.location_name,
    gpsLat: Number(raw.gps_lat),
    gpsLng: Number(raw.gps_lng),
    radiusMeters: Number(raw.radius_meters),
    baseRewardPhp: raw.base_reward_php ? Number(raw.base_reward_php) : 25.0,
    difficultyFactor: raw.difficulty_factor ? Number(raw.difficulty_factor) : 1.0,
    geoMultiplier: raw.geo_multiplier ? Number(raw.geo_multiplier) : 2.0,
    rewardPoints: Number(raw.reward_points),
    markerCode: raw.marker_code,
    markerImageUrl: raw.marker_image_url || '',
  };
}

type BackendProposal = {
  id: string;
  title: string;
  location_name: string;
  category: string;
  description: string;
  state: string;
  submitted_by: string;
  submitted_by_id: string;
  recipients: PayoutRecipient[];
  organizer_bond_mjdq: number;
  bond_status: string;
  eligible_voter_snapshot: number;
  quorum_required: number;
  yes_votes: number;
  no_votes: number;
  votes: number;
  vote_fee_mjdq: number;
  escrow_mjdq: number;
  voting_closes_at?: string;
  created_at: string;
};

export function normalizeProposal(raw: BackendProposal): ProposalModel {
  return {
    id: raw.id,
    title: raw.title,
    locationName: raw.location_name,
    category: raw.category,
    description: raw.description,
    state: raw.state,
    submittedBy: raw.submitted_by,
    submittedById: raw.submitted_by_id,
    recipients: raw.recipients || [],
    organizerBondMjdq: Number(raw.organizer_bond_mjdq) || 0,
    bondStatus: raw.bond_status,
    eligibleVoterSnapshot: Number(raw.eligible_voter_snapshot) || 0,
    quorumRequired: Number(raw.quorum_required) || 0,
    yesVotes: Number(raw.yes_votes) || 0,
    noVotes: Number(raw.no_votes) || 0,
    votes: Number(raw.votes) || 0,
    voteFeeMjdq: Number(raw.vote_fee_mjdq) || 0,
    escrowMjdq: Number(raw.escrow_mjdq) || 0,
    votingClosesAt: raw.voting_closes_at,
    createdAt: raw.created_at,
  };
}

type BackendSubmission = {
  id: string;
  quest_id: string;
  quest_title?: string;
  category?: string;
  reward_points?: number;
  status: SubmissionModel['status'];
  captured_lat: number;
  captured_lng: number;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
};

export function normalizeSubmission(raw: BackendSubmission): SubmissionModel {
  return {
    id: raw.id,
    questId: raw.quest_id,
    questTitle: raw.quest_title || 'Unknown Quest',
    category: raw.category || 'eco',
    rewardPoints: Number(raw.reward_points) || 0,
    status: raw.status,
    capturedLat: Number(raw.captured_lat),
    capturedLng: Number(raw.captured_lng),
    rejectionReason: raw.rejection_reason ?? null,
    reviewedAt: raw.reviewed_at ?? null,
    createdAt: raw.created_at,
  };
}

type BackendVoucher = {
  id: string;
  merchant_name?: string;
  title: string;
  description: string;
  cost_points: number;
};

export function normalizeVoucher(raw: BackendVoucher): VoucherModel {
  return {
    id: raw.id,
    merchantName: raw.merchant_name || '',
    title: raw.title,
    description: raw.description,
    costPoints: Number(raw.cost_points),
  };
}

type BackendRedemption = {
  id: string;
  code: string;
  cost_points: number;
  voucher_title?: string;
  merchant_name?: string;
};

export function normalizeRedemption(raw: BackendRedemption): RedemptionModel {
  return {
    id: raw.id,
    code: raw.code,
    costPoints: Number(raw.cost_points),
    voucherTitle: raw.voucher_title || '',
    merchantName: raw.merchant_name || '',
  };
}

type BackendGovernanceConfig = {
  proposal_vote_fee_mjdq: number;
  feedback_vote_fee_mjdq: number;
  burn_bps: number;
  organizer_bond_mjdq: number;
  quorum_floor: number;
  quorum_percent: number;
  settlement: string;
};

export function normalizeGovernanceConfig(raw: BackendGovernanceConfig): GovernanceConfigModel {
  return {
    proposalVoteFeeMjdq: Number(raw.proposal_vote_fee_mjdq) || 0,
    feedbackVoteFeeMjdq: Number(raw.feedback_vote_fee_mjdq) || 0,
    burnBps: Number(raw.burn_bps) || 0,
    organizerBondMjdq: Number(raw.organizer_bond_mjdq) || 0,
    quorumFloor: Number(raw.quorum_floor) || 0,
    quorumPercent: Number(raw.quorum_percent) || 0,
    settlement: raw.settlement,
  };
}

type BackendWallet = {
  settlement: string;
  unit: string;
  balance_mjdq: number;
  balance_jdq: number;
};

export function normalizeWallet(raw: BackendWallet): WalletModel {
  return {
    settlement: raw.settlement,
    unit: raw.unit,
    balanceMjdq: Number(raw.balance_mjdq) || 0,
    balanceJdq: Number(raw.balance_jdq) || 0,
  };
}

// Fee split derived from the authoritative /proposals/config values.
export function computeVoteFeeSplit(config: Pick<GovernanceConfigModel, 'proposalVoteFeeMjdq' | 'burnBps'>) {
  const fee = config.proposalVoteFeeMjdq;
  const burn = Math.floor((fee * config.burnBps) / 10000);
  return { fee, burn, escrow: fee - burn, feeJdq: fee / 1000 };
}

// Submission payload exactly as the backend schema expects (Phase C repair).
export function buildSubmissionPayload(quest: Pick<QuestModel, 'id' | 'markerCode'>, position: { lat: number; lng: number; accuracy: number }) {
  return {
    idempotency_key: uuid(),
    quest_id: quest.id,
    scanned_marker_code: quest.markerCode || '',
    captured_lat: position.lat,
    captured_lng: position.lng,
    captured_accuracy: position.accuracy,
  };
}

export interface RouteManeuver {
  instruction: string;
  streetName?: string;
  distanceMeters: number;
  timeSeconds: number;
}

export interface RouteModel {
  summary: {
    distanceKm: number;
    durationSeconds: number;
    durationFormatted: string;
    costing: 'auto' | 'pedestrian' | 'bicycle' | 'motorcycle';
    hasCrowdDiversion: boolean;
    engine: 'valhalla' | 'fallback_straight_line';
  };
  coordinates: [number, number][];
  maneuvers: RouteManeuver[];
}

export async function fetchRoute(params: {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  costing?: 'auto' | 'pedestrian' | 'bicycle' | 'motorcycle';
  avoidCongested?: boolean;
}): Promise<RouteModel> {
  const res = await api.post('/routes', {
    start: { lat: params.startLat, lng: params.startLng },
    end: { lat: params.endLat, lng: params.endLng },
    costing: params.costing || 'auto',
    avoid_congested: params.avoidCongested !== false,
  });
  if (!res.data?.success) throw new Error(res.data?.error?.message || 'Failed to calculate route');
  return res.data.data;
}

// ---- Campaign & Pre-Event / Pre-Quest Types & Helpers ----

export interface CampaignModel {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  category: 'eco' | 'cultural' | 'food_trade' | 'sports_adventure';
  locationName: string;
  municipality: string;
  bannerImageUrl: string;
  description: string;
  eventDate: string;
  startDate: string;
  endDate: string;
  totalBudgetMjdq: number;
  rewardPerParticipantMjdq: number;
  referralBountyMjdq: number;
  maxParticipants: number;
  reservedParticipants: number;
  completedParticipants: number;
  preQuestRequirements: string[];
  gpsLat?: number;
  gpsLng?: number;
  gpsRadiusMeters?: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export function normalizeCampaign(raw: any): CampaignModel {
  return {
    id: raw.id,
    hostId: raw.host_id,
    hostName: raw.host_name,
    title: raw.title,
    category: raw.category,
    locationName: raw.location_name,
    municipality: raw.municipality || raw.location_name.split(',')[0].trim(),
    bannerImageUrl: raw.banner_image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
    description: raw.description,
    eventDate: raw.event_date || raw.created_at,
    startDate: raw.start_date || raw.event_date || raw.created_at,
    endDate: raw.end_date || raw.event_date || raw.created_at,
    totalBudgetMjdq: Number(raw.total_budget_mjdq) || 0,
    rewardPerParticipantMjdq: Number(raw.reward_per_participant_mjdq) || 0,
    referralBountyMjdq: Number(raw.referral_bounty_mjdq) || 0,
    maxParticipants: Number(raw.max_participants) || 0,
    reservedParticipants: Number(raw.reserved_participants) || 0,
    completedParticipants: Number(raw.completed_participants) || 0,
    preQuestRequirements: raw.pre_quest_requirements || [],
    gpsLat: raw.gps_lat ? Number(raw.gps_lat) : undefined,
    gpsLng: raw.gps_lng ? Number(raw.gps_lng) : undefined,
    gpsRadiusMeters: raw.gps_radius_meters ? Number(raw.gps_radius_meters) : undefined,
    status: raw.status || 'active',
    createdAt: raw.created_at,
  };
}

export interface CampaignReservationModel {
  id: string;
  campaignId: string;
  userId: string;
  userDisplayName: string;
  referredByUserId?: string | null;
  referredByName?: string | null;
  ticketCode: string;
  status: 'reserved' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string | null;
}

export interface CampaignUserStatusModel {
  isRegistered: boolean;
  isCompleted: boolean;
  ticketCode: string | null;
  reservation?: CampaignReservationModel | null;
}

export interface CampaignReferralStatsModel {
  campaignId: string;
  userId: string;
  referralCode: string;
  referralBountyPerAttendeeMjdq: number;
  totalInvited: number;
  totalAttended: number;
  totalEarnedMjdq: number;
  referredFriends: Array<{
    userName: string;
    status: string;
    reservedAt: string;
    bountyAwarded: boolean;
  }>;
}

export async function fetchCampaigns(): Promise<CampaignModel[]> {
  const res = await api.get('/campaigns');
  if (!res.data?.success) throw new Error(res.data?.error?.message || 'Failed to fetch campaigns');
  return (res.data.data || []).map(normalizeCampaign);
}

export async function fetchCampaignById(id: string): Promise<CampaignModel> {
  const res = await api.get(`/campaigns/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error?.message || 'Campaign not found');
  return normalizeCampaign(res.data.data);
}

export async function fetchMyCampaignStatus(campaignId: string): Promise<CampaignUserStatusModel> {
  const res = await api.get(`/campaigns/${campaignId}/my-status`);
  if (!res.data?.success) throw new Error(res.data?.error?.message || 'Failed to fetch status');
  return {
    isRegistered: res.data.data.is_registered,
    isCompleted: res.data.data.is_completed,
    ticketCode: res.data.data.ticket_code,
    reservation: res.data.data.reservation ? {
      id: res.data.data.reservation.id,
      campaignId: res.data.data.reservation.campaign_id,
      userId: res.data.data.reservation.user_id,
      userDisplayName: res.data.data.reservation.user_display_name,
      referredByUserId: res.data.data.reservation.referred_by_user_id,
      referredByName: res.data.data.reservation.referred_by_name,
      ticketCode: res.data.data.reservation.ticket_code,
      status: res.data.data.reservation.status,
      createdAt: res.data.data.reservation.created_at,
      completedAt: res.data.data.reservation.completed_at,
    } : null,
  };
}

export async function fetchCampaignReferralStats(campaignId: string): Promise<CampaignReferralStatsModel> {
  const res = await api.get(`/campaigns/${campaignId}/referral-stats`);
  if (!res.data?.success) throw new Error(res.data?.error?.message || 'Failed to fetch referral stats');
  const d = res.data.data;
  return {
    campaignId: d.campaign_id,
    userId: d.user_id,
    referralCode: d.referral_code,
    referralBountyPerAttendeeMjdq: d.referral_bounty_per_attendee_mjdq,
    totalInvited: d.total_invited,
    totalAttended: d.total_attended,
    totalEarnedMjdq: d.total_earned_mjdq,
    referredFriends: (d.referred_friends || []).map((r: any) => ({
      userName: r.user_name,
      status: r.status,
      reservedAt: r.reserved_at,
      bountyAwarded: r.bounty_awarded,
    })),
  };
}

export async function reserveCampaignSlot(campaignId: string, ref?: string): Promise<{ ticketCode: string; message?: string; reservation: any }> {
  const res = await api.post(`/campaigns/${campaignId}/reserve`, { ref });
  if (!res.data?.success) throw new Error(res.data?.error?.message || 'Failed to reserve slot');
  return {
    ticketCode: res.data.data.ticket_code,
    message: res.data.data.message,
    reservation: res.data.data.reservation,
  };
}

export async function claimCampaignArrivalReward(campaignId: string, lat?: number, lng?: number): Promise<any> {
  const res = await api.post(`/campaigns/${campaignId}/claim`, { lat, lng });
  if (!res.data?.success) throw new Error(res.data?.error?.message || 'Failed to claim reward');
  return res.data.data;
}
