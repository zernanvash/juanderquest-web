import type { SpotModel, QuestModel } from './api';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface DeclutterItem<T extends SpotModel | QuestModel = SpotModel | QuestModel> {
  type: 'spot' | 'quest';
  data: T;
  priority: number;
  showLabel: boolean;
  screenPoint?: ScreenPoint;
}

export interface DeclutterThreshold {
  minDistanceX: number;
  minDistanceY: number;
  showLabelsByDefault: boolean;
  maxItemsPerScreen: number;
}

/**
 * Returns the minimum screen distance threshold (in pixels) for a given zoom level.
 * Higher thresholds at lower zoom levels guarantee a calm, spacious view without overlap.
 */
export function getDeclutterThreshold(zoom: number): DeclutterThreshold {
  if (zoom <= 9) {
    return { minDistanceX: 180, minDistanceY: 130, showLabelsByDefault: false, maxItemsPerScreen: 6 };
  }
  if (zoom === 10) {
    return { minDistanceX: 140, minDistanceY: 100, showLabelsByDefault: false, maxItemsPerScreen: 10 };
  }
  if (zoom === 11) {
    return { minDistanceX: 105, minDistanceY: 80, showLabelsByDefault: true, maxItemsPerScreen: 16 };
  }
  if (zoom === 12) {
    return { minDistanceX: 80, minDistanceY: 60, showLabelsByDefault: true, maxItemsPerScreen: 25 };
  }
  if (zoom === 13) {
    return { minDistanceX: 55, minDistanceY: 45, showLabelsByDefault: true, maxItemsPerScreen: 40 };
  }
  // zoom >= 14: local street/district zoom with maximum space
  return { minDistanceX: 35, minDistanceY: 30, showLabelsByDefault: true, maxItemsPerScreen: 100 };
}

/**
 * Computes deterministic priority score for a destination.
 * Selected items, saved places, and iconic provincial landmarks receive top priority.
 */
export function calculateItemPriority(
  item: SpotModel | QuestModel,
  type: 'spot' | 'quest',
  isSelected: boolean,
  isSaved: boolean
): number {
  if (isSelected) return 1_000_000;
  if (isSaved) return 500_000;

  if (type === 'quest') {
    const quest = item as QuestModel;
    return 10_000 + (quest.rewardPoints || 100);
  }

  const spot = item as SpotModel;
  let score = 5_000;

  // Curated prominent landmarks in Pangasinan
  const iconicLandmarkSlugs: Record<string, number> = {
    'hundred-islands-national-park': 20_000,
    'patar-white-beach': 18_000,
    'minor-basilica-of-manaoag': 18_000,
    'cape-bolinao-lighthouse': 16_000,
    'bolinao-falls-1': 15_000,
    'lingayen-baywalk': 14_000,
    'dagupan-bangus-market': 13_000,
  };

  if (spot.slug && iconicLandmarkSlugs[spot.slug]) {
    score += iconicLandmarkSlugs[spot.slug];
  }

  if (spot.trendScore) {
    score += spot.trendScore * 10;
  }
  if (spot.recommendationScore) {
    score += spot.recommendationScore * 50;
  }
  if (spot.photos && spot.photos.length > 0) {
    score += 500;
  }
  if (spot.imageUrl) {
    score += 200;
  }

  return score;
}

/**
 * Smart screen-space collision filter that filters out overlapping pins
 * and only retains spacious, legible items at the current zoom level.
 */
export function declutterItems<T extends (SpotModel | QuestModel)>(
  items: Array<{ type: 'spot' | 'quest'; data: T }>,
  zoom: number,
  toScreenPoint: (lat: number, lng: number) => ScreenPoint,
  isInViewport: (lat: number, lng: number) => boolean,
  selectedId?: string,
  isSavedFn?: (kind: 'spots' | 'quests', id: string) => boolean
): Array<DeclutterItem<T>> {
  if (items.length === 0) return [];

  const threshold = getDeclutterThreshold(zoom);

  // 1. Filter items to only visible viewport (plus selected item if offscreen)
  const candidateItems = items.filter(({ type, data }) => {
    if (selectedId && data.id === selectedId) return true;
    return isInViewport(data.gpsLat, data.gpsLng);
  });

  // 2. Score and sort by priority descending
  const scoredItems = candidateItems.map(({ type, data }) => {
    const isSelected = Boolean(selectedId && data.id === selectedId);
    const isSaved = Boolean(isSavedFn && isSavedFn(type === 'spot' ? 'spots' : 'quests', data.id));
    const priority = calculateItemPriority(data, type, isSelected, isSaved);
    const screenPoint = toScreenPoint(data.gpsLat, data.gpsLng);

    return {
      type,
      data,
      priority,
      isSelected,
      screenPoint,
      showLabel: threshold.showLabelsByDefault || isSelected,
    };
  });

  scoredItems.sort((a, b) => b.priority - a.priority);

  // 3. Collision elimination in screen coordinates
  const placedItems: Array<DeclutterItem<T>> = [];

  for (const candidate of scoredItems) {
    // Respect max items cap for zoom level to avoid visual clutter
    if (placedItems.length >= threshold.maxItemsPerScreen && !candidate.isSelected) {
      continue;
    }

    // Selected item is always placed
    if (candidate.isSelected) {
      placedItems.push({
        type: candidate.type,
        data: candidate.data,
        priority: candidate.priority,
        showLabel: true,
        screenPoint: candidate.screenPoint,
      });
      continue;
    }

    // Check collision against all already-placed items
    let collides = false;
    for (const placed of placedItems) {
      if (!placed.screenPoint || !candidate.screenPoint) continue;

      const dx = Math.abs(candidate.screenPoint.x - placed.screenPoint.x);
      const dy = Math.abs(candidate.screenPoint.y - placed.screenPoint.y);

      if (dx < threshold.minDistanceX && dy < threshold.minDistanceY) {
        collides = true;
        break;
      }
    }

    if (!collides) {
      // Top 3 landmarks at lower zooms can also show their label
      const showLabel = candidate.showLabel || (zoom >= 10 && placedItems.length < 3);

      placedItems.push({
        type: candidate.type,
        data: candidate.data,
        priority: candidate.priority,
        showLabel,
        screenPoint: candidate.screenPoint,
      });
    }
  }

  return placedItems;
}
