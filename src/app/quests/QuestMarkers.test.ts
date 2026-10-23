import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Quest marker assets regression tests', () => {
  // __dirname is src/app/quests -> go up three levels to web_app root
  const publicMarkersDir = path.resolve(__dirname, '../../../public/markers');

  const requiredMarkers = [
    'bolinao_lighthouse.png',
    'dagupan_bangus.png',
    'hundred_islands.png',
    'lingayen.png',
    'manaoag.png',
    'qa_tambobong.png',
    'mkr-cultural-heritage.png',
    'mkr-nature-eco.png',
    'mkr-beach-islands.png',
    'mkr-culinary.png',
    'mkr-adventure.png',
    'mkr-pilgrimage.png',
  ];

  it('contains all required static marker assets in public/markers/', () => {
    expect(fs.existsSync(publicMarkersDir)).toBe(true);

    for (const marker of requiredMarkers) {
      const markerPath = path.join(publicMarkersDir, marker);
      expect(fs.existsSync(markerPath), `Missing marker asset: ${marker}`).toBe(true);
      const stat = fs.statSync(markerPath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });
});
