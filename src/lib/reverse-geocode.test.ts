import { describe, it, expect } from 'vitest';
import {
  mapNominatimReverse,
  formatBarangayName,
  getNearestAreaFallback,
  type NominatimReverseResponse,
} from './reverse-geocode';

describe('reverse-geocode pure mapping library', () => {
  it('correctly formats barangay names with prefix or preserves existing prefixes', () => {
    expect(formatBarangayName('Bued')).toBe('Barangay Bued');
    expect(formatBarangayName('Brgy. Lucap')).toBe('Brgy. Lucap');
    expect(formatBarangayName('Barangay Poblacion')).toBe('Barangay Poblacion');
    expect(formatBarangayName('Poblacion')).toBe('Poblacion');
    expect(formatBarangayName('')).toBeUndefined();
    expect(formatBarangayName(undefined)).toBeUndefined();
  });

  it('maps town, village, road and province for Pangasinan rural spot', () => {
    const fixture: NominatimReverseResponse = {
      place_id: 12345,
      lat: '16.1523',
      lon: '119.9821',
      name: 'Bued Mangrove Park',
      category: 'tourism',
      type: 'attraction',
      display_name: 'Bued Mangrove Park, Lucap Road, Bued, Alaminos City, Pangasinan, Philippines',
      address: {
        road: 'Lucap Road',
        village: 'Bued',
        city: 'Alaminos City',
        state: 'Pangasinan',
        country: 'Philippines',
      },
    };

    const result = mapNominatimReverse(fixture, 16.1523, 119.9821);
    expect(result.municipality).toBe('Alaminos City');
    expect(result.barangay).toBe('Barangay Bued');
    expect(result.province).toBe('Pangasinan');
    expect(result.placeName).toBe('Bued Mangrove Park');
    expect(result.outsidePangasinan).toBe(false);
    expect(result.address).toContain('Lucap Road');
    expect(result.address).toContain('Barangay Bued');
    expect(result.address).toContain('Alaminos City');
    expect(result.address).toContain('Near Bued Mangrove Park');
  });

  it('maps city and suburb when village is absent', () => {
    const fixture: NominatimReverseResponse = {
      display_name: 'Pangasinan Provincial Capitol, Lingayen, Pangasinan',
      address: {
        municipality: 'Lingayen',
        suburb: 'Poblacion',
        state: 'Pangasinan',
      },
    };

    const result = mapNominatimReverse(fixture, 16.02, 120.23);
    expect(result.municipality).toBe('Lingayen');
    expect(result.barangay).toBe('Poblacion');
    expect(result.outsidePangasinan).toBe(false);
  });

  it('flags outsidePangasinan when coordinates/state indicate another province', () => {
    const fixture: NominatimReverseResponse = {
      display_name: 'San Fernando, La Union, Philippines',
      address: {
        city: 'San Fernando',
        state: 'La Union',
        country: 'Philippines',
      },
    };

    const result = mapNominatimReverse(fixture, 16.61, 120.31);
    expect(result.municipality).toBe('San Fernando');
    expect(result.province).toBe('La Union');
    expect(result.outsidePangasinan).toBe(true);
  });

  it('falls back to nearest known LGU when reverse geocoding returns empty address', () => {
    const emptyFixture: NominatimReverseResponse = {
      display_name: '',
      address: {},
    };

    // Coordinates near Cape Bolinao
    const result = mapNominatimReverse(emptyFixture, 16.38, 119.78);
    expect(result.municipality).toBe('Bolinao');
    expect(result.province).toBe('Pangasinan');
    expect(result.address).toContain('Bolinao');
  });

  it('getNearestAreaFallback finds closest town correctly', () => {
    // Coordinates near Alaminos City center
    const fallback = getNearestAreaFallback(16.155, 119.98);
    expect(fallback.municipality).toBe('Alaminos City');
  });
});
