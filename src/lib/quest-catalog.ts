import { fetchQuests, type QuestModel } from '@/lib/api';
import { fetchWithCache } from '@/lib/cache';

export const QUEST_CATALOG_CACHE_KEY = 'quests_feed';

export async function fetchQuestCatalog(forceRefresh = false): Promise<QuestModel[]> {
  const { data } = await fetchWithCache(
    QUEST_CATALOG_CACHE_KEY,
    fetchQuests,
    { ttlMs: 120_000, forceRefresh }
  );
  return data;
}
