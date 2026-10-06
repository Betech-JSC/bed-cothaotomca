import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import OrderSuccessClient from "@/components/Checkout/OrderSuccessClient";
import ProfileDashboard from "@/components/Auth/ProfileDashboard";
import * as orderService from "@/services/orderService";
import { formatVietnamDateTime, isCodPayment } from "@/lib/format";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/order-success",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    const t = (key: string, params?: any) => {
      const translations: Record<string, string> = {
        title: "Đặt hàng thành công!",
        order_time: "Thời gian đặt hàng",
        receipt_info: "Thông tin nhận hàng",
        receiver: "Người nhận",
        phone: "Số điện thoại",
        delivery_address: "Địa chỉ giao hàng",
        payment_method: "Hình thức thanh toán",
        payment_cod: "Thanh toán khi nhận hàng (COD)",
        payment_transfer: "Chuyển khoản qua ngân hàng (TRANSFER)",
        shipping_fee: "Phí ship",
        total_payment: "Tổng thanh toán",
        cancel_order: "Hủy đơn hàng",
        cancel_order_15m: "Hủy đơn hàng (15m)",
        cancel_banner_desc: "Bạn có thể tự hủy đơn hàng trong vòng 15 phút nếu cần thay đổi món.",
        cancel_deadline: "Hạn chót:",
        cancel_modal_title: "Xác nhận hủy đơn hàng",
        cancel_modal_desc: "Bạn có chắc chắn muốn hủy đơn hàng này không?",
        cancel_reason_placeholder: "Nhập lý do hủy đơn hàng (không bắt buộc)...",
        confirm_cancel: "Xác nhận hủy",
        close: "Đóng",
        cancel_success: "Đã hủy đơn hàng thành công!",
        cancelled_status: "Đơn hàng đã được hủy",
        cancelled_at: "Thời gian hủy:",
        ordered_items: "Món đã chọn",
        continue_shopping: "Tiếp tục mua sắm",
        free: "Miễn phí",
        transaction_history: "Lịch sử giao dịch",
        order_date: "NGÀY GIAO DỊCH",
        order_code: "MÃ GIAO DỊCH",
        total_payment_label: "TỔNG TIỀN",
        account_label: "TÀI KHOẢN",
        tab_orders: "Đơn hàng của tôi",
      };
      return translations[key] || key;
    };
    t.rich = (key: string, values?: any) => {
      if (values?.link) {
        return values.link(values.hotline || "024.9999.7122");
      }
      return key;
    };
    return t;
  },
}));

vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({ hotline: "024.9999.7122" }),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    addToCart: vi.fn(),
    setIsCartOpen: vi.fn(),
  }),
}));

