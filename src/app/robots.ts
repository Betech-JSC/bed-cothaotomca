import { MetadataRoute } from 'next';
import { getSeoSettings } from '@/services/seoSettingService';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com';

  // Thử lấy robots_txt từ API, fallback về giá trị mặc định
  const seo = await getSeoSettings().catch(() => null);

  if (seo?.robots_txt) {
    // Parse robots_txt string từ API thành MetadataRoute.Robots format
    // Nhưng vì Next.js cần object format, ta extract rules cơ bản
    const lines = seo.robots_txt.split('\n').map(l => l.trim()).filter(Boolean);
    const disallowPaths: string[] = [];
    const allowPaths: string[] = [];
    let hasSitemap = false;
    let sitemapUrl = `${baseUrl}/sitemap.xml`;

    for (const line of lines) {
      if (line.toLowerCase().startsWith('disallow:')) {
        const path = line.replace(/^disallow:\s*/i, '').trim();
        if (path) disallowPaths.push(path);
      } else if (line.toLowerCase().startsWith('allow:')) {
        const path = line.replace(/^allow:\s*/i, '').trim();
        if (path) allowPaths.push(path);
      } else if (line.toLowerCase().startsWith('sitemap:')) {
        hasSitemap = true;
        sitemapUrl = line.replace(/^sitemap:\s*/i, '').trim();
      }
    }

    return {
      rules: {
        userAgent: '*',
        allow: allowPaths.length > 0 ? allowPaths : '/',
        disallow: disallowPaths.length > 0 ? disallowPaths : undefined,
      },
      sitemap: sitemapUrl,
    };
  }

  // Fallback — giữ nguyên giá trị hiện tại
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

