export type PreviewStatus = 'off' | 'checking' | 'active' | 'sign_in_required' | 'forbidden' | 'unavailable';

/** Per-provider state. URL/localStorage are intent only, never authorization. */
export class PreviewGate {
  status: PreviewStatus = 'off';
  private generation = 0;
  constructor(private changed: (status: PreviewStatus) => void = () => {}) {}
  private update(status: PreviewStatus) { this.status = status; this.changed(status); }
  disable(status: PreviewStatus = 'off') { this.generation++; this.update(status); }
  async enable(token: string | null, check: () => Promise<boolean>) {
    const generation = ++this.generation;
    if (!token) { this.update('sign_in_required'); return; }
    this.update('checking');
    try {
      const allowed = await check();
      if (generation === this.generation) this.update(allowed ? 'active' : 'forbidden');
    } catch (error) {
      if (generation !== this.generation) return;
      const status = (error as { response?: { status?: number } }).response?.status;
      this.update(status === 401 ? 'sign_in_required' : status === 403 ? 'forbidden' : 'unavailable');
    }
  }
}

// Browser-only ephemeral authorization; never stored/shared by server rendering.
let authorizedToken: string | null = null;
let scopeGeneration = 0;
export function setPreviewAuthorization(token: string | null) {
  if (typeof window === 'undefined') return;
  authorizedToken = token;
  scopeGeneration++;
}
export function previewGeneration() { return typeof window === 'undefined' ? 0 : scopeGeneration; }
export function storedToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('jdq_token') || sessionStorage.getItem('jdq_token'); } catch { return null; }
}
export function previewEnabled() {
  return typeof window !== 'undefined' && Boolean(authorizedToken && authorizedToken === storedToken());
}
export function previewRequestHeaders(): Record<string, string> {
  if (!previewEnabled()) return {};
  return { Authorization: `Bearer ${authorizedToken}`, 'x-include-test': 'true' };
}
export function travelerProfileHref(id: string) {
  return `${previewEnabled() ? '/preview/users/' : '/users/'}${encodeURIComponent(id)}`;
}
