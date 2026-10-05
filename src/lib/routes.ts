/** Canonical, same-origin paths for shareable JuanDerQuest resources. */
const segment = (value: string): string => encodeURIComponent(value);

export const appRoutes = {
  spot: (id: string) => `/spots/${segment(id)}`,
  quest: (id: string) => `/quests/${segment(id)}`,
  user: (id: string) => `/profile/${segment(id)}`,
  campaign: (id: string) => `/campaigns/${segment(id)}`,
  choice: (id: string) => `/choice/${segment(id)}`,
  choiceCandidate: (id: string, candidateId: string) =>
    `/choice/${segment(id)}/candidates/${segment(candidateId)}`,
} as const;

/** Validate a single existing public identifier before it reaches an API or redirect. */
export function isResourceId(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,179}$/.test(value);
}

/** Login returns may only navigate to internal application paths. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const parsed = new URL(value, 'https://juanderquest.app');
    if (parsed.origin !== 'https://juanderquest.app' || parsed.pathname === '/login' || parsed.pathname.startsWith('/login/')) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
