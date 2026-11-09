import type { PublicCampaignItem, CampaignEligibilityResult, CampaignLockResult } from "@/types/campaign";

import { getApiBaseUrl } from "./apiService";

const API_BASE = getApiBaseUrl();

export type { PublicCampaignItem, CampaignEligibilityResult, CampaignLockResult };

export async function getActiveCampaigns(locale: string = "vi"): Promise<PublicCampaignItem[]> {
  try {
    const res = await fetch(`${API_BASE}/campaigns?lang=${encodeURIComponent(locale)}`, {
      headers: { Accept: "application/json", "Accept-Language": locale },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []) as PublicCampaignItem[];
  } catch {
    return [];
  }
}
