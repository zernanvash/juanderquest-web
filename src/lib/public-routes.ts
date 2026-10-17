/**
 * Exact paths and path prefixes that may be browsed without a signed-in session.
 *
 * Protected routes (require login):
 * - /quests/create
 * - /quests/:id/play
 * - /profile (exact self profile)
 * - /settings
 * - /shop (redemption checkout actions)
 * - /creator
 * - /economy-lab
 */

const EXACT_PUBLIC_PATHS = new Set([
  '/',
  '/explore',
  '/map',
  '/quests',
  '/plaza',
  '/leaderboard',
  '/choice',
  '/trail',
  '/about',
  '/search',
  '/login',
  '/download',
  '/affiliate',
  '/privacy',
  '/terms',
  '/thank-you',
]);

const PROTECTED_EXACT_OR_PREFIXES = [
  '/quests/create',
  '/profile/edit',
  '/settings',
  '/creator',
  '/economy-lab',
];

export function isPublicPage(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = pathname.trim() || '/';

  if (EXACT_PUBLIC_PATHS.has(normalized)) {
    return true;
  }

  for (const protectedPrefix of PROTECTED_EXACT_OR_PREFIXES) {
    if (normalized === protectedPrefix || normalized.startsWith(`${protectedPrefix}/`)) {
      return false;
    }
  }

  // /spots/:slug is public
  if (normalized.startsWith('/spots/')) {
    return true;
  }

  // /quests/:id is public, except /quests/:id/play or /quests/create
  if (normalized.startsWith('/quests/')) {
    if (/^\/quests\/[^/]+\/play(\/|$)/.test(normalized)) {
      return false;
    }
    return true;
  }

  // Public traveler profiles (/users/:handle or /profile/:handle, but not bare /profile)
  if (normalized.startsWith('/users/') || normalized.startsWith('/profile/')) {
    return true;
  }

  return false;
}
