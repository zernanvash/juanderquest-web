const PUBLIC_PATHS = new Set(['/', '/login', '/download', '/affiliate', '/privacy', '/terms', '/thank-you', '/trail']);

export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}
