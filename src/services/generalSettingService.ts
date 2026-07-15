import { getSingleApi } from './apiService';

export interface GeneralSettings {
  id: number;
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
}

export interface GeneralSettingsResponse {
  data: GeneralSettings;
}

/**
 * Fetch general settings (single object, not array)
 */
export async function getGeneralSettings(lang?: string): Promise<GeneralSettings> {
  const params = lang ? { lang } : undefined;
  const json = await getSingleApi<GeneralSettings>('general-settings', { params, revalidate: 60 });
  return json.data;
}

