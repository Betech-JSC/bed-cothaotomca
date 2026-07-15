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

export interface SeoSettingsResponse {
  data: SeoSettings;
}

/**
 * Fetch SEO settings from the API.
 * Uses existing `getSingleApi` helper so BASE_URL env var is respected.
 */
export async function getSeoSettings(lang?: string): Promise<SeoSettings> {
  const params = lang ? { lang } : undefined;
  const json = await getSingleApi<SeoSettings>('seo-settings', { params, revalidate: 0 });
  // getSingleApi returns { data: ... }
  return json.data as SeoSettings;
}
