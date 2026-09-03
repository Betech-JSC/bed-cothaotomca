import { describe, it, expect } from "vitest";
import { calculateVoucherDiscount, type AppliedVoucherState } from "@/services/orderService";

describe("Voucher Discount Calculation & Auto-Removal Unit Tests (Lỗi 2 & Lỗi 3)", () => {
  const DEFAULT_SHIPPING = 35000;
  const DEFAULT_SUBTOTAL = 200000;

  describe("Lỗi 2: Tính đúng số tiền giảm ship cho các loại Voucher Freeship", () => {
    it("1. Voucher freeship loại giảm cố định (vd: giảm 20.000đ trên phí ship 35.000đ) -> trả về đúng 20.000đ", () => {
      const fixedShippingVoucher: AppliedVoucherState = {
        id: 1,
        code: "FREESHIP20K",
        discountType: "fixed",
        value: 20000,
        isFreeship: true,
      };

      const discount = calculateVoucherDiscount(fixedShippingVoucher, DEFAULT_SUBTOTAL, DEFAULT_SHIPPING);
      expect(discount).toBe(20000);
      expect(discount).not.toBe(DEFAULT_SHIPPING);
    });

    it("1b. Voucher freeship loại cố định nhưng giá trị voucher lớn hơn phí ship -> chỉ giảm tối đa bằng phí ship", () => {
      const fixedShippingVoucher: AppliedVoucherState = {
        id: 2,
        code: "FREESHIP50K",
        discountType: "fixed",
        value: 50000,
        isFreeship: true,
      };

      const discount = calculateVoucherDiscount(fixedShippingVoucher, DEFAULT_SUBTOTAL, 30000);
      expect(discount).toBe(30000);
    });

    it("2. Voucher freeship loại giảm % có max_discount (vd: giảm 50% ship 35k nhưng max 10k) -> trả về đúng 10.000đ (bị chặn bởi max)", () => {
      const percentCappedVoucher: AppliedVoucherState = {
        id: 3,
        code: "FREESHIP50PCT_MAX10K",
        discountType: "percent",
        value: 50,
        maxDiscount: 10000,
        isFreeship: true,
      };

      const discount = calculateVoucherDiscount(percentCappedVoucher, DEFAULT_SUBTOTAL, DEFAULT_SHIPPING);
      expect(discount).toBe(10000);
      expect(discount).not.toBe(17500);
      expect(discount).not.toBe(18000);
      expect(discount).not.toBe(DEFAULT_SHIPPING);
    });

    it("2b. Voucher freeship loại giảm % không có max_discount -> làm tròn lên hàng nghìn (ceil to thousand)", () => {
      const percentVoucher: AppliedVoucherState = {
        id: 4,
        code: "SHIP15PCT",
        discountType: "percent",
        value: 15,
        isFreeship: true,
      };

      // 35,000 * 15% = 5,250 -> làm tròn lên 6,000đ
      const discount = calculateVoucherDiscount(percentVoucher, DEFAULT_SUBTOTAL, DEFAULT_SHIPPING);
      expect(discount).toBe(6000);
    });

    it("3. Voucher freeship loại giảm toàn bộ 100% (freeship) -> trả về đúng bằng phí ship gốc", () => {
      const fullFreeshipVoucher: AppliedVoucherState = {
        id: 5,
        code: "FREESHIP_ALL",
        discountType: "freeship",
        value: 0,
        isFreeship: true,
      };

      const discount = calculateVoucherDiscount(fullFreeshipVoucher, DEFAULT_SUBTOTAL, DEFAULT_SHIPPING);
      expect(discount).toBe(DEFAULT_SHIPPING);
      expect(discount).toBe(35000);
    });
  });

  describe("Lỗi 3: Áp dụng điều kiện đơn tối thiểu (prereqPrice) cho TẤT CẢ các loại voucher kể cả Freeship", () => {
    it("1. Voucher freeship có prereqPrice: 300.000đ khi subtotal < 300.000đ -> discount = 0", () => {
      const freeshipWithPrereq: AppliedVoucherState = {
        id: 6,
        code: "FREESHIP300K",
        discountType: "freeship",
        value: 0,
        prereqPrice: 300000,
        isFreeship: true,
      };

      // Khi subtotal = 250,000đ (< 300,000đ)
      const discountBelow = calculateVoucherDiscount(freeshipWithPrereq, 250000, DEFAULT_SHIPPING);
      expect(discountBelow).toBe(0);

      // Khi subtotal = 300,000đ (đủ điều kiện)
      const discountEligible = calculateVoucherDiscount(freeshipWithPrereq, 300000, DEFAULT_SHIPPING);
      expect(discountEligible).toBe(DEFAULT_SHIPPING);
    });

    it("2. Voucher giảm giá món (order voucher) có prereqPrice: 150.000đ khi subtotal < 150.000đ -> discount = 0", () => {
      const orderVoucher: AppliedVoucherState = {
        id: 7,
        code: "GIAM30K",
        discountType: "fixed",
        value: 30000,
        prereqPrice: 150000,
      };

      const discountBelow = calculateVoucherDiscount(orderVoucher, 120000, DEFAULT_SHIPPING);
      expect(discountBelow).toBe(0);

      const discountEligible = calculateVoucherDiscount(orderVoucher, 150000, DEFAULT_SHIPPING);
      expect(discountEligible).toBe(30000);
    });
  });

  describe("Order Vouchers & E-Vouchers calculations", () => {
    it("Order voucher percent with maxDiscount -> làm tròn lên hàng nghìn và chặn theo max", () => {
      const pctVoucher: AppliedVoucherState = {
        id: 8,
        code: "GIAM10PCT_MAX20K",
        discountType: "percent",
        value: 10,
        maxDiscount: 20000,
      };

      // subtotal 250,000 * 10% = 25,000 -> max capped at 20,000
      expect(calculateVoucherDiscount(pctVoucher, 250000, 30000)).toBe(20000);

      // subtotal 155,000 * 10% = 15,500 -> ceil to 16,000
      expect(calculateVoucherDiscount(pctVoucher, 155000, 30000)).toBe(16000);
    });

    it("E-Voucher -> có thể trừ cả vào phí ship nếu giá trị voucher lớn hơn subtotal", () => {
      const eVoucher: AppliedVoucherState = {
        id: 9,
        code: "EVOUCHER100K",
        discountType: "fixed",
        value: 100000,
      };

      // subtotal 80,000 + ship 30,000 = 110,000 -> giảm 100,000
      expect(calculateVoucherDiscount(eVoucher, 80000, 30000)).toBe(100000);
    });
  });
});
