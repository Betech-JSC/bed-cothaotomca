import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Footer from "@/components/Footer";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "footer.showroom": "Hệ thống cửa hàng",
      "footer.branch": "Chi nhánh",
      "footer.directions": "Chỉ đường trên Google Maps",
      "footer.bct_verification": "Đã thông báo Bộ Công Thương",
      "button.message-now": "Nhắn tin ngay",
      "orderLookup.title": "Tra cứu đơn hàng",
    };
    return messages[key] || key;
  },
}));

// Mock navigation
vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
  usePathname: () => "/",
}));

// Mock GeneralSettings & Branch Contexts
vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({
    hotline: "024.9999.7122",
    link_facebook: "https://m.me/cothaotomca",
  }),
}));

const mockBranches = [
  {
    id: 1,
    sort_order: 1,
    image: "/images/branch-1.jpg",
    address: "Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội",
    hotline: "024.9999.7122",
    address_link: "https://maps.google.com/?q=branch1",
  },
  {
    id: 2,
    sort_order: 2,
    image: "/images/branch-2.jpg",
    address: "Số 10 Nguyễn Huệ, Quận 1, TP. HCM",
    hotline: "028.9999.7122",
    address_link: "https://maps.google.com/?q=branch2",
  },
];

vi.mock("@/contexts/BranchContext", () => ({
  useBranches: () => mockBranches,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

describe("Footer Branch Mobile Accordion Suite (STT 3)", () => {
  it("renders both mobile accordion (block md:hidden) and desktop grid (hidden md:grid)", () => {
    const { container } = render(<Footer />);

    const mobileAccordion = container.querySelector(".block.md\\:hidden.space-y-2\\.5");
    expect(mobileAccordion).toBeInTheDocument();

    const desktopGrid = container.querySelector(".hidden.md\\:grid");
    expect(desktopGrid).toBeInTheDocument();
  });

  it("opens first branch by default in mobile accordion and displays address & directions link", () => {
    const { container } = render(<Footer />);
    const mobileAccordion = container.querySelector(".block.md\\:hidden.space-y-2\\.5") as HTMLElement;
    expect(mobileAccordion).toBeInTheDocument();

    // First branch address should be displayed in mobile accordion
    const branch1Address = mobileAccordion.querySelector(".body-2.text-gray-300");
    expect(branch1Address).toHaveTextContent("Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội");

    // Directions link should be present with correct href
    const directionsLink = mobileAccordion.querySelector("a[href='https://maps.google.com/?q=branch1']");
    expect(directionsLink).toBeInTheDocument();
  });

  it("toggles branch accordion items on user click", () => {
    const { container } = render(<Footer />);
    const mobileAccordion = container.querySelector(".block.md\\:hidden.space-y-2\\.5") as HTMLElement;
    expect(mobileAccordion).toBeInTheDocument();

    // Find header for branch 2 within mobile accordion
    const buttons = mobileAccordion.querySelectorAll("button");
    const branch2Btn = buttons[1];
    expect(branch2Btn).toHaveAttribute("aria-expanded", "false");

    // Click to expand branch 2
    fireEvent.click(branch2Btn);
    expect(branch2Btn).toHaveAttribute("aria-expanded", "true");
    
    const branch2Content = mobileAccordion.querySelector(".body-2.text-gray-300");
    expect(branch2Content).toHaveTextContent("Số 10 Nguyễn Huệ, Quận 1, TP. HCM");

    // Click again to collapse branch 2
    fireEvent.click(branch2Btn);
    expect(branch2Btn).toHaveAttribute("aria-expanded", "false");
  });
});
