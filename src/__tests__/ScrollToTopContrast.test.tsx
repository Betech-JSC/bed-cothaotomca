import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ScrollToTop from "@/components/ScrollToTop";
import FixedSocial from "@/components/FixedSocial";
import FloatingVoucherButton from "@/components/Voucher/FloatingVoucherButton";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock routing
vi.mock("@/i18n/routing", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock contexts
vi.mock("@/components/Voucher/CouponModal", () => ({
  default: () => null,
}));

vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({
    hotline: "024.9999.7122",
    link_facebook: "https://m.me/cothaotomca",
    link_zalo: "https://zalo.me/cothaotomca",
  }),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    subtotal: 100000,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    customer: null,
  }),
}));

// Mock order & campaign services
vi.mock("@/services/orderService", () => ({
  getAvailableVouchers: vi.fn().mockResolvedValue([]),
  getShippingSettings: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/campaignService", () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
}));

describe("Floating Buttons & Contrast Suite (STT 1 & STT 2)", () => {
  it("hides FloatingVoucherButton on mobile viewports via hidden lg:block", () => {
    const { container } = render(<FloatingVoucherButton />);
    const desktopWrapper = container.querySelector(".hidden.lg\\:block");
    expect(desktopWrapper).toBeInTheDocument();
  });

  it("hides ScrollToTop and FixedSocial on mobile viewports via hidden lg:block", () => {
    const { container: scrollContainer } = render(<ScrollToTop />);
    const scrollDesktopWrapper = scrollContainer.querySelector(".hidden.lg\\:block");
    expect(scrollDesktopWrapper).toBeInTheDocument();

    const { container: socialContainer } = render(<FixedSocial />);
    const socialDesktopWrapper = socialContainer.querySelector(".hidden.lg\\:block");
    expect(socialDesktopWrapper).toBeInTheDocument();
  });

  it("applies border border-white/40 ring-1 ring-white/20 shadow-lg to all circular buttons in ScrollToTop", () => {
    render(<ScrollToTop />);

    // Trigger scroll visibility for scroll to top button
    fireEvent.scroll(window, { target: { pageYOffset: 500 } });

    // Find all circular action buttons (Hotline, Messenger, Zalo)
    const hotlineLink = screen.getByLabelText("Hotline");
    const messengerLink = screen.getByLabelText("Messenger");
    const zaloLink = screen.getByLabelText("Zalo");

    [hotlineLink, messengerLink, zaloLink].forEach((btn) => {
      expect(btn).toBeInTheDocument();
      expect(btn.className).toContain("border");
      expect(btn.className).toContain("border-white/40");
      expect(btn.className).toContain("ring-1");
      expect(btn.className).toContain("ring-white/20");
      expect(btn.className).toContain("shadow-lg");
      expect(btn.className).toContain("hover:border-white/80");
    });
  });
});
