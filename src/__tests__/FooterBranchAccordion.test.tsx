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

    const branchCards = mobileAccordion.querySelectorAll(".rounded-xl.border");
    const branch1Card = branchCards[0];
    const branch2Card = branchCards[1];

    // Branch 1 grid should be expanded (1fr), Branch 2 collapsed (0fr)
    const branch1Grid = branch1Card.querySelector(".grid");
    const branch2Grid = branch2Card.querySelector(".grid");
    expect(branch1Grid).toHaveClass("grid-rows-[1fr]");
    expect(branch2Grid).toHaveClass("grid-rows-[0fr]");

    // First branch address should be displayed
    const branch1Address = branch1Card.querySelector(".body-2.text-gray-300");
    expect(branch1Address).toHaveTextContent("Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội");

    // Directions link should be present with correct href
    const directionsLink = branch1Card.querySelector("a[href='https://maps.google.com/?q=branch1']");
    expect(directionsLink).toBeInTheDocument();
  });

  it("toggles branch accordion items on user click with CSS grid transitions", () => {
    const { container } = render(<Footer />);
    const mobileAccordion = container.querySelector(".block.md\\:hidden.space-y-2\\.5") as HTMLElement;
    expect(mobileAccordion).toBeInTheDocument();

    const branchCards = mobileAccordion.querySelectorAll(".rounded-xl.border");
    const branch1Card = branchCards[0];
    const branch2Card = branchCards[1];

    const buttons = mobileAccordion.querySelectorAll("button");
    const branch2Btn = buttons[1];
    expect(branch2Btn).toHaveAttribute("aria-expanded", "false");

    const branch1Grid = branch1Card.querySelector(".grid");
    const branch2Grid = branch2Card.querySelector(".grid");

    // Click to expand branch 2
    fireEvent.click(branch2Btn);
    expect(branch2Btn).toHaveAttribute("aria-expanded", "true");
    expect(branch2Grid).toHaveClass("grid-rows-[1fr]");
    expect(branch1Grid).toHaveClass("grid-rows-[0fr]");
    
    const branch2Content = branch2Card.querySelector(".body-2.text-gray-300");
    expect(branch2Content).toHaveTextContent("Số 10 Nguyễn Huệ, Quận 1, TP. HCM");

    // Click again to collapse branch 2
    fireEvent.click(branch2Btn);
    expect(branch2Btn).toHaveAttribute("aria-expanded", "false");
    expect(branch2Grid).toHaveClass("grid-rows-[0fr]");
  });
});