describe("COD Cancellation & Order Time Integration Tests", () => {
  const mockCodOrder = {
    order_code: "ORD-20261006-0001",
    status: "pending",
    sync_status: "pending",
    payment_status: "pending",
    created_at: "2026-10-06T07:30:00Z", // 14:30 GMT+7
    can_cancel: true,
    remaining_cancel_seconds: 900,
    cancel_window_expires_at: "2026-10-06T07:45:00Z", // 14:45 GMT+7
    is_cod: true,
    customer: {
      name: "Nguyễn Văn A",
      phone: "0901234567",
    },
    delivery_type: "delivery",
    delivery: {
      receiver: "Nguyễn Văn A",
      contact_number: "0901234567",
      address: "123 Đường Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh",
      price: "0",
    },
    payment: {
      method: "CASH",
      total_payment: "250000",
    },
    subtotal: "250000",
    discount: "0",
    total: "250000",
    items: [
      {
        product_id: 1,
        product_name: "Chả cá Thảo Tôm",
        quantity: 1,
        price: "250000",
        discount: "0",
      },
    ],
  };

  const mockTransferOrder = {
    ...mockCodOrder,
    order_code: "ORD-20261006-0002",
    is_cod: false,
    payment: {
      method: "TRANSFER",
      total_payment: "250000",
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Task 4.1 & 4.2: OrderSuccessClient renders Order Time in GMT+7 and COD 15m Countdown Banner", async () => {
    vi.spyOn(orderService, "getOrderByCode").mockResolvedValue(mockCodOrder as any);

    render(
      <OrderSuccessClient
        orderCode="ORD-20261006-0001"
        phone="0901234567"
        locale="vi"
      />
    );

    // Wait for order to load
    await waitFor(() => {
      expect(screen.getByText("Đặt hàng thành công!")).toBeInTheDocument();
    });

    // Verify 100% GMT+7 time in receipt info card: 07:30 UTC -> 14:30 06/10/2026
    expect(screen.getByText("14:30 06/10/2026")).toBeInTheDocument();

    // Verify COD 15m Countdown banner is displayed
    expect(screen.getByText("Hủy đơn hàng (15m)")).toBeInTheDocument();
    expect(screen.getByText(/14:59|15:00/)).toBeInTheDocument();
    expect(screen.getByText("14:45 06/10/2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hủy đơn hàng" })).toBeInTheDocument();
  });

  it("Task 4.2 (Negative): OrderSuccessClient does NOT render countdown banner for non-COD (TRANSFER) order", async () => {
    vi.spyOn(orderService, "getOrderByCode").mockResolvedValue(mockTransferOrder as any);

    render(
      <OrderSuccessClient
        orderCode="ORD-20261006-0002"
        phone="0901234567"
        locale="vi"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Đặt hàng thành công!")).toBeInTheDocument();
    });

    // Order time should still render
    expect(screen.getByText("14:30 06/10/2026")).toBeInTheDocument();

    // 15m Countdown banner must NOT be present
    expect(screen.queryByText("Hủy đơn hàng (15m)")).not.toBeInTheDocument();
  });

  it("Task 4.3: OrderSuccessClient opens cancellation modal, calls cancelOrderApi, and updates status realtime", async () => {
    vi.spyOn(orderService, "getOrderByCode").mockResolvedValue(mockCodOrder as any);
    const cancelApiMock = vi.spyOn(orderService, "cancelOrderApi").mockResolvedValue({
      message: "Hủy đơn hàng thành công",
      data: {
        ...mockCodOrder,
        status: "cancelled",
        cancelled_at: "2026-10-06T07:32:00Z",
        can_cancel: false,
      } as any,
    });

    render(
      <OrderSuccessClient
        orderCode="ORD-20261006-0001"
        phone="0901234567"
        locale="vi"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Hủy đơn hàng" })).toBeInTheDocument();
    });

    // Click "Hủy đơn hàng" button to open modal
    fireEvent.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));

    // Verify modal is open
    expect(screen.getByText("Xác nhận hủy đơn hàng")).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText("Nhập lý do hủy đơn hàng (không bắt buộc)...");
    expect(textarea).toBeInTheDocument();

    // Input cancellation reason
    fireEvent.change(textarea, { target: { value: "Đặt nhầm món" } });

    // Submit cancellation
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy" }));

    await waitFor(() => {
      expect(cancelApiMock).toHaveBeenCalledWith("ORD-20261006-0001", "0901234567", "Đặt nhầm món");
    });

    // Verify status updated to cancelled
    await waitFor(() => {
      expect(screen.getByText("Đơn hàng đã được hủy")).toBeInTheDocument();
    });
    expect(screen.getByText("14:32 06/10/2026")).toBeInTheDocument();
  });

  it("Task 5.1 & 5.2: ProfileDashboard renders order history with formatVietnamDateTime (HH:mm DD/MM/YYYY)", async () => {
    const mockUser = {
      id: 1,
      name: "Nguyễn Văn A",
      phone: "0901234567",
      email: "test@example.com",
      points: 150,
      dob: "1990-01-01",
      gender: "male",
    };

    const mockOrders = [
      {
        order_code: "ORD-20261006-0001",
        created_at: "2026-10-06T07:30:00Z", // 14:30 GMT+7
        status: "pending",
        total: "250000",
        items: [
          {
            product_name: "Chả cá Thảo Tôm",
            quantity: 1,
            price: "250000",
          },
        ],
      },
    ];

    // Mock global fetch for /api/user/orders
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/user/orders")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockOrders }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
    });

    render(
      <ProfileDashboard
        user={mockUser as any}
        onLogout={vi.fn()}
        updateProfile={vi.fn()}
        refreshUser={vi.fn()}
      />
    );

    // Verify formatted date & time in order history: 14:30 06/10/2026
    await waitFor(() => {
      expect(screen.getByText("14:30 06/10/2026")).toBeInTheDocument();
    });
    expect(screen.getByText("#ORD-20261006-0001")).toBeInTheDocument();
  });
});
