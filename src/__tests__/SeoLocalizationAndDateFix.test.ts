import { describe, it, expect } from 'vitest';
import { resolveMetaTitle, resolveMetaDescription, resolveMetaKeywords, MetaPage } from '../services/seoService';
import { formatVietnameseDate } from '../lib/operatingHours';

describe('SEO Localization & Resolver Tests', () => {
  const sampleMeta: MetaPage = {
    page_identifier: 'home',
    page_name: 'Trang chủ',
    page_name_en: 'Home',
    seo_title: 'Cô Thảo Tôm Cá | Cá Hồi, Tôm Cua Thịt Heo',
    seo_title_en: 'Co Thao Tom Ca | Premium Seafood & Specialties',
    seo_description: 'Mô tả tiếng Việt cho trang chủ',
    seo_description_en: 'English description for homepage',
    seo_keywords: 'tom, ca, hai san',
    seo_keywords_en: 'shrimp, fish, seafood',
    og_image: '/cover.jpg',
    og_image_en: '/cover-en.jpg',
    canonical_url: 'https://cothaotomca.vn',
    canonical_url_en: 'https://cothaotomca.vn/en',
    noindex: false,
    nofollow: false,
  };

  it('resolves Vietnamese SEO title and description when locale is vi', () => {
    const title = resolveMetaTitle(sampleMeta, 'vi', 'Default Title VI');
    const desc = resolveMetaDescription(sampleMeta, 'vi', 'Default Desc VI');
    const keywords = resolveMetaKeywords(sampleMeta, 'vi');

    expect(title).toBe('Cô Thảo Tôm Cá | Cá Hồi, Tôm Cua Thịt Heo');
    expect(desc).toBe('Mô tả tiếng Việt cho trang chủ');
    expect(keywords).toEqual(['tom', 'ca', 'hai san']);
  });

  it('resolves English SEO title and description when locale is en', () => {
    const title = resolveMetaTitle(sampleMeta, 'en', 'Default Title EN');
    const desc = resolveMetaDescription(sampleMeta, 'en', 'Default Desc EN');
    const keywords = resolveMetaKeywords(sampleMeta, 'en');

    expect(title).toBe('Co Thao Tom Ca | Premium Seafood & Specialties');
    expect(desc).toBe('English description for homepage');
    expect(keywords).toEqual(['shrimp', 'fish', 'seafood']);
  });

  it('falls back to English default title when English meta is not configured, preventing Vietnamese leakage', () => {
    const metaWithoutEn: MetaPage = {
      page_identifier: 'about',
      page_name: 'Về chúng tôi',
      seo_title: 'Về chúng tôi | Cô Thảo Tôm Cá',
      seo_description: 'Mô tả tiếng Việt',
      seo_keywords: null,
      og_image: null,
      canonical_url: null,
      noindex: false,
      nofollow: false,
    };

    const title = resolveMetaTitle(metaWithoutEn, 'en', 'About Us | Co Thao Tom Ca');
    const desc = resolveMetaDescription(metaWithoutEn, 'en', 'About Us English Description');

    // Crucial check: Must NOT return 'Về chúng tôi | Cô Thảo Tôm Cá' on English page!
    expect(title).toBe('About Us | Co Thao Tom Ca');
    expect(desc).toBe('About Us English Description');
  });

  it('formatVietnameseDate supports both vi and en locales correctly', () => {
    // 2026-10-14 is a Wednesday
    const date = new Date(2026, 9, 14); // Note: month is 0-indexed (9 = October)
    
    const formattedVi = formatVietnameseDate(date, 'vi');
    expect(formattedVi).toContain('Thứ Tư');
    expect(formattedVi).toContain('14/10/2026');

    const formattedEn = formatVietnameseDate(date, 'en');
    expect(formattedEn).toContain('Wednesday');
    expect(formattedEn).toContain('14/10/2026');
  });

  it('getSingleApi and getMetaPage return null instead of [] when backend returns 500 fallback { data: [] }', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(JSON.stringify({ message: 'Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })) as any;

    try {
      const { getMetaPage, getSeoSettings } = await import('../services/seoService');
      const { getProductBySlug } = await import('../services/productService');

      const meta = await getMetaPage('contact', 'en');
      expect(meta).toBeNull();

      const seo = await getSeoSettings('en');
      expect(seo).toBeNull();

      const product = await getProductBySlug('non-existent-slug', { lang: 'en' });
      expect(product).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('ContactPage generateMetadata does not throw TypeError when getMetaPage("contact") returns null', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(JSON.stringify({ data: null }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })) as any;

    try {
      const { generateMetadata } = await import('../app/[locale]/contact/page');
      const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
      expect(metadata.title).toBe('Contact Us | Co Thao Tom Ca');
      expect((metadata.openGraph as any)?.title).toBe('Contact Us | Co Thao Tom Ca');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

