import { describe, expect, it } from 'vitest';
import { KNOWN_AREAS } from './areas';
import { mergeSavedMunicipalityStamps } from './gamification';

describe('mergeSavedMunicipalityStamps', () => {
  it('adds all Pangasinan cities and municipalities to older saved collections', () => {
    const merged = mergeSavedMunicipalityStamps([
      {
        id: 'alaminos',
        name: 'Alaminos City',
        province: 'Pangasinan',
        title: 'Hundred Islands Marine Sanctuary',
        tag: 'Island Hopping',
        icon: '🏝️',
        color: '#2A9D8F',
        description: 'Collected stamp',
        unlocked: true,
        unlockedAt: 'Oct 14, 2026',
      },
    ]);

    const pangasinanAreas = KNOWN_AREAS.filter(
      (area) => area.type === 'city' || area.type === 'municipality'
    );
    const alaminosStamp = merged.find((stamp) => stamp.id === 'alaminos');

    expect(merged).toHaveLength(pangasinanAreas.length);
    expect(alaminosStamp?.unlocked).toBe(true);
    expect(alaminosStamp?.unlockedAt).toBe('Oct 14, 2026');
    expect(merged.find((stamp) => stamp.id === 'dagupan')?.unlocked).toBe(false);
  });

  it('assigns a distinct icon to every Pangasinan city and municipality', () => {
    const stamps = mergeSavedMunicipalityStamps(
      KNOWN_AREAS
        .filter((area) => area.type === 'city' || area.type === 'municipality')
        .map((area) => ({
          id: area.id,
          name: area.name,
          province: 'Pangasinan',
          title: area.name,
          tag: area.type,
          icon: '📍',
          color: '#D8B36A',
          description: area.subtitle,
          unlocked: false,
        }))
    );

    expect(stamps).toHaveLength(48);
    expect(new Set(stamps.map((stamp) => stamp.icon)).size).toBe(stamps.length);
  });

  it('preserves collected stamps that are not in the current catalog', () => {
    const legacyStamp = {
      id: 'legacy-place',
      name: 'Legacy Place',
      province: 'Pangasinan',
      title: 'Legacy Landmark',
      tag: 'Legacy',
      icon: '⭐',
      color: '#FFFFFF',
      description: 'Previously saved stamp',
      unlocked: true,
      unlockedAt: 'Earlier',
    };

    expect(mergeSavedMunicipalityStamps([legacyStamp])).toContainEqual(legacyStamp);
  });
});
