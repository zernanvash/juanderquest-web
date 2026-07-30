import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://jdq.zernanvash.dev/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jdq_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface UserModel {
  id: String;
  email: String;
  displayName: String;
  role: String;
  points: number;
  avatarUrl: String;
}

export interface WalletModel {
  settlement: String;
  unit: String;
  balance_mjdq: number;
  balance_jdq: number;
}

export interface QuestModel {
  id: String;
  title: String;
  description: String;
  category: String;
  target_lat: number;
  target_lng: number;
  radius_meters: number;
  reward_points: number;
  target_marker_id: String;
  image_url?: String;
}

export interface ProposalModel {
  id: String;
  title: String;
  location_name: String;
  category: String;
  description: String;
  status: String;
  submitted_by_id: String;
  submitted_by_name?: String;
  yes_votes: number;
  no_votes: number;
  yes_weight_mjdq: number;
  no_weight_mjdq: number;
  total_voters: number;
  bond_mjdq: number;
  escrowed_mjdq: number;
}

export interface SubmissionModel {
  id: String;
  quest_id: String;
  quest_title?: String;
  user_id: String;
  user_display_name?: String;
  status: 'pending' | 'approved' | 'rejected';
  captured_lat: number;
  captured_lng: number;
  proof_type: String;
  image_url?: String;
  rejection_reason?: String;
  created_at: String;
}
