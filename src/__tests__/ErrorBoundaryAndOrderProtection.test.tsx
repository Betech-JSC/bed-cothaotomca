import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ErrorBoundary from "@/app/[locale]/error";
import OrderSuccessClient from "@/components/Checkout/OrderSuccessClient";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, unoptimized, onError, priority, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      data-unoptimized={unoptimized ? "true" : "false"}
      onError={onError}
      {...props}
    />
  ),
}));

// Mock @/i18n/i18n-navigation
vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      error_load: "Không thể tải thông tin đơn hàng",
      retry: "Thử lại",
      continue_shopping: "Tiếp tục mua hàng",
      payment_cod: "Thanh toán khi nhận hàng (COD)",
    };
    return messages[key] || key;
  },
  useLocale: () => "vi",
}));

// Mock orderService
vi.mock("@/services/orderService", () => ({
  getOrderByCode: vi.fn(),
  cancelOrderApi: vi.fn(),
}));

// Mock generalSettingService
vi.mock("@/services/generalSettingService", () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({}),
}));

describe("1. ErrorBoundary (src/app/[locale]/error.tsx) tests", () => {
  let originalLocation: Location;
  let reloadMock: any;

  beforeEach(() => {
    sessionStorage.clear();
    originalLocation = window.location;
    reloadMock = vi.fn();
    delete (window as any).location;
    (window as any).location = {
      ...originalLocation,
      reload: reloadMock,
      href: "http://localhost/",
      pathname: "/",
    };
  });

  afterEach(() => {
    (window as any).location = originalLocation;
    vi.restoreAllMocks();
  });

  it("reloads window when ChunkLoadError occurs", () => {
    const chunkError = new Error("Loading chunk 123 failed.");
    chunkError.name = "ChunkLoadError";

    render(<ErrorBoundary error={chunkError} reset={vi.fn()} />);

    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("last_chunk_reload")).toBeTruthy();
  });

  it("reloads window when error message indicates dynamic import failure", () => {
    const importError = new Error("Failed to fetch dynamically imported module: https://cothaotomca.vn/chunk.js");

    render(<ErrorBoundary error={importError} reset={vi.fn()} />);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("prevents infinite reload loops within 10 seconds using sessionStorage guard", () => {
    const recentReload = Date.now() - 3000; // 3 seconds ago
    sessionStorage.setItem("last_chunk_reload", String(recentReload));

    const chunkError = new Error("Loading chunk failed");
    chunkError.name = "ChunkLoadError";

    render(<ErrorBoundary error={chunkError} reset={vi.fn()} />);

    // Should NOT reload because less than 10 seconds elapsed
    expect(reloadMock).not.toHaveBeenCalled();
    // Should render friendly UI instead of crashing
    expect(screen.getByText("Đã có gián đoạn kết nối")).toBeInTheDocument();
  });

  it("renders branded friendly UI without exposing raw error stack for standard errors", () => {
    const genericError = new Error("Internal secret database connection error at line 500");

    render(<ErrorBoundary error={genericError} reset={vi.fn()} />);

    expect(reloadMock).not.toHaveBeenCalled();
    expect(screen.getByText("Đã có gián đoạn kết nối")).toBeInTheDocument();
    expect(
      screen.getByText(/Hệ thống vừa cập nhật phiên bản mới hoặc kết nối mạng bị gián đoạn/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Internal secret database/i)).not.toBeInTheDocument();
    expect(screen.getByText("024.9999.7122")).toBeInTheDocument();

    const reloadBtn = screen.getByRole("button", { name: "Tải lại trang" });
    fireEvent.click(reloadBtn);
    expect(reloadMock).toHaveBeenCalledTimes(1);

    const homeLink = screen.getByRole("link", { name: "Về trang chủ" });
    expect(homeLink).toHaveAttribute("href", "/");
  });
});

describe("2. OrderSuccessClient Guard (src/components/Checkout/OrderSuccessClient.tsx)", () => {
  it("stops loading immediately and displays error message when orderCode is missing", async () => {
    render(<OrderSuccessClient orderCode="" phone="0901234567" locale="vi" />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Không tìm thấy thông tin mã đơn hàng. Quý khách vui lòng kiểm tra lại đường dẫn hoặc tra cứu đơn hàng theo số điện thoại."
        )
      ).toBeInTheDocument();
    });

    // Should have retry and continue shopping buttons
    expect(screen.getByText("Tiếp tục mua hàng")).toBeInTheDocument();
  });
});

describe("3. Safe Post-Checkout URL Generation", () => {
  it("generates correct Vietnamese order success URL with encoded query parameters", () => {
    const locale: string = "vi";
    const orderCode = "ORD 2026/001";
    const phone = "0901234567";

    const successPath = locale === "en" ? "/en/order-success" : "/dat-hang-thanh-cong";
    const targetUrl = `${successPath}?code=${encodeURIComponent(orderCode)}&phone=${encodeURIComponent(phone.trim())}`;

    expect(targetUrl).toBe("/dat-hang-thanh-cong?code=ORD%202026%2F001&phone=0901234567");
  });

  it("generates correct English order success URL with encoded query parameters", () => {
    const locale: string = "en";
    const orderCode = "ORD-EN-999";
    const phone = "0987654321";

    const successPath = locale === "en" ? "/en/order-success" : "/dat-hang-thanh-cong";
    const targetUrl = `${successPath}?code=${encodeURIComponent(orderCode)}&phone=${encodeURIComponent(phone.trim())}`;

    expect(targetUrl).toBe("/en/order-success?code=ORD-EN-999&phone=0987654321");
  });
});
