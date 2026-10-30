import type { QuestModel, SpotModel } from './api';
import { calculateHaversineMeters } from './reverse-geocode';

/** Plan 71: what the dashboard radar says about the traveler's surroundings (pure, for tests). */
export const RADAR_RADIUS_M = 5000;
export const CHECK_IN_RADIUS_M = 100;

export type CrowdPulse = 'quiet' | 'moderate' | 'busy' | 'unknown' | 'none';

export interface RadarReading {
  nearest: { spot: SpotModel; meters: number } | null;
  spotsNearby: SpotModel[];
  questsNearby: number;
  rewardNearby: number;
  crowd: CrowdPulse;
}

const hasCoords = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

export function readRadar(
  position: { lat: number; lng: number },
  spots: SpotModel[],
  quests: QuestModel[],
): RadarReading {
  let nearest: RadarReading['nearest'] = null;
  const spotsNearby: SpotModel[] = [];
  for (const spot of spots) {
    if (!hasCoords(spot.gpsLat, spot.gpsLng)) continue;
    const meters = calculateHaversineMeters(position.lat, position.lng, spot.gpsLat, spot.gpsLng);
    if (!nearest || meters < nearest.meters) nearest = { spot, meters };
    if (meters <= RADAR_RADIUS_M) spotsNearby.push(spot);
  }

  let questsNearby = 0;
  let rewardNearby = 0;
  for (const quest of quests) {
    if (!hasCoords(quest.gpsLat, quest.gpsLng)) continue;
    if (calculateHaversineMeters(position.lat, position.lng, quest.gpsLat, quest.gpsLng) > RADAR_RADIUS_M) continue;
    questsNearby += 1;
    rewardNearby += Number(quest.rewardPoints) || 0;
  }

  return { nearest, spotsNearby, questsNearby, rewardNearby, crowd: crowdPulse(spotsNearby) };
}

/** The most common estimated crowd level among nearby places; busy wins ties so it is never hidden. */
export function crowdPulse(spots: Pick<SpotModel, 'crowdStatus'>[]): CrowdPulse {
  if (spots.length === 0) return 'none';
  const counts = { quiet: 0, moderate: 0, busy: 0 };
  for (const spot of spots) {
    if (spot.crowdStatus === 'quiet') counts.quiet += 1;
    else if (spot.crowdStatus === 'moderate') counts.moderate += 1;
    else if (spot.crowdStatus === 'estimated_busy') counts.busy += 1;
  }
  const top = Math.max(counts.quiet, counts.moderate, counts.busy);
  if (top === 0) return 'unknown';
  if (counts.busy === top) return 'busy';
  if (counts.moderate === top) return 'moderate';
  return 'quiet';
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.max(1, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}
