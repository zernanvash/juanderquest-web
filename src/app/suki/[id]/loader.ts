import { cache } from 'react';
import { isResourceId } from '@/lib/routes';
import { getServerApiBaseUrl } from '@/lib/search';

export interface PublicSukiProgram {
  id: string;
  title: string;
  reward_text: string;
  reward_tag: string;
  visits_required: number;
  mode: 'standee' | 'staff_scan';
  merchant: { id: string; name: string; municipality: string | null; logo_url: string | null };
}

export const loadSukiProgram = cache(async (id: string): Promise<PublicSukiProgram | null> => {
  if (!isResourceId(id)) return null;
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/suki/programs/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const program = body?.data?.program as PublicSukiProgram | undefined;
    return body?.success && program?.id ? program : null;
  } catch {
    return null;
  }
});
