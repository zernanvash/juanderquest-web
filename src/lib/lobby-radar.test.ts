import { describe, expect, it } from 'vitest';
import type { QuestModel, SpotModel } from './api';
import { crowdPulse, formatDistance, readRadar } from './lobby-radar';

const spot = (id: string, lat: number, lng: number, crowdStatus: SpotModel['crowdStatus'] = 'unknown') =>
  ({ id, name: id, municipality: 'Lingayen', gpsLat: lat, gpsLng: lng, crowdStatus } as SpotModel);
const quest = (id: string, lat: number, lng: number, rewardPoints: number) =>
  ({ id, gpsLat: lat, gpsLng: lng, rewardPoints } as QuestModel);

describe('readRadar', () => {
  it('finds the nearest place, quests within 5 km and their rewards', () => {
    const here = { lat: 16.0294, lng: 120.2289 };
    const reading = readRadar(here,
      [spot('far', 16.2, 120.5), spot('near', 16.03, 120.229, 'quiet'), spot('nowhere', 0, 0)],
      [quest('q1', 16.03, 120.23, 40), quest('q2', 16.3, 120.6, 99), quest('q3', 16.04, 120.24, 10)]);
    expect(reading.nearest?.spot.id).toBe('near');
    expect(reading.nearest!.meters).toBeLessThan(100);
    expect(reading.spotsNearby.map((s) => s.id)).toEqual(['near']);
    expect([reading.questsNearby, reading.rewardNearby]).toEqual([2, 50]);
    expect(reading.crowd).toBe('quiet');
  });

  it('summarizes the estimated crowd without hiding busy places', () => {
    expect(crowdPulse([])).toBe('none');
    expect(crowdPulse([{ crowdStatus: 'unknown' }])).toBe('unknown');
    expect(crowdPulse([{ crowdStatus: 'quiet' }, { crowdStatus: 'quiet' }, { crowdStatus: 'moderate' }])).toBe('quiet');
    expect(crowdPulse([{ crowdStatus: 'quiet' }, { crowdStatus: 'estimated_busy' }])).toBe('busy');
  });

  it('formats distances', () => {
    expect(formatDistance(84)).toBe('80 m');
    expect(formatDistance(1530)).toBe('1.5 km');
    expect(formatDistance(14_200)).toBe('14 km');
  });
});
