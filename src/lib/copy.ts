/**
 * Canonical Traveler Glossary & Copy Helpers
 *
 * Single source of truth for traveler-facing nouns across JuanDerQuest Web.
 * See docs/03-ui-ux/2026-10-17-web-ui-ux-improvement-plan.md (§4.1).
 */

export const COPY = {
  points: {
    singular: 'point',
    plural: 'points',
    short: 'pts',
    label: 'Points',
    balanceLabel: 'Available points',
  },
  xp: {
    short: 'XP',
    label: 'Explorer XP',
    level: 'Explorer level',
    unit: 'XP',
  },
  badge: {
    singular: 'badge',
    plural: 'badges',
    label: 'Badges',
    titlePlural: 'Badges',
  },
  quest: {
    singular: 'Eco-Quest',
    plural: 'Eco-Quests',
    titlePlural: 'Eco-Quests',
    playCta: 'Play Eco-Quest',
    viewCta: 'View Eco-Quest',
    completedLabel: 'Eco-Quests completed',
  },
  streak: {
    label: 'Streak',
  },
  destinations: {
    label: 'Destinations',
  },
} as const;

/**
 * Formats a spendable point amount with the canonical short or full unit.
 * Examples:
 *   formatPoints(100) -> "100 pts"
 *   formatPoints(100, { signed: true }) -> "+100 pts"
 *   formatPoints(1, { full: true }) -> "1 point"
 */
export function formatPoints(
  amount: number,
  options?: { signed?: boolean; full?: boolean },
): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const prefix = options?.signed && safe > 0 ? '+' : '';
  const formatted = safe.toLocaleString();
  if (options?.full) {
    const unit = Math.abs(safe) === 1 ? COPY.points.singular : COPY.points.plural;
    return `${prefix}${formatted} ${unit}`;
  }
  return `${prefix}${formatted} ${COPY.points.short}`;
}

/**
 * Formats an Explorer XP amount.
 * Examples:
 *   formatXp(250) -> "250 XP"
 *   formatXp(250, { signed: true }) -> "+250 XP"
 */
export function formatXp(
  amount: number,
  options?: { signed?: boolean; label?: boolean },
): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const prefix = options?.signed && safe > 0 ? '+' : '';
  const unit = options?.label ? COPY.xp.label : COPY.xp.short;
  return `${prefix}${safe.toLocaleString()} ${unit}`;
}
