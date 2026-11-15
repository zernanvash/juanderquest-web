// Owner 2026-11-16 (QA audit U9): the web is the front door, the Android app is
// the full product. Pages for these features send visitors to /download, which
// names the feature and says it is in the app. Merchant pages stay on the web
// until the merchant workspace ships in the app.

export const APP_ONLY_FEATURES = {
  home: { label: 'Your traveler home', paths: ['/dashboard'] },
  quests: { label: 'Quests', paths: ['/quests', '/campaigns', '/funding'] },
  trails: { label: 'Trails', paths: ['/trail', '/trails'] },
  choice: { label: 'JuanChoice voting', paths: ['/choice', '/vote', '/community-choice'] },
  quizzes: { label: 'Cultural quizzes', paths: ['/quiz', '/quizzes'] },
  plaza: { label: 'The Plaza', paths: ['/plaza', '/leaderboard'] },
  shop: { label: 'The shop and vouchers', paths: ['/shop', '/wallet'] },
  profile: { label: 'Traveler profiles and stamps', paths: ['/profile', '/users', '/history', '/stamps', '/saved'] },
  settings: { label: 'Account settings', paths: ['/settings', '/onboarding'] },
  navigate: { label: 'Turn-by-turn navigation', paths: ['/navigate'] },
  search: { label: 'Search', paths: ['/search'] },
  contribute: { label: 'Adding spots and quests', paths: ['/map/add-spot', '/spots/new', '/thank-you'] },
  affiliate: { label: 'Merchant affiliate applications', paths: ['/affiliate'] },
} as const;

export type AppOnlyFeature = keyof typeof APP_ONLY_FEATURES;

const SPOT_QUEST_BUILDER = /^\/spots\/[^/]+\/quests\/new\/?$/;

/** Which app-only feature a path belongs to, or null for a front-door page. */
export function appOnlyFeatureFor(pathname: string): AppOnlyFeature | null {
  if (SPOT_QUEST_BUILDER.test(pathname)) return 'contribute';
  for (const [key, feature] of Object.entries(APP_ONLY_FEATURES)) {
    if (feature.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return key as AppOnlyFeature;
  }
  return null;
}

/** The label for a ?feature= value, or null when it is not one of ours. */
export function appOnlyLabel(value: string | null): string | null {
  return value && Object.prototype.hasOwnProperty.call(APP_ONLY_FEATURES, value) ? APP_ONLY_FEATURES[value as AppOnlyFeature].label : null;
}

/** next.config redirects: temporary, so a page can come back to the web later. */
export function appOnlyRedirects() {
  const redirects = Object.entries(APP_ONLY_FEATURES).flatMap(([key, feature]) =>
    feature.paths.map((p) => ({ source: `${p}/:path*`, destination: `/download?feature=${key}`, permanent: false })),
  );
  redirects.push({ source: '/spots/:slug/quests/new', destination: '/download?feature=contribute', permanent: false });
  return redirects;
}
