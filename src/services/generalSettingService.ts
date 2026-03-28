import { ApiKey } from './apiService';

const BASE_URL = 'https://staging-cothaotomca.betech-digital.com/api/v1';

export interface GeneralSettings {
  id: number;
  logo: string | null;
  logo_white: string | null;
  favicon: string | null;
  hotline: string | null;
  email: string | null;
  link_facebook: string | null;
  link_instagram: string | null;
  link_tiktok: string | null;
  link_zalo: string | null;
  link_youtube: string | null;
  link_threads: string | null;
  address: string | null;
  link_address: string | null;
  describe: string | null;
  created_at: string;
  updated_at: string;
  // Computed URLs returned by API
  logo_url: string | null;
  logo_white_url: string | null;
  favicon_url: string | null;
}

export interface GeneralSettingsResponse {
  data: GeneralSettings;
}

/**
 * Fetch general settings (single object, not array)
 * This API returns { data: {...} } instead of { data: [...] }
 */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  const url = `${BASE_URL}/general-settings`;

  const response = await fetch(url, {
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch general settings');
  }

  const json: GeneralSettingsResponse = await response.json();
  return json.data;
}
