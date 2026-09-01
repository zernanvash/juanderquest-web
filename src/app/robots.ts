import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://jdq.zernanvash.dev'; return { rules: [{ userAgent: '*', allow: '/', disallow: ['/profile', '/history', '/login', '/spots/new'] }], sitemap: `${base}/sitemap.xml`, host: base }; }
