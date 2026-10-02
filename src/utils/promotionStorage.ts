/**
 * Promotion Storage Utility
 * Manages localStorage synchronization for voucher codes and campaign IDs
 * across Desktop and Mobile checkout flows.
 */

export const PROMOTION_STORAGE_KEYS = [
  "cothaotomca_applied_voucher_codes",
  "cothaotomca_selected_campaign_ids",
  "active_voucher",
  "active_shipping_voucher",
  "active_campaign_ids",
] as const;

export const APPLIED_VOUCHER_CODES_KEY = "cothaotomca_applied_voucher_codes";
export const SELECTED_CAMPAIGN_IDS_KEY = "cothaotomca_selected_campaign_ids";

/**
 * Xóa sạch 100% toàn bộ 5 keys khuyến mãi khỏi localStorage khi có window.
 */
export function clearAllPromotionStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of PROMOTION_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.error("Error clearing promotion storage", e);
  }
}

/**
 * Đọc an toàn parse JSON mảng mã voucher đã lưu trong localStorage.
 */
export function getStoredVoucherCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(APPLIED_VOUCHER_CODES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((code) => (typeof code === "string" ? code.trim() : String(code).trim()))
        .filter(Boolean);
    }
  } catch (e) {
    console.error("Error reading stored voucher codes from localStorage", e);
  }
  return [];
}

/**
 * Ghi an toàn JSON stringify mảng mã voucher vào localStorage.
 */
export function setStoredVoucherCodes(codes: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const cleanCodes = Array.isArray(codes)
      ? codes.map((c) => (typeof c === "string" ? c.trim() : String(c).trim())).filter(Boolean)
      : [];
    localStorage.setItem(APPLIED_VOUCHER_CODES_KEY, JSON.stringify(cleanCodes));
  } catch (e) {
    console.error("Error saving voucher codes to localStorage", e);
  }
}

/**
 * Loại bỏ 1 mã voucher cụ thể khỏi mảng lưu trữ trong localStorage (và xóa legacy keys).
 */
export function pruneStoredVoucherCode(code: string): void {
  if (typeof window === "undefined" || !code) return;
  try {
    const current = getStoredVoucherCodes();
    const remaining = current.filter(
      (c) => c.toUpperCase() !== code.trim().toUpperCase()
    );
    setStoredVoucherCodes(remaining);
    localStorage.removeItem("active_voucher");
    localStorage.removeItem("active_shipping_voucher");
  } catch (e) {
    console.error("Error pruning voucher code from localStorage", e);
  }
}

/**
 * Đọc an toàn parse JSON mảng campaign IDs đã lưu trong localStorage.
 */
export function getStoredCampaignIds(): (number | string)[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SELECTED_CAMPAIGN_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error("Error reading stored campaign IDs from localStorage", e);
  }
  return [];
}

/**
 * Ghi an toàn JSON stringify mảng campaign IDs vào localStorage.
 */
export function setStoredCampaignIds(ids: (number | string)[]): void {
  if (typeof window === "undefined") return;
  try {
    const cleanIds = Array.isArray(ids) ? ids : [];
    localStorage.setItem(SELECTED_CAMPAIGN_IDS_KEY, JSON.stringify(cleanIds));
  } catch (e) {
    console.error("Error saving campaign IDs to localStorage", e);
  }
}
