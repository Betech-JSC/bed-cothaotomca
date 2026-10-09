import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import MobileSpeedDialFab from "@/components/Common/MobileSpeedDialFab";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "vi",
}));

// Mock routing pathname
let mockPathname = "/";
vi.mock("@/i18n/routing", () => ({
  usePathname: () => mockPathname,
  Link: ({ children, href, ...props }: any) => (
    <a href={typeof href === "string" ? href : "/"} {...props}>
      {children}
    </a>
  ),
}));

// Mock services
vi.mock("@/services/orderService", () => ({
  getAvailableVouchers: vi.fn().mockResolvedValue([
    { id: 1, code: "GIAM10", discount_amount: 10000, min_order_amount: 50000 },
  ]),
  getShippingSettings: vi.fn().mockResolvedValue({
    is_min_amount_enabled: true,
    card_title: "Freeship",
  }),
}));

vi.mock("@/services/campaignService", () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([
    { id: 101, title: "Khuyến mãi hè", discount_value: 20 },
  ]),
}));

// Mock contexts
vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({
    hotline: "024.9999.7122",
    link_facebook: "https://m.me/cothaotomca",
    link_zalo: "https://zalo.me/cothaotomca",
  }),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    subtotal: 200000,
  }),
}));

// Mock CouponModal to verify triggering
vi.mock("@/components/Voucher/CouponModal", () => ({
  default: ({ isOpen, onClose, isBrowseOnly }: any) =>
    isOpen ? (
      <div data-testid="mock-coupon-modal">
        <span>Coupon Modal Browse Mode</span>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

describe("MobileSpeedDialFab Component (STT 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
  });

  it("renders Master FAB button with lg:hidden container on regular storefront pages", async () => {
    const { container } = render(<MobileSpeedDialFab />);
    
    // Check Master FAB button exists
    const fabBtn = screen.getByRole("button", { name: /mở menu liên hệ/i });
    expect(fabBtn).toBeInTheDocument();
    expect(fabBtn).toHaveAttribute("aria-expanded", "false");

    // The container should have lg:hidden class
    const floatingContainer = container.querySelector(".lg\\:hidden");
    expect(floatingContainer).toBeInTheDocument();
  });

  it("excludes rendering on /cart and /checkout routes", () => {
    mockPathname = "/cart";
    const { container: cartContainer } = render(<MobileSpeedDialFab />);
    expect(cartContainer.firstChild).toBeNull();

    mockPathname = "/checkout";
    const { container: checkoutContainer } = render(<MobileSpeedDialFab />);
    expect(checkoutContainer.firstChild).toBeNull();

    mockPathname = "/vi/checkout";
    const { container: localeCheckoutContainer } = render(<MobileSpeedDialFab />);
    expect(localeCheckoutContainer.firstChild).toBeNull();
  });

  it("displays promotion badge when promotions are active", async () => {
    render(<MobileSpeedDialFab />);

    await waitFor(() => {
      // Badge animation element should be rendered when promotions > 0
      const pingDot = document.querySelector(".animate-ping");
      expect(pingDot).toBeInTheDocument();
    });
  });

  it("expands action list on tap and allows opening CouponModal", async () => {
    render(<MobileSpeedDialFab />);

    const fabBtn = screen.getByRole("button", { name: /mở menu liên hệ/i });
    fireEvent.click(fabBtn);

    // After click, aria-expanded should be true
    expect(fabBtn).toHaveAttribute("aria-expanded", "true");

    // Actions should be visible
    expect(screen.getByLabelText("Gọi hotline")).toBeInTheDocument();
    expect(screen.getByLabelText("Chat Zalo")).toBeInTheDocument();
    expect(screen.getByLabelText("Nhắn tin Facebook")).toBeInTheDocument();
    
    const voucherAction = screen.getByLabelText("Xem ưu đãi và khuyến mãi");
    expect(voucherAction).toBeInTheDocument();

    // Click on CouponModal action
    fireEvent.click(voucherAction);

    // Coupon modal should open, and Speed Dial should collapse
    expect(screen.getByTestId("mock-coupon-modal")).toBeInTheDocument();
    expect(fabBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("closes Speed Dial when tapping on backdrop", () => {
    render(<MobileSpeedDialFab />);

    const fabBtn = screen.getByRole("button", { name: /mở menu liên hệ/i });
    fireEvent.click(fabBtn);
    expect(fabBtn).toHaveAttribute("aria-expanded", "true");

    // Backdrop should exist
    const backdrop = document.querySelector(".bg-black\\/40");
    expect(backdrop).toBeInTheDocument();

    // Click backdrop
    fireEvent.click(backdrop!);
    expect(fabBtn).toHaveAttribute("aria-expanded", "false");
  });
});
