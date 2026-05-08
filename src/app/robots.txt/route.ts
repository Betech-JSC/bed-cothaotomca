import { NextResponse } from 'next/server';
import { getSeoSettings } from '@/services/seoService';

export const revalidate = 60; // Revalidate every minute

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com').replace(/\/$/, '');
  
  let seo = null;
  try {
    // Fetch SEO settings from the API with low revalidate for robots.txt
    seo = await getSeoSettings().catch(() => null);
  } catch (e) {
    seo = null;
  }

  // 1. If the API provides a raw robots.txt content, return it directly
  if (seo?.robots_txt) {
    return new NextResponse(seo.robots_txt, {
      headers: { 
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      },
    });
  }

  // 2. Fallback to a default robots.txt structure if no raw content is provided
  const sitemapEnabled = seo?.sitemap_enabled !== undefined ? !!seo.sitemap_enabled : true;
  const sitemapUrl = sitemapEnabled ? `\nSitemap: ${baseUrl}/sitemap.xml` : '';
  
  const defaultRobots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /admin/
Disallow: /private/
Disallow: /*?*sort=*
Disallow: /*?*filter=*${sitemapUrl}`;

  return new NextResponse(defaultRobots, {
    headers: { 
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=59'
    },
  });
}
