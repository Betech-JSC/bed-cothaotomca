import { MetadataRoute } from 'next';
import { getSeoSettings } from '@/services/seoService';

export default async function robots(): Promise<MetadataRoute.Robots | string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com';

  let seo = null;
  try {
    seo = await getSeoSettings().catch(() => null);
  } catch (e) {
    seo = null;
  }

  // If the API provides a raw robots.txt, return it directly
  if (seo?.robots_txt) {
    return seo.robots_txt as string;
  }

  const sitemapEnabled = seo?.sitemap_enabled !== undefined ? !!seo.sitemap_enabled : true;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/_next/',
        '/admin/',
        '/private/',
        '/*?*sort=*',
        '/*?*filter=*',
      ],
    },
    sitemap: sitemapEnabled ? `${baseUrl}/sitemap.xml` : undefined,
  };
}
