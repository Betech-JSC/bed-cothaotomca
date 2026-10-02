import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clearAllPromotionStorage,
  getStoredVoucherCodes,
  setStoredVoucherCodes,
  pruneStoredVoucherCode,
  getStoredCampaignIds,
  setStoredCampaignIds,
  PROMOTION_STORAGE_KEYS,
  APPLIED_VOUCHER_CODES_KEY,
  SELECTED_CAMPAIGN_IDS_KEY,
} from "@/utils/promotionStorage";

describe("Promotion Storage Unit Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("clears all 5 promotion keys completely with clearAllPromotionStorage", () => {
    // Populate all 5 promotion keys
    localStorage.setItem("cothaotomca_applied_voucher_codes", JSON.stringify(["VOUCHER10", "FREESHIP"]));
    localStorage.setItem("cothaotomca_selected_campaign_ids", JSON.stringify([1, 2, "camp3"]));
    localStorage.setItem("active_voucher", "VOUCHER10");
    localStorage.setItem("active_shipping_voucher", "FREESHIP");
    localStorage.setItem("active_campaign_ids", JSON.stringify([1, 2]));

    // Verify they exist
    for (const key of PROMOTION_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).not.toBeNull();
    }

    // Clear all
    clearAllPromotionStorage();

    // Verify 100% cleaned
    for (const key of PROMOTION_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });

  it("stores and retrieves voucher codes safely", () => {
    expect(getStoredVoucherCodes()).toEqual([]);

    setStoredVoucherCodes(["CODE1", " CODE2 "]);
    expect(getStoredVoucherCodes()).toEqual(["CODE1", "CODE2"]);

    // Handles corrupt JSON gracefully
    localStorage.setItem(APPLIED_VOUCHER_CODES_KEY, "invalid-json{");
    expect(getStoredVoucherCodes()).toEqual([]);
  });

  it("prunes a single voucher code and legacy voucher keys", () => {
    setStoredVoucherCodes(["FOOD50K", "SHIPFREE", "EXTRA10"]);
    localStorage.setItem("active_voucher", "FOOD50K");
    localStorage.setItem("active_shipping_voucher", "SHIPFREE");

    pruneStoredVoucherCode("FOOD50K");

    expect(getStoredVoucherCodes()).toEqual(["SHIPFREE", "EXTRA10"]);
    expect(localStorage.getItem("active_voucher")).toBeNull();
    expect(localStorage.getItem("active_shipping_voucher")).toBeNull();
  });

  it("prunes voucher code case-insensitively and handles single-item array", () => {
    setStoredVoucherCodes(["SUMMER2026"]);
    pruneStoredVoucherCode("summer2026");
    expect(getStoredVoucherCodes()).toEqual([]);
  });

  it("stores and retrieves campaign IDs safely", () => {
    expect(getStoredCampaignIds()).toEqual([]);

    setStoredCampaignIds([10, "campaign_summer", 20]);
    expect(getStoredCampaignIds()).toEqual([10, "campaign_summer", 20]);

    // Handles corrupt JSON gracefully
    localStorage.setItem(SELECTED_CAMPAIGN_IDS_KEY, "{corrupt-array");
    expect(getStoredCampaignIds()).toEqual([]);
  });
});
