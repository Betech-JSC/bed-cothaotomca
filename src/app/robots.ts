import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com';

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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
