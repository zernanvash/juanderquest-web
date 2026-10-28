import { api } from '@/lib/api';

export interface LatLng { lat: number; lng: number }

export interface DetourArea {
  municipality: string;
  detour_km: number;
  extra_minutes: number;
  score: number;
  center: LatLng;
  spot_count: number;
  highlights: { spot_id: string; name: string; category: string }[];
}

export interface TripPlan {
  baseline_route: {
    degraded: boolean;
    navigationMode: 'turn_by_turn' | 'straight_line_estimate';
    warning?: { code: string; message: string };
    summary: { distanceKm: number; durationSeconds: number; durationFormatted: string };
    /** [lat, lng] pairs. */
    coordinates: [number, number][];
  };
  detour_areas: DetourArea[];
}

export async function planTrip(start: LatLng, end: LatLng, via: LatLng[] = []): Promise<TripPlan> {
  const res = await api.post('/trail/plan', { start, end, ...(via.length ? { via } : {}) });
  if (!res.data?.success) throw new Error(res.data?.error?.message || 'Could not plan this trip.');
  return res.data.data as TripPlan;
}

/** "From where?" choices besides the traveler's location: major cities travelers set out from. */
export const TRIP_ORIGINS: { name: string; lat: number; lng: number }[] = [
  { name: 'Manila', lat: 14.5995, lng: 120.9842 },
  { name: 'Quezon City', lat: 14.676, lng: 121.0437 },
  { name: 'Makati', lat: 14.5547, lng: 121.0244 },
  { name: 'Pasay (NAIA)', lat: 14.5086, lng: 121.0194 },
  { name: 'Clark / Angeles', lat: 15.145, lng: 120.5887 },
  { name: 'San Fernando, Pampanga', lat: 15.0286, lng: 120.6898 },
  { name: 'Tarlac City', lat: 15.4755, lng: 120.5963 },
  { name: 'Cabanatuan', lat: 15.4869, lng: 120.9675 },
  { name: 'Olongapo', lat: 14.8292, lng: 120.2828 },
  { name: 'Baguio', lat: 16.4023, lng: 120.596 },
  { name: 'San Fernando, La Union', lat: 16.6159, lng: 120.3166 },
  { name: 'Vigan', lat: 17.5747, lng: 120.3869 },
  { name: 'Laoag', lat: 18.1978, lng: 120.5936 },
  { name: 'Dagupan City', lat: 16.0433, lng: 120.3333 },
  { name: 'Lingayen', lat: 16.0218, lng: 120.2319 },
  { name: 'Urdaneta', lat: 15.9761, lng: 120.5711 },
  { name: 'Alaminos', lat: 16.1557, lng: 119.9807 },
  { name: 'San Carlos, Pangasinan', lat: 15.9282, lng: 120.3485 },
  { name: 'Antipolo', lat: 14.6255, lng: 121.1245 },
  { name: 'Batangas City', lat: 13.7565, lng: 121.0583 },
];

export const formatMinutes = (minutes: number): string => {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
};
