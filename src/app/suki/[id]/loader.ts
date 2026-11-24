import { cache } from 'react';
import { isResourceId } from '@/lib/routes';
import { getServerApiBaseUrl } from '@/lib/search';

export interface PublicSukiTier {
  visit_number: number;
  reward_text: string;
  reward_tag: string;
  icon_key?: string;
}

export interface PublicSukiPointsConfig {
  enabled: boolean;
  per_visit: number;
  pesos_per_point?: number | null;
}

export interface PublicSukiPointsMenuItem {
  id: string;
  title: string;
  points_cost: number;
  icon_key?: string;
}

export interface PublicSukiProgram {
  id: string;
  title: string;
  reward_text: string;
  reward_tag: string;
  visits_required: number;
  mode: 'standee' | 'staff_scan';
  status?: 'active' | 'paused';
  skin_key?: string;
  tiers?: PublicSukiTier[];
  points?: PublicSukiPointsConfig;
  merchant: { id: string; name: string; municipality: string | null; logo_url: string | null };
}

/** `disabled`: Suki Cards are switched off (503 SUKI_DISABLED); `missing`: no such card, or the API failed. */
export type SukiLoadResult =
  | { kind: 'found'; program: PublicSukiProgram; pointsMenu: PublicSukiPointsMenuItem[] }
  | { kind: 'disabled' }
  | { kind: 'missing' };

export const loadSukiProgram = cache(async (id: string): Promise<SukiLoadResult> => {
  if (!isResourceId(id)) return { kind: 'missing' };
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/suki/programs/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    const body = await response.json().catch(() => null);
    if (response.status === 503 && body?.error?.code === 'SUKI_DISABLED') return { kind: 'disabled' };
    if (!response.ok) return { kind: 'missing' };
    const program = body?.data?.program as PublicSukiProgram | undefined;
    const pointsMenu = Array.isArray(body?.data?.points_menu)
      ? (body.data.points_menu as PublicSukiPointsMenuItem[])
      : [];
    return body?.success && program?.id ? { kind: 'found', program, pointsMenu } : { kind: 'missing' };
  } catch {
    return { kind: 'missing' };
  }
});

/** Only http(s) logos are shown; anything else is dropped. */
export function safeLogoUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}
