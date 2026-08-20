import { getSingleApi } from './apiService';

export interface SeoSettings {
  id: number;
  title: string | null;
  description: string | null;
  favicon: string | null;
  meta_image: string | null;
  keywords: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface MetaPage {
  page_identifier: string;
  page_name?: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image: string | null;
  canonical_url: string | null;
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
