import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isPresentation = process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE === 'true' ||
    process.env.NEXT_DIST_DIR === '.next-presentation';
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://juanderquest.app';

  if (isPresentation) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
      host: base,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/profile', '/history', '/login', '/spots/new'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
