import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Header from "@/components/Header";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: "vi" }),
}));

// Mock @/i18n/routing
vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock @/i18n/i18n-navigation
let currentMockPath = "/";
vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
  usePathname: () => currentMockPath,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "common.all": "Tất cả",
      "common.product": "Sản phẩm",
      "common.about": "Về chúng tôi",
      "common.policy": "Chính sách",
      "common.blog": "Tin tức",
      "common.contact": "Liên hệ",
      "common.search": "Tìm kiếm",
      "common.search_placeholder": "Nhập từ khóa tìm kiếm...",
      "common.account": "Tài khoản",
      "common.open_menu": "Mở menu",
      "common.close_menu": "Đóng menu",
      "cart.title": "Giỏ hàng",
      "button.order-now": "Đặt ngay",
      "button.order_now_count": "Đặt ngay ({count})",
    };
    return messages[key] || key;
  },
  useLocale: () => "vi",
}));

// Mock contexts
vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({
    hotline: "024.9999.7122",
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
  }),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
    totalItems: 0,
  }),
}));

// Mock search suggestions hook
vi.mock("@/hooks/useSearchSuggestions", () => ({
  useSearchSuggestions: () => ({
    productSuggestions: [],
    blogSuggestions: [],
    policySuggestions: [],
    isLoading: false,
    clearSuggestions: vi.fn(),
  }),
}));

// Mock subcomponents
vi.mock("@/components/LanguageSwitcher", () => ({
  default: () => <div data-testid="mock-lang-switcher" />,
}));
vi.mock("@/components/Header/CartPopup", () => ({
  default: () => null,
}));
vi.mock("@/components/Header/MobileCartFlow", () => ({
  default: () => null,
}));

describe("Header Menu & Search Mutual Exclusivity (STT 41)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockPath = "/";
  });

  it("opens mobile drawer menu and keeps search bar closed", () => {
    render(<Header />);

    const hamburgerBtn = screen.getByRole("button", { name: /mở menu/i });
    fireEvent.click(hamburgerBtn);

    // Mobile drawer should be open
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog.className).toContain("translate-x-0");

    // Search dropdown should remain closed (hidden / max-h-0)
    const searchDropdown = document.querySelector(".max-h-0");
    expect(searchDropdown).toBeInTheDocument();
  });

  it("automatically closes mobile menu when search is opened from mobile navbar", () => {
    render(<Header />);

    // 1. Open mobile menu
    const hamburgerBtn = screen.getByRole("button", { name: /mở menu/i });
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");

    // 2. Open search by clicking search button in mobile header
    const searchButtons = screen.getAllByRole("button", { name: /tìm kiếm/i });
    // searchButtons[1] is inside mobile navigation bar
    fireEvent.click(searchButtons[1] || searchButtons[0]);

    // Mobile menu should now be closed
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog.className).toContain("-translate-x-full");

    // Search bar should now be open
    const openSearchBar = document.querySelector(".max-h-\\[500px\\]");
    expect(openSearchBar).toBeInTheDocument();
  });

  it("automatically closes search overlay when hamburger menu is toggled open", () => {
    render(<Header />);

    // 1. Open search first
    const searchButtons = screen.getAllByRole("button", { name: /tìm kiếm/i });
    fireEvent.click(searchButtons[0]);

    const openSearchBar = document.querySelector(".max-h-\\[500px\\]");
    expect(openSearchBar).toBeInTheDocument();

    // 2. Click hamburger to open mobile menu
    const hamburgerBtn = screen.getByRole("button", { name: /mở menu/i });
    fireEvent.click(hamburgerBtn);

    // Mobile menu should now be open
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");

    // Search bar should now be closed
    const closedSearchBar = document.querySelector(".max-h-0");
    expect(closedSearchBar).toBeInTheDocument();
  });
});
