import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://jdq.zernanvash.dev/api/v1';
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
