import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COPY, formatPoints, formatXp } from './copy';

describe('Canonical Glossary and Copy Formatting (§4.1)', () => {
  it('formats spendable points correctly with formatPoints()', () => {
    expect(formatPoints(100)).toBe('100 pts');
    expect(formatPoints(100, { signed: true })).toBe('+100 pts');
    expect(formatPoints(1, { full: true })).toBe('1 point');
    expect(formatPoints(50, { full: true })).toBe('50 points');
    expect(formatPoints(0)).toBe('0 pts');
  });

  it('formats progression XP correctly with formatXp()', () => {
    expect(formatXp(120)).toBe('120 XP');
    expect(formatXp(50, { signed: true })).toBe('+50 XP');
    expect(formatXp(50, { label: true })).toBe('50 Explorer XP');
  });

  it('exposes expected COPY constants', () => {
    expect(COPY.points.short).toBe('pts');
    expect(COPY.points.plural).toBe('points');
    expect(COPY.xp.short).toBe('XP');
    expect(COPY.quest.singular).toBe('Eco-Quest');
    expect(COPY.quest.plural).toBe('Eco-Quests');
    expect(COPY.quest.playCta).toBe('Play Eco-Quest');
    expect(COPY.quest.viewCta).toBe('View Eco-Quest');
  });
});

describe('Forbidden Terms Audit on Traveler-Facing Pages (§4.1)', () => {
  const FORBIDDEN_PATTERNS = [
    /\$mJDQ/i,
    /mJDQ\s+balance/i,
    /Soulbound\s+NFT/i,
    /ERC-5192/i,
    /Explore\s+Trailhead/i,
  ];

  // Specific traveler-facing routes and components that must not contain Web3 jargon
  const TRAVELER_FILES = [
    'src/app/spots/[slug]/SpotDetailClient.tsx',
    'src/app/quests/page.tsx',
    'src/components/QuestDetailClient.tsx',
    'src/app/explore/page.tsx',
    'src/app/search/page.tsx',
    'src/app/shop/page.tsx',
    'src/components/JuanChoiceExperience.tsx',
    'src/app/profile/[username]/UnifiedProfileClient.tsx',
  ];

  for (const relativePath of TRAVELER_FILES) {
    it(`ensures ${relativePath} does not use forbidden tokenomics jargon`, () => {
      const fullPath = path.resolve(process.cwd(), relativePath);
      if (!fs.existsSync(fullPath)) return;
      const content = fs.readFileSync(fullPath, 'utf8');

      for (const pattern of FORBIDDEN_PATTERNS) {
        const match = content.match(pattern);
        expect(
          match,
          `Found forbidden term "${match?.[0]}" in traveler-facing file ${relativePath}. Use copy.ts canonical terms instead.`
        ).toBeNull();
      }
    });
  }
});
