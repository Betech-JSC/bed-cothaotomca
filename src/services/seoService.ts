import { getSingleApi } from './apiService';

export interface SeoSettings {
  id: number;
  title: string | null;
  title_en?: string | null;
  seo_title?: string | null;
  seo_title_en?: string | null;
  description: string | null;
  description_en?: string | null;
  seo_description?: string | null;
  seo_description_en?: string | null;
  favicon: string | null;
  meta_image: string | null;
  keywords: string | null;
  keywords_en?: string | null;
  seo_keywords?: string | null;
  seo_keywords_en?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface MetaPage {
  page_identifier: string;
  page_name?: string;
  page_name_en?: string;
  seo_title: string | null;
  seo_title_en?: string | null;
  seo_description: string | null;
  seo_description_en?: string | null;
  seo_keywords: string | null;
  seo_keywords_en?: string | null;
  og_image: string | null;
  og_image_en?: string | null;
  canonical_url: string | null;
  canonical_url_en?: string | null;
  noindex: boolean;
  nofollow: boolean;
}

export interface SeoSettingsResponse {
  data: SeoSettings;
}

/**
 * Fetch SEO settings from the API.
 * Uses existing `getSingleApi` helper so BASE_URL env var is respected.
 */
export async function getSeoSettings(lang?: string): Promise<SeoSettings> {
  const params = lang ? { lang } : undefined;
  const json = await getSingleApi<SeoSettings>('seo-settings', { params, revalidate: 60 });
  return json.data as SeoSettings;
}

/**
 * Fetch page-specific Meta SEO settings from CMS.
 */
export async function getMetaPage(identifier: string, lang?: string): Promise<MetaPage | null> {
  try {
    const params = lang ? { lang } : undefined;
    const json = await getSingleApi<MetaPage>(`meta-pages/${identifier}`, { params, revalidate: 60 });
    return (json?.data as MetaPage) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Safely resolves the meta title according to locale:
 * - If locale is 'en', prioritizes `meta.seo_title_en`.
 * - If English title is missing or empty, safely falls back to default English title,
 *   never letting Vietnamese text leak to English visitors.
 * - If locale is 'vi', prioritizes `meta.seo_title` with fallback to default Vietnamese title.
 */
export function resolveMetaTitle(
  meta: MetaPage | null,
  locale: string,
  defaultTitle: string
): string {
  const isEn = locale === 'en';
  if (isEn) {
    return meta?.seo_title_en?.trim() || defaultTitle;
  }
  return meta?.seo_title?.trim() || defaultTitle;
}

/**
 * Safely resolves the meta description according to locale.
 */
export function resolveMetaDescription(
  meta: MetaPage | null,
  locale: string,
  defaultDescription: string
): string {
  const isEn = locale === 'en';
  if (isEn) {
    return meta?.seo_description_en?.trim() || defaultDescription;
  }
  return meta?.seo_description?.trim() || defaultDescription;
}

/**
 * Safely resolves keywords array according to locale.
 */
export function resolveMetaKeywords(
  meta: MetaPage | null,
  locale: string
): string[] | undefined {
  const isEn = locale === 'en';
  const raw = isEn ? (meta?.seo_keywords_en || undefined) : (meta?.seo_keywords || undefined);
  return raw ? raw.split(',').map((k: string) => k.trim()).filter(Boolean) : undefined;
}
