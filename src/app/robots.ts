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

  // If the API provides a raw robots.txt, we should ideally parse it or use a Route Handler.
  // Returning a raw string from robots.ts is not supported and causes:
  // TypeError: Cannot read properties of undefined (reading 'userAgent')
  // because Next.js expects a MetadataRoute.Robots object.
  // if (seo?.robots_txt) {
  //   return seo.robots_txt as string;
  // }

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
