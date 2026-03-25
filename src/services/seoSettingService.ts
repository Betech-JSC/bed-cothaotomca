const BASE_URL = 'https://staging-cothaotomca.betech-digital.com/api/v1';

export interface SeoSettings {
  id: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_og_image: string | null;
  google_analytics_id: string | null;
  google_tag_manager_id: string | null;
  facebook_pixel_id: string | null;
  robots_txt: string | null;
  head_scripts: string | null;
  body_scripts: string | null;
  sitemap_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeoScripts {
  head_scripts: string;
  body_scripts: string;
  google_analytics_id: string;
  google_tag_manager_id: string;
  facebook_pixel_id: string;
}

export interface SeoSettingsResponse {
  data: SeoSettings;
}

/**
 * Fetch full SEO settings (meta tags, OG image, robots, etc.)
 */
export async function getSeoSettings(): Promise<SeoSettings | null> {
  try {
    const url = `${BASE_URL}/seo-settings`;
    const response = await fetch(url, {
      next: { revalidate: 3600 }
    });

    if (!response.ok) return null;

    const json: SeoSettingsResponse = await response.json();
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Fetch tracking scripts/IDs only (lightweight endpoint)
 */
export async function getSeoScripts(): Promise<SeoScripts | null> {
  try {
    const url = `${BASE_URL}/seo-settings/scripts`;
    const response = await fetch(url, {
      next: { revalidate: 3600 }
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
