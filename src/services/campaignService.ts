import type { PublicCampaignItem, CampaignEligibilityResult, CampaignLockResult } from "@/types/campaign";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

export type { PublicCampaignItem, CampaignEligibilityResult, CampaignLockResult };

export async function getActiveCampaigns(): Promise<PublicCampaignItem[]> {
  try {
    const res = await fetch(`${API_BASE}/campaigns`, {
      headers: { Accept: "application/json" },
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
