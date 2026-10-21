/**
 * Plan 43 Quest Builder task type definitions (mirrored from backend single-source-of-truth)
 */

export type VerificationMethod = 'location' | 'qr' | 'photo' | 'ar' | 'action';

export interface GeoFence {
  lat: number;
  lng: number;
  radius_meters: number;
}

export interface LocationCfg {
  type: 'location';
  fence: GeoFence;
}

export interface QrCfg {
  type: 'qr';
  fence: GeoFence;
  marker_code?: string;
}

export interface PhotoCfg {
  type: 'photo';
  prompt: string;
  fence: GeoFence | null;
  require_gps: boolean;
}

export interface ArCfg {
  type: 'ar';
  fence: GeoFence;
  object: 'token' | 'gem' | 'beacon' | 'box';
  color: '#FFB703' | '#2D6A4F' | '#3B82F6' | '#E11D48';
}

export type InAppTask =
  | { kind: 'complete_quiz'; quiz_id: string }
  | { kind: 'save_spot'; spot_id: string }
  | { kind: 'like_spot'; spot_id: string }
  | { kind: 'vote_juanchoice'; campaign_id?: string };

export interface ActionCfg {
  type: 'action';
  task: InAppTask;
}

export type TaskVerification = LocationCfg | QrCfg | PhotoCfg | ArCfg | ActionCfg;

export interface BuilderTask {
  key: string;
  step_order: number;
  title: string;
  description: string;
  required: boolean;
  checkpoint_type: VerificationMethod;
  verification: TaskVerification;
}

export interface QuestBuilderState {
  title: string;
  description: string;
  category: string;
  reward_points: 50 | 75 | 100;
  step_order_mode: 'sequential' | 'any';
  status: 'draft' | 'published';
  tasks: BuilderTask[];
  version: number;
}
