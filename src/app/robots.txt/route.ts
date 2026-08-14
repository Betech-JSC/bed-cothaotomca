import { NextResponse } from 'next/server';
import { getSeoSettings } from '@/services/seoService';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');
  
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
        'Cache-Control': 'no-store, no-cache, must-revalidate'
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
Disallow: /*?*filter=*

# AI Search & Assistant Crawlers (AEO Enabled)
User-agent: PerplexityBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

# Block Aggressive Scrapers
User-agent: Bytespider
Disallow: /${sitemapUrl}`;

  return new NextResponse(defaultRobots, {
    headers: { 
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    },
  });
}
