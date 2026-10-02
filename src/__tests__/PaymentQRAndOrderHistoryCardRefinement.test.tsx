import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import PaymentQRScreen from "@/components/Checkout/PaymentQRScreen";
import ProfileDashboard from "@/components/Auth/ProfileDashboard";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import { useOrderStatus } from "@/hooks/useOrderStatus";

// Mock router and pathname
const mockPush = vi.fn();
let mockCurrentPathname = "/";

vi.mock("@/i18n/routing", () => ({
  Link: ({ href, children, ...props }: any) => {
    const hrefStr = typeof href === "object" ? `${href.pathname}?${new URLSearchParams(href.query).toString()}` : href;
    return <a href={hrefStr} {...props}>{children}</a>;
  },
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  usePathname: () => mockCurrentPathname,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockCurrentPathname,
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t: any = (key: string) => {
      const map: Record<string, string> = {
        "qr.title": "Quét mã để thanh toán",
        "qr.bank_info_title": "Thông tin chuyển khoản",
        "qr.bank_name": "Ngân hàng",
        "qr.account_number": "Số tài khoản",
        "qr.account_holder": "Chủ tài khoản",
        "qr.amount": "Số tiền",
        "qr.content": "Nội dung CK",
        "qr.download_btn": "Lưu mã QR",
        "qr.cancel_back": "Hủy giao dịch",
        "qr.waiting_payment": "Đang chờ thanh toán...",
        "qr.payment_received": "Thanh toán thành công!",
        "order_code": "MÃ GIAO DỊCH",
        "order_date": "NGÀY GIAO DỊCH",
        "view_details": "Xem chi tiết",
        "hide_details": "Thu gọn",
        "reorder": "Mua lại",
        "status_pending_confirmation": "Chờ xác nhận",
      };
      return map[key] || key;
    };
    t.rich = (key: string) => key;
    return t;
  },
}));

vi.mock("@/hooks/useOrderStatus", () => ({
  useOrderStatus: vi.fn(),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    cartItems: [],
    subtotal: 0,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    hasOutOfStockItems: false,
    setIsCartOpen: vi.fn(),
    isCartOpen: true,
  }),
}));

vi.mock("@/contexts/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/AuthContext")>();
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 1,
        name: "Nguyễn Văn A",
        email: "test@example.com",
        phone: "0901234567",
        status: "active",
      },
      token: "mock-token",
      loading: false,
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

vi.mock("@/contexts/BranchContext", () => ({
  useBranches: () => ({
    branches: [],
    selectedBranch: null,
    setSelectedBranch: vi.fn(),
  }),
}));

vi.mock("@/services/authService", () => ({
  getCachedCustomerAddresses: vi.fn().mockReturnValue([]),
  setCachedCustomerAddresses: vi.fn(),
  clearCachedCustomerAddresses: vi.fn(),
  getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
  createCustomerAddressApi: vi.fn().mockResolvedValue({}),
  updateCustomerAddressApi: vi.fn().mockResolvedValue({}),
  deleteCustomerAddressApi: vi.fn().mockResolvedValue({}),
  setDefaultCustomerAddressApi: vi.fn().mockResolvedValue({}),
  changePasswordApi: vi.fn().mockResolvedValue({}),
}));

const mockOrders = [
  {
    order_code: "ORD-021026-0004",
    created_at: "2026-10-02T10:30:00Z",
    status: "pending",
    total: 250000,
    items: [
      {
        product_id: 1,
        product_name: "Cơm thố bò xào",
        quantity: 2,
        price: 125000,
      },
    ],
  },
];

global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url && url.includes("/user/orders")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ data: mockOrders }),
    });
  }
  return Promise.resolve({
    ok: true,
    json: async () => ({}),
  });
});

