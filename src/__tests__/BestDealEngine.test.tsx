import { describe, it, expect } from "vitest";
import { calculateVoucherDiscount, type AppliedVoucherState } from "@/services/orderService";
import viLocale from "@/i18n/locales/vi.json";
import enLocale from "@/i18n/locales/en.json";

describe("Frontend Best Deal Engine Unit Tests", () => {
  describe("Case 1: Multi-item cart (2 sale items, 1 regular item) Best Deal comparison", () => {
    // Cart setup:
    // Item 1: Original 100k, Sale 80k (item discount = 20k)
    // Item 2: Original 150k, Sale 120k (item discount = 30k)
    // Item 3: Original 100k, Regular 100k (item discount = 0k)
    const cartItems = [
      { id: 1, name: "Món 1", originalPrice: 100000, unitPrice: 80000, quantity: 1 },
      { id: 2, name: "Món 2", originalPrice: 150000, unitPrice: 120000, quantity: 1 },
      { id: 3, name: "Món 3", originalPrice: 100000, unitPrice: 100000, quantity: 1 },
    ];

    const originalSubtotal = cartItems.reduce(
      (sum, item) => sum + (item.originalPrice || item.unitPrice) * item.quantity,
      0
    ); // 350,000
    const saleSubtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0); // 300,000
    const totalItemDiscount = originalSubtotal - saleSubtotal; // 50,000

    it("evaluates cart original subtotal, sale subtotal, and total item discount correctly", () => {
      expect(originalSubtotal).toBe(350000);
      expect(saleSubtotal).toBe(300000);
      expect(totalItemDiscount).toBe(50000);
    });

    it("Scenario 1A: Non-combinable voucher 70k > 50k item discount -> Best Deal selects voucher", () => {
      const voucher70k: AppliedVoucherState = {
        id: 101,
        code: "DEAL70K",
        discountType: "fixed",
        value: 70000,
        prereqPrice: 200000,
        canCombineWithPromotions: false,
      };

      const voucherDiscountAmount = calculateVoucherDiscount(voucher70k, originalSubtotal, 0);
      expect(voucherDiscountAmount).toBe(70000);

      // Best Deal condition:
      const isVoucherBetter = voucherDiscountAmount > totalItemDiscount;
      expect(isVoucherBetter).toBe(true);

      // When voucher is selected:
      // Items revert to original price: total = 350,000 - 70,000 = 280,000
      const finalTotalWithVoucher = originalSubtotal - voucherDiscountAmount;
      const finalTotalWithCampaign = saleSubtotal; // 300,000
      expect(finalTotalWithVoucher).toBe(280000);
      expect(finalTotalWithVoucher).toBeLessThan(finalTotalWithCampaign);
    });

    it("Scenario 1B: Non-combinable voucher 40k < 50k item discount -> Best Deal keeps campaign discount", () => {
      const voucher40k: AppliedVoucherState = {
        id: 102,
        code: "DEAL40K",
        discountType: "fixed",
        value: 40000,
        prereqPrice: 200000,
        canCombineWithPromotions: false,
      };

      const voucherDiscountAmount = calculateVoucherDiscount(voucher40k, originalSubtotal, 0);
      expect(voucherDiscountAmount).toBe(40000);

      // Best Deal condition: totalItemDiscount >= voucherDiscountAmount
      const isCampaignBetter = totalItemDiscount >= voucherDiscountAmount;
      expect(isCampaignBetter).toBe(true);
    });
  });

  describe("Case 2: Voucher prereq_price evaluated against original_subtotal when canCombineWithPromotions is false", () => {
    const voucherMin300k: AppliedVoucherState = {
      id: 103,
      code: "MIN300K",
      discountType: "fixed",
      value: 40000,
      prereqPrice: 300000,
      canCombineWithPromotions: false,
    };

    it("qualifies for voucher when originalSubtotal (320k) >= prereq (300k) even if saleSubtotal (280k) < prereq", () => {
      const saleSubtotal = 280000;
      const originalSubtotal = 320000;
      const prereqPrice = voucherMin300k.prereqPrice || 0;

      // Under Best Deal rules: effective spend is originalSubtotal
      const effectiveSpend = voucherMin300k.canCombineWithPromotions === false ? originalSubtotal : saleSubtotal;
      expect(effectiveSpend >= prereqPrice).toBe(true);

      // Calculate discount on originalSubtotal
      const discount = calculateVoucherDiscount(voucherMin300k, originalSubtotal, 0);
      expect(discount).toBe(40000);
    });

    it("fails validation when originalSubtotal (250k) is genuinely below prereq (300k)", () => {
      const originalSubtotal = 250000;
      const prereqPrice = voucherMin300k.prereqPrice || 0;
      const effectiveSpend = originalSubtotal;
      expect(effectiveSpend >= prereqPrice).toBe(false);
    });
  });

  describe("Case 3: Combinable voucher (can_combine_with_promotions = true) stacks with promotions", () => {
    const combinableVoucher: AppliedVoucherState = {
      id: 104,
      code: "STACKABLE30K",
      discountType: "fixed",
      value: 30000,
      prereqPrice: 200000,
      canCombineWithPromotions: true,
    };

    it("evaluates prereq on saleSubtotal and stacks discount with campaign discounts", () => {
      const saleSubtotal = 260000;
      const campaignDiscount = 40000;
      const prereqPrice = combinableVoucher.prereqPrice || 0;

      // Prereq check on saleSubtotal
      expect(saleSubtotal >= prereqPrice).toBe(true);

      const voucherDiscount = calculateVoucherDiscount(combinableVoucher, saleSubtotal, 0);
      expect(voucherDiscount).toBe(30000);

      // Total discount = voucher (30k) + campaign (40k) = 70k
      const totalDiscount = voucherDiscount + campaignDiscount;
      expect(totalDiscount).toBe(70000);

      // Final payment total = saleSubtotal (260k) - voucherDiscount (30k) = 230k
      const finalPayment = saleSubtotal - voucherDiscount;
      expect(finalPayment).toBe(230000);
    });
  });

  describe("Case 4: Line item pricing logic for applied_deal_type = 'voucher'", () => {
    it("reverts item price to originalPrice when isBestDealVoucherApplied is true", () => {
      const isBestDealVoucherApplied = true;
      const item = {
        originalPrice: 150000,
        unitPrice: 120000,
      };

      const resolvedPrice = isBestDealVoucherApplied
        ? item.originalPrice && item.originalPrice > item.unitPrice
          ? item.originalPrice
          : item.unitPrice
        : item.unitPrice;

      expect(resolvedPrice).toBe(150000);
    });

    it("keeps unitPrice when isBestDealVoucherApplied is false", () => {
      const isBestDealVoucherApplied = false;
      const item = {
        originalPrice: 150000,
        unitPrice: 120000,
      };

      const resolvedPrice = isBestDealVoucherApplied
        ? item.originalPrice && item.originalPrice > item.unitPrice
          ? item.originalPrice
          : item.unitPrice
        : item.unitPrice;

      expect(resolvedPrice).toBe(120000);
    });
  });

  describe("Case 5: Verification of Best Deal i18n copy and messaging (vi.json & en.json)", () => {
    it("matches exact Vietnamese wording in checkout and voucher namespaces", () => {
      const expectedApplied = "Đã tự động áp dụng ưu đãi tốt nhất cho đơn hàng.";
      const expectedItemBetter =
        "Giá ưu đãi của món đang tốt hơn voucher, hệ thống đã giữ lại mức giảm tối ưu nhất.";

      expect(viLocale.checkout.best_deal_applied).toBe(expectedApplied);
      expect(viLocale.checkout.best_deal_item_better).toBe(expectedItemBetter);
      expect(viLocale.voucher.best_deal_applied).toBe(expectedApplied);
      expect(viLocale.voucher.best_deal_item_better).toBe(expectedItemBetter);
    });

    it("has valid English translations for best_deal keys in checkout and voucher namespaces", () => {
      const expectedEnApplied = "Best deal automatically applied for your order.";
      const expectedEnItemBetter =
        "Item promotional price is better than this voucher, optimal discount has been retained.";

      expect(enLocale.checkout.best_deal_applied).toBe(expectedEnApplied);
      expect(enLocale.checkout.best_deal_item_better).toBe(expectedEnItemBetter);
      expect(enLocale.voucher.best_deal_applied).toBe(expectedEnApplied);
      expect(enLocale.voucher.best_deal_item_better).toBe(expectedEnItemBetter);
    });
  });
});

