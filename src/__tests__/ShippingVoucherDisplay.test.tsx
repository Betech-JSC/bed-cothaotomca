import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";

vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/checkout",
}));

import { calculateVoucherDiscount, type AppliedVoucherState } from "@/services/orderService";
import { formatPrice } from "@/lib/format";
import { getVoucherBadgeLabel } from "@/components/Voucher/CouponModal";

/**
 * Reusable summary component representing the exact render logic of CheckoutForm & MobileCartFlow
 */
function OrderSummaryDisplay({
  subtotal,
  shipping,
  originalFee = shipping,
  appliedVoucher,
  appliedShippingVoucher,
  isFreeship = false,
  autoOrderDiscountAmount = 0,
  memberDiscount = 0,
  promoItemsExtraPrice = 0,
  deliveryType = "delivery",
  isDeliverable = true,
}: {
  subtotal: number;
  shipping: number;
  originalFee?: number;
  appliedVoucher?: AppliedVoucherState | null;
  appliedShippingVoucher?: AppliedVoucherState | null;
  isFreeship?: boolean;
  autoOrderDiscountAmount?: number;
  memberDiscount?: number;
  promoItemsExtraPrice?: number;
  deliveryType?: "delivery" | "pickup";
  isDeliverable?: boolean;
}) {
  const foodVoucherDiscount = React.useMemo(() => {
    if (appliedVoucher?.isFreeship || appliedVoucher?.discountType === "freeship") return 0;
    return calculateVoucherDiscount(appliedVoucher, subtotal, shipping);
  }, [appliedVoucher, subtotal, shipping]);

  const shippingVoucherDiscount = React.useMemo(() => {
    const shipVoucher =
      appliedShippingVoucher ||
      (appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship")
        ? appliedVoucher
        : null);
    return calculateVoucherDiscount(shipVoucher, subtotal, shipping);
  }, [appliedShippingVoucher, appliedVoucher, subtotal, shipping]);

  const effectiveShippingFee = Math.max(0, shipping - shippingVoucherDiscount);
  const total = Math.max(
    0,
    subtotal + promoItemsExtraPrice - foodVoucherDiscount - autoOrderDiscountAmount - memberDiscount + effectiveShippingFee
  );

  return (
    <div data-testid="order-summary">
      <div data-testid="subtotal-row">
        <span>Tạm tính</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {/* Dòng Mã giảm giá: chỉ hiển thị khi có voucher món và foodVoucherDiscount > 0 */}
      {appliedVoucher && foodVoucherDiscount > 0 && (
        <div data-testid="voucher-row" className="flex justify-between items-center text-secondary">
          <span>Mã giảm giá</span>
          <span data-testid="voucher-discount-amount">-{formatPrice(foodVoucherDiscount)}</span>
        </div>
      )}

      {/* Dòng Phí giao hàng */}
      <div data-testid="shipping-row">
        <span>Phí giao hàng</span>
        <div data-testid="shipping-fee-content">
          {deliveryType === "pickup" ? (
            <span className="text-secondary font-bold">0đ (Nhận tại quán)</span>
          ) : !isDeliverable ? (
            <span className="text-gray-500 font-bold">--</span>
          ) : shippingVoucherDiscount > 0 ||
            appliedShippingVoucher ||
            (appliedVoucher && (appliedVoucher.isFreeship || appliedVoucher.discountType === "freeship")) ? (
            effectiveShippingFee === 0 ? (
              <div className="flex items-center gap-2">
                {shipping > 0 && (
                  <span data-testid="shipping-strikethrough" className="text-xs text-gray-400 line-through">
                    {formatPrice(shipping)}
                  </span>
                )}
                <span data-testid="shipping-effective-price" className="text-secondary font-bold text-base">
                  0đ
                </span>
                <span data-testid="shipping-voucher-badge" className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                  Mã {appliedShippingVoucher?.code || appliedVoucher?.code}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-2">
                  <span data-testid="shipping-strikethrough" className="text-xs text-gray-400 line-through">
                    {formatPrice(shipping)}
                  </span>
                  <span data-testid="shipping-effective-price" className="text-primary font-bold text-base">
                    {formatPrice(effectiveShippingFee)}
                  </span>
                  <span data-testid="shipping-voucher-badge" className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                    Mã {appliedShippingVoucher?.code || appliedVoucher?.code}
                  </span>
                </div>
                <span data-testid="shipping-discount-note" className="text-xs text-secondary font-semibold">
                  Giảm {formatPrice(shippingVoucherDiscount)} phí vận chuyển
                </span>
              </div>
            )
          ) : isFreeship ? (
            <div className="flex items-center gap-2">
              {originalFee > 0 && (
                <span data-testid="shipping-strikethrough" className="text-xs text-gray-400 line-through">
                  {formatPrice(originalFee)}
                </span>
              )}
              <span data-testid="shipping-effective-price" className="text-secondary font-bold text-base">
                0đ
              </span>
              <span data-testid="shipping-auto-badge" className="text-[10px] bg-secondary/15 text-secondary px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                Freeship tự động
              </span>
            </div>
          ) : shipping > 0 ? (
            <span data-testid="shipping-effective-price" className="text-primary font-bold text-base">
              {formatPrice(shipping)}
            </span>
          ) : (
            <span className="text-gray-500 font-bold text-base">--</span>
          )}
        </div>
      </div>

      <div data-testid="total-row">
        <span>Tổng thanh toán</span>
        <span data-testid="total-amount">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

describe("Shipping Voucher Discount Display & Separation Tests (OpenSpec: fix-shipping-voucher-discount-display)", () => {
  describe("Kịch bản 1: Mã Freeship 100% không giới hạn trần (max_discount: null)", () => {
    const freeshipVoucher: AppliedVoucherState = {
      id: 101,
      code: "BED45XUCW",
      discountType: "freeship",
      value: 0,
      maxDiscount: null,
      isFreeship: true,
    };

    it("1.1 Tính toán số học: giảm đúng 100% phí ship, effectiveShippingFee = 0, total không bị cộng phí ship", () => {
      const subtotal = 350000;
      const shipping = 25000;

      const shippingDiscount = calculateVoucherDiscount(freeshipVoucher, subtotal, shipping);
      expect(shippingDiscount).toBe(25000);

      const effectiveShippingFee = Math.max(0, shipping - shippingDiscount);
      expect(effectiveShippingFee).toBe(0);

      const total = subtotal + effectiveShippingFee;
      expect(total).toBe(350000);
    });

    it("1.2 Giao diện hiển thị: phí ship hiển thị 0đ, có gạch ngang giá cũ 25.000 VNĐ, có badge Mã BED45XUCW, ẩn dòng mã giảm giá", () => {
      render(
        <OrderSummaryDisplay
          subtotal={350000}
          shipping={25000}
          appliedShippingVoucher={freeshipVoucher}
        />
      );

      // Phí giao hàng hiển thị 0đ và có gạch ngang 25.000 VNĐ
      expect(screen.getByTestId("shipping-effective-price")).toHaveTextContent("0đ");
      expect(screen.getByTestId("shipping-strikethrough")).toHaveTextContent("25.000 VNĐ");
      expect(screen.getByTestId("shipping-voucher-badge")).toHaveTextContent("Mã BED45XUCW");

      // Dòng mã giảm giá phải ẩn vì không có voucher món
      expect(screen.queryByTestId("voucher-row")).not.toBeInTheDocument();

      // Tổng thanh toán khớp chính xác 350.000 VNĐ
      expect(screen.getByTestId("total-amount")).toHaveTextContent("350.000 VNĐ");
    });
  });

  describe("Kịch bản 2: Mã Freeship có giới hạn trần (Capped / Partial Freeship)", () => {
    const cappedVoucher: AppliedVoucherState = {
      id: 102,
      code: "SHIPMAX20K",
      discountType: "fixed",
      value: 20000,
      maxDiscount: 20000,
      isFreeship: true,
    };

    it("2.1 Tính toán số học: giảm đúng trần 20.000đ trên phí ship 35.000đ, effectiveShippingFee = 15.000đ", () => {
      const subtotal = 200000;
      const shipping = 35000;

      const shippingDiscount = calculateVoucherDiscount(cappedVoucher, subtotal, shipping);
      expect(shippingDiscount).toBe(20000);

      const effectiveShippingFee = Math.max(0, shipping - shippingDiscount);
      expect(effectiveShippingFee).toBe(15000);

      const total = subtotal + effectiveShippingFee;
      expect(total).toBe(215000);
    });

    it("2.2 Giao diện hiển thị: phí ship hiển thị 15.000 VNĐ, gạch ngang 35.000 VNĐ, có badge và ghi chú Giảm 20.000 VNĐ phí vận chuyển", () => {
      render(
        <OrderSummaryDisplay
          subtotal={200000}
          shipping={35000}
          appliedShippingVoucher={cappedVoucher}
        />
      );

      expect(screen.getByTestId("shipping-strikethrough")).toHaveTextContent("35.000 VNĐ");
      expect(screen.getByTestId("shipping-effective-price")).toHaveTextContent("15.000 VNĐ");
      expect(screen.getByTestId("shipping-voucher-badge")).toHaveTextContent("Mã SHIPMAX20K");
      expect(screen.getByTestId("shipping-discount-note")).toHaveTextContent("Giảm 20.000 VNĐ phí vận chuyển");

      // Dòng mã giảm giá phải ẩn
      expect(screen.queryByTestId("voucher-row")).not.toBeInTheDocument();

      // Tổng thanh toán: 200k + 15k = 215k
      expect(screen.getByTestId("total-amount")).toHaveTextContent("215.000 VNĐ");
    });
  });

  describe("Kịch bản 3: Áp dụng song song Food Voucher + Shipping Voucher", () => {
    const foodVoucher: AppliedVoucherState = {
      id: 201,
      code: "GIAM50K",
      discountType: "fixed",
      value: 50000,
      isFreeship: false,
    };

    const shipVoucher: AppliedVoucherState = {
      id: 202,
      code: "FREESHIP",
      discountType: "freeship",
      value: 0,
      isFreeship: true,
    };

    it("3.1 Tính toán số học: food discount = 50.000đ, shipping discount = 30.000đ, total = 300k - 50k + 0 = 250k", () => {
      const subtotal = 300000;
      const shipping = 30000;

      const foodDiscount = calculateVoucherDiscount(foodVoucher, subtotal, shipping);
      expect(foodDiscount).toBe(50000);

      const shipDiscount = calculateVoucherDiscount(shipVoucher, subtotal, shipping);
      expect(shipDiscount).toBe(30000);

      const effectiveShippingFee = Math.max(0, shipping - shipDiscount);
      expect(effectiveShippingFee).toBe(0);

      const total = subtotal - foodDiscount + effectiveShippingFee;
      expect(total).toBe(250000);
    });

    it("3.2 Giao diện hiển thị: dòng Mã giảm giá chỉ hiển thị -50.000 VNĐ, dòng phí ship hiển thị 0đ gạch 30.000 VNĐ, tổng 250.000 VNĐ", () => {
      render(
        <OrderSummaryDisplay
          subtotal={300000}
          shipping={30000}
          appliedVoucher={foodVoucher}
          appliedShippingVoucher={shipVoucher}
        />
      );

      // Dòng mã giảm giá hiển thị đúng số tiền của voucher món
      expect(screen.getByTestId("voucher-row")).toBeInTheDocument();
      expect(screen.getByTestId("voucher-discount-amount")).toHaveTextContent("-50.000 VNĐ");

      // Dòng phí giao hàng hiển thị 0đ và badge Mã FREESHIP
      expect(screen.getByTestId("shipping-strikethrough")).toHaveTextContent("30.000 VNĐ");
      expect(screen.getByTestId("shipping-effective-price")).toHaveTextContent("0đ");
      expect(screen.getByTestId("shipping-voucher-badge")).toHaveTextContent("Mã FREESHIP");

      // Tổng thanh toán khớp chính xác 250.000 VNĐ
      expect(screen.getByTestId("total-amount")).toHaveTextContent("250.000 VNĐ");
    });
  });

  describe("Kịch bản 4: Chính sách Freeship tự động của quán", () => {
    it("4.1 Khi đơn hàng đạt Freeship tự động (isFreeship: true), hiển thị badge Freeship tự động và 0đ", () => {
      render(
        <OrderSummaryDisplay
          subtotal={400000}
          shipping={0}
          originalFee={30000}
          isFreeship={true}
        />
      );

      expect(screen.getByTestId("shipping-strikethrough")).toHaveTextContent("30.000 VNĐ");
      expect(screen.getByTestId("shipping-effective-price")).toHaveTextContent("0đ");
      expect(screen.getByTestId("shipping-auto-badge")).toHaveTextContent("Freeship tự động");
      expect(screen.queryByTestId("voucher-row")).not.toBeInTheDocument();
      expect(screen.getByTestId("total-amount")).toHaveTextContent("400.000 VNĐ");
    });
  });

  describe("Kịch bản 5: Nhãn hiển thị cho Voucher Vận chuyển (FREESHIP vs GIẢM SHIP vs short_name)", () => {
    it("5.1 Voucher ship không có max_discount -> hiển thị nhãn FREESHIP", () => {
      const fullFreeship = {
        id: 501,
        code: "FREESHIP_FULL",
        discount_type: "freeship" as const,
        value: 0,
        max_discount: null,
        is_freeship: true,
      };
      expect(getVoucherBadgeLabel(fullFreeship, true)).toBe("FREESHIP");
    });

    it("5.2 Voucher ship có max_discount = 25000 -> hiển thị nhãn GIẢM SHIP", () => {
      const cappedShip = {
        id: 502,
        code: "SHIP_CAP_25K",
        discount_type: "fixed" as const,
        value: 25000,
        max_discount: 25000,
        is_freeship: true,
      };
      expect(getVoucherBadgeLabel(cappedShip, true)).toBe("GIẢM SHIP");
    });

    it("5.3 Voucher ship có short_name từ CMS -> ưu tiên hiển thị short_name", () => {
      const customShip = {
        id: 503,
        code: "SHIP_CUSTOM",
        short_name: "Giảm 50% Ship",
        discount_type: "percent" as const,
        value: 50,
        max_discount: 25000,
        is_freeship: true,
      };
      expect(getVoucherBadgeLabel(customShip, true)).toBe("Giảm 50% Ship");
    });
  });
});