describe("VẤN ĐỀ 1: PaymentQRScreen onSuccess Callback & MobileCartFlow Safety Net", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentPathname = "/";
  });

  const mockOrderData: any = {
    order_code: "ORD-99999",
    status: "pending",
    payment_status: "pending",
    subtotal: 100000,
    total: 100000,
    expire_at: new Date(Date.now() + 600000).toISOString(),
    qr_url: "https://img.vietqr.io/image/MB-0123456789-compact2.png",
    qr_info: {
      bank_code: "MB",
      bank_account: "0123456789",
      account_name: "CÔ THẢO TÔM CÁ",
      amount: 100000,
      content: "ORD-99999",
    },
  };

  it("calls onSuccess and redirects to /order-success when payment_status becomes 'paid'", async () => {
    const handleSuccess = vi.fn();
    (useOrderStatus as any).mockReturnValue({
      data: { payment_status: "paid", status: "pending" },
      isLoading: false,
      error: null,
      isSettled: false,
    });

    render(
      <PaymentQRScreen
        orderData={mockOrderData}
        phone="0901234567"
        onSuccess={handleSuccess}
      />
    );

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/order-success",
      query: { code: "ORD-99999", phone: "0901234567" },
    });
  });

  it("calls onSuccess when status becomes 'synced'", async () => {
    const handleSuccess = vi.fn();
    (useOrderStatus as any).mockReturnValue({
      data: { payment_status: "pending", status: "synced" },
      isLoading: false,
      error: null,
      isSettled: true,
    });

    render(
      <PaymentQRScreen
        orderData={mockOrderData}
        phone="0901234567"
        onSuccess={handleSuccess}
      />
    );

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/order-success",
      query: { code: "ORD-99999", phone: "0901234567" },
    });
  });

  it("MobileCartFlow safety net: invokes onClose when navigating to /order-success", async () => {
    const handleClose = vi.fn();
    mockCurrentPathname = "/order-success";

    render(<MobileCartFlow onClose={handleClose} inline={false} />);

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled();
    });
  });
});

describe("VẤN ĐỀ 2: Card Lịch sử giao dịch trong ProfileDashboard", () => {
  const dummyUser: any = {
    id: 1,
    name: "Nguyễn Văn A",
    phone: "0901234567",
    email: "test@example.com",
    points: 120,
    tier: "gold",
    status: "active",
  };

  it("renders order code with whitespace-nowrap and responsive text size", async () => {
    render(
      <ProfileDashboard
        user={dummyUser}
        onLogout={vi.fn()}
        updateProfile={vi.fn().mockResolvedValue({ success: true })}
        refreshUser={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("#ORD-021026-0004")).toBeInTheDocument();
    });

    const codeEl = screen.getByText("#ORD-021026-0004");
    expect(codeEl.className).toContain("whitespace-nowrap");
    expect(codeEl.className).toContain("text-xs");
    expect(codeEl.className).toContain("sm:text-sm");
    expect(codeEl.className).toContain("md:text-base");
    expect(codeEl.className).toContain("font-mono");
    expect(codeEl.className).toContain("text-primary");
  });

  it("renders status badge in Row 1 next to order date in a flex container", async () => {
    render(
      <ProfileDashboard
        user={dummyUser}
        onLogout={vi.fn()}
        updateProfile={vi.fn().mockResolvedValue({ success: true })}
        refreshUser={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Chờ xác nhận")).toBeInTheDocument();
    });

    const statusBadge = screen.getByText("Chờ xác nhận");
    // Find the container around date and status badge
    const badgeContainer = statusBadge.closest("div.flex");
    expect(badgeContainer).toBeInTheDocument();
    expect(badgeContainer?.className).toContain("items-center");
    expect(badgeContainer?.className).toContain("gap-2");
    expect(badgeContainer?.className).toContain("flex-wrap");
    expect(badgeContainer?.className).toContain("sm:flex-nowrap");
  });

  it("renders Row 2 with action buttons aligned to the right (justify-end)", async () => {
    render(
      <ProfileDashboard
        user={dummyUser}
        onLogout={vi.fn()}
        updateProfile={vi.fn().mockResolvedValue({ success: true })}
        refreshUser={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Xem chi tiết")).toBeInTheDocument();
      expect(screen.getByText("Mua lại")).toBeInTheDocument();
    });

    const viewDetailsBtn = screen.getByText("Xem chi tiết").closest("button");
    const actionsRow = viewDetailsBtn?.parentElement;
    expect(actionsRow).toBeInTheDocument();
    expect(actionsRow?.className).toContain("justify-end");
    expect(actionsRow?.className).toContain("flex");
    expect(actionsRow?.className).toContain("border-t");

    // Ensure status badge is NOT inside Row 2
    expect(actionsRow?.querySelector(".bg-secondary\\/15")).toBeNull();
  });
});
