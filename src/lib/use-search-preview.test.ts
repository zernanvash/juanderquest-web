import { describe, expect, it } from 'vitest';
import { SearchGroup, PlaceResultItem, PersonResultItem, QuestResultItem } from './search';
import { appRoutes } from './routes';
import { travelerProfileHref } from './preview';
import { FlatItem } from '@/components/SearchSuggestionsDropdown';

function flattenSearchGroups(groups: SearchGroup[]): FlatItem[] {
  const list: FlatItem[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (group.type === 'places') {
        const place = item as PlaceResultItem;
        list.push({ groupType: 'places', item: place, href: appRoutes.spot(place.id) });
      } else if (group.type === 'people') {
        const person = item as PersonResultItem;
        list.push({ groupType: 'people', item: person, href: travelerProfileHref(person.id) });
      } else if (group.type === 'quests') {
        const quest = item as QuestResultItem;
        list.push({ groupType: 'quests', item: quest, href: appRoutes.quest(quest.id) });
      }
    }
  }
  return list;
}

function calculateNextIndex(current: number, max: number, direction: 'up' | 'down'): number {
  if (max === 0) return -1;
  if (direction === 'down') {
    return current < max ? current + 1 : 0;
  } else {
    return current > 0 ? current - 1 : max;
  }
}

describe('TopBar Search Keyboard Navigation and Flattening Contract', () => {
  const sampleGroups: SearchGroup[] = [
    {
      type: 'places',
      items: [
        {
          id: 'hundred-islands',
          slug: 'hundred-islands',
          name: 'Hundred Islands',
          municipality: 'Alaminos',
          category: 'nature',
          image_url: '/img/hi.jpg',
        },
      ],
      has_more: true,
      total_matches: 5,
    },
    {
      type: 'people',
      items: [
        {
          id: 'user-juan',
          display_name: 'Juan Dela Cruz',
          handle: 'juan',
          avatar_url: '/img/juan.jpg',
          bio: 'Exploring Pangasinan',
          status_text: 'At Bolinao',
        },
      ],
      has_more: false,
    },
    {
      type: 'quests',
      items: [
        {
          id: 'quest-bolinao',
          title: 'Bolinao Lighthouse Explorer',
          location_name: 'Bolinao',
          category: 'heritage',
          reward_points: 100,
        },
      ],
      has_more: false,
    },
  ];

  it('correctly flattens multi-group search preview items with valid routes', () => {
    const flattened = flattenSearchGroups(sampleGroups);
    expect(flattened.length).toBe(3);

    expect(flattened[0]).toEqual({
      groupType: 'places',
      item: sampleGroups[0].items[0],
      href: '/spots/hundred-islands',
    });

    expect(flattened[1]).toEqual({
      groupType: 'people',
      item: sampleGroups[1].items[0],
      href: '/profile/user-juan',
    });

    expect(flattened[2]).toEqual({
      groupType: 'quests',
      item: sampleGroups[2].items[0],
      href: '/quests/quest-bolinao',
    });
  });

  it('navigates down through items to the "See all results" row and wraps to start', () => {
    const max = 3; // 3 items, so indices 0, 1, 2, and 3 is "See all"
    let index = -1;

    // First ArrowDown from idle:
    index = calculateNextIndex(index, max, 'down');
    expect(index).toBe(0);

    // Second ArrowDown:
    index = calculateNextIndex(index, max, 'down');
    expect(index).toBe(1);

    // Third ArrowDown:
    index = calculateNextIndex(index, max, 'down');
    expect(index).toBe(2);

    // Fourth ArrowDown (onto "See all results" row):
    index = calculateNextIndex(index, max, 'down');
    expect(index).toBe(3);

    // Fifth ArrowDown (wraps to 0):
    index = calculateNextIndex(index, max, 'down');
    expect(index).toBe(0);
  });

  it('navigates up through items and wraps to the "See all results" row', () => {
    const max = 3;
    let index = -1;

    // ArrowUp from idle: wraps to max (the "See all results" row)
    index = calculateNextIndex(index, max, 'up');
    expect(index).toBe(3);

    // ArrowUp again: goes to index 2
    index = calculateNextIndex(index, max, 'up');
    expect(index).toBe(2);

    // ArrowUp again: goes to index 1
    index = calculateNextIndex(index, max, 'up');
    expect(index).toBe(1);

    // ArrowUp again: goes to index 0
    index = calculateNextIndex(index, max, 'up');
    expect(index).toBe(0);

    // ArrowUp from 0: wraps to max (3)
    index = calculateNextIndex(index, max, 'up');
    expect(index).toBe(3);
  });

  it('handles empty results gracefully without infinite loop or NaN', () => {
    expect(calculateNextIndex(-1, 0, 'down')).toBe(-1);
    expect(calculateNextIndex(-1, 0, 'up')).toBe(-1);
  });
});
