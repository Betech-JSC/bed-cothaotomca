const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

export interface PublicCampaignItem {
  id: number;
  name: string;
  code?: string;
  special_note?: string;
  description?: string;
  banner?: string;
  promotion_type?: string;
  discount_type?: string;
  discount_value?: number;
  min_order_value?: number;
  max_discount?: number | null;
  can_combine_with_promotions?: boolean;
  can_combine_with_freeship?: boolean;
  settings?: any;
  start_at?: string | null;
  end_at?: string | null;
}

export async function getActiveCampaigns(): Promise<PublicCampaignItem[]> {
  try {
    const res = await fetch(`${API_BASE}/campaigns`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []) as PublicCampaignItem[];
  } catch {
    return [];
  }
}
