import type { Metadata } from 'next';
import { getServerApiBaseUrl } from './search';
import type { JuanChoiceDetail } from './juanchoice';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function publicJuanChoiceMetadata(campaignId: string, candidateId?: string): Promise<Metadata> {
  const path = candidateId
    ? `/choice/${encodeURIComponent(campaignId)}/candidates/${encodeURIComponent(candidateId)}`
    : `/choice/${encodeURIComponent(campaignId)}`;
  const fallback: Metadata = {
    title: 'JuanChoice community round',
    description: 'Explore a Pangasinan community spotlight round on JuanDerQuest.',
    alternates: { canonical: path },
    robots: { index: false, follow: false },
  };
  if (!uuidPattern.test(campaignId) || (candidateId && !uuidPattern.test(candidateId))) return fallback;

  try {
    // No viewer credentials or evaluator-preview headers: QA/private rounds cannot become public metadata.
    const response = await fetch(`${getServerApiBaseUrl()}/juanchoice/campaigns/${campaignId}`, {
      cache: 'no-store', signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as { success?: boolean; data?: JuanChoiceDetail };
    const detail = payload.success ? payload.data : undefined;
    if (!detail?.campaign || detail.campaign.id !== campaignId) return fallback;
    const candidate = candidateId ? detail.standings.find(item => item.candidate_id === candidateId) : undefined;
    if (candidateId && !candidate) return fallback;

    const title = candidate
      ? `${candidate.spot_name ?? 'Destination'} in ${detail.campaign.theme} | JuanChoice`
      : `${detail.campaign.theme} | JuanChoice`;
    const description = candidate
      ? `Discover ${candidate.spot_name ?? 'this destination'} in the ${detail.campaign.theme} community spotlight round. Every voter earns equal Civic XP and one stamp.`
      : `Explore ${detail.campaign.theme}, a free Pangasinan community spotlight round. Every voter earns equal Civic XP and one stamp.`;
    return {
      title, description, alternates: { canonical: path },
      openGraph: { title, description, url: path, images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'JuanDerQuest community spotlight' }] },
      twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image'] },
    };
  } catch {
    return fallback;
  }
}
