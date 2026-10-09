import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import MobileBackButton from "@/components/Common/MobileBackButton";

const mockBack = vi.fn();
const mockPush = vi.fn();

// Mock @/i18n/routing
vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      back: "Quay lại",
    };
    return messages[key] || key;
  },
}));

describe("MobileBackButton Component (STT 43)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with lg:hidden wrapper and default localized label", () => {
    const { container } = render(<MobileBackButton fallbackUrl="/product" />);

    const wrapper = container.querySelector(".lg\\:hidden");
    expect(wrapper).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Quay lại" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Quay lại");
  });

  it("renders custom label when provided", () => {
    render(<MobileBackButton fallbackUrl="/blog" label="Quay lại danh mục" />);

    const button = screen.getByRole("button", { name: "Quay lại danh mục" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Quay lại danh mục");
  });

  it("navigates back via router.back() when history length > 1", () => {
    Object.defineProperty(window, "history", {
      writable: true,
      value: { length: 3 },
    });

    render(<MobileBackButton fallbackUrl="/product" />);

    const button = screen.getByRole("button", { name: "Quay lại" });
    fireEvent.click(button);

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to fallbackUrl via router.push() when history length <= 1", () => {
    Object.defineProperty(window, "history", {
      writable: true,
      value: { length: 1 },
    });

    render(<MobileBackButton fallbackUrl="/blog" />);

    const button = screen.getByRole("button", { name: "Quay lại" });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith("/blog");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
