import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import OrderLookupClient from "@/components/Order/OrderLookupClient";
import ProfileDashboard from "@/components/Auth/ProfileDashboard";
import GiftSelectorModal from "@/components/Checkout/GiftSelectorModal";
import MobileSpeedDialFab from "@/components/Common/MobileSpeedDialFab";
import CouponModal from "@/components/Voucher/CouponModal";
import * as orderService from "@/services/orderService";
import * as generalSettingService from "@/services/generalSettingService";

// Mock next/navigation
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/tra-cuu-don-hang",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock next-intl
vi.mock("next-intl", () => {
  const handler = (key: string, values?: any) => {
    const translations: Record<string, string> = {
      title: "Tra cứu đơn hàng",
      not_found: "Không tìm thấy đơn hàng",
      validation_error: "Vui lòng nhập mã đơn hàng hoặc số điện thoại",
      cancel_order: "Hủy đơn hàng",
      cancel_request: "Gửi yêu cầu hủy đơn",
      cancel_modal_title: "Xác nhận hủy đơn hàng",
      cancel_modal_desc: "Bạn có chắc chắn muốn hủy đơn hàng này không?",
      phone_placeholder: "Nhập số điện thoại",
      cancel_reason_placeholder: "Nhập lý do hủy đơn (bắt buộc với đơn đã thanh toán)",
      confirm_cancel: "Xác nhận hủy",
      close: "Đóng",
      total: "Tổng thanh toán",
      ordered_items: "Món đã chọn",
      cancel: "Hủy đơn",
      reorder: "Mua lại",
      reorder_this_order: "Đặt lại đơn này",
      default_title: "Chọn quà tặng",
      available_gifts: `Quà tặng khả dụng (${values?.count ?? 0})`,
      view_all: "Tất cả",
      view_details: "Xem chi tiết",
      hide_details: "Thu gọn",
      system_shipping_discount_active: "Đã có trợ giá vận chuyển",
    };
    return translations[key] || key;
  };
  handler.rich = (key: string) => key;
  return {
    useTranslations: () => handler,
    useLocale: () => "vi",
  };
});

vi.mock("next-intl/middleware", () => ({
  default: () => vi.fn(),
}));

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["vi", "en"], defaultLocale: "vi" },
  Link: ({ href, children, ...props }: any) => <a href={typeof href === "string" ? href : href?.pathname} {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/tra-cuu-don-hang",
}));

vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ href, children, ...props }: any) => <a href={typeof href === "string" ? href : href?.pathname} {...props}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/tra-cuu-don-hang",
}));

vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => ({ hotline: "024.9999.7122" }),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    cartItems: [],
    subtotal: 0,
    addToCart: vi.fn(),
    setIsCartOpen: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Khách VIP", phone: "0912345678", email: "vip@example.com" },
    token: "mock-jwt-token",
  }),
  getMemberTier: () => "GOLD",
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

describe("UI Flow & Vitest Regression Audit (Opus 5.5)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSearchParams = new URLSearchParams();
    localStorage.clear();
    vi.spyOn(generalSettingService, "getGeneralSettings").mockResolvedValue({ hotline: "024.9999.7122" } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // -------------------------------------------------------------
  // LUỒNG A: Hook Safety & Isolation Tests (React Rules of Hooks)
  // -------------------------------------------------------------
  describe("Luồng A: Component Rendering Safety with useLocaleHook & useSearchParamsHook", () => {
    it("A1: GiftSelectorModal renders safely without crashing when open", () => {
      const mockGiftItem = {
        id: 101,
        product_name: "Canh rong biển tặng kèm",
        product_name_en: "Seaweed Soup Gift",
        campaign_price: 0,
        price: "0",
        image: "/soup.jpg",
        is_available: true,
      };

      render(
        <GiftSelectorModal
          isOpen={true}
          onClose={vi.fn()}
          selectedId={null}
          items={[mockGiftItem as any]}
          onSelect={vi.fn()}
        />
      );

      expect(screen.getByText("Canh rong biển tặng kèm")).toBeInTheDocument();
      expect(screen.getByText(/Quà tặng khả dụng/)).toBeInTheDocument();
    });

    it("A2: MobileSpeedDialFab renders safely and cleanly without hook crashes", () => {
      const { container } = render(<MobileSpeedDialFab />);
      expect(container).toBeInTheDocument();
    });

    it("A3: CouponModal renders safely when isOpen={true}", async () => {
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={200000}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // LUỒNG B: OrderLookupClient Normal & Edge Cases
  // -------------------------------------------------------------
  describe("Luồng B: OrderLookupClient Cancellation & Phone Verification Flow", () => {
    const mockMaskedGuestOrder = {
      order_code: "ORD-GUEST-1234",
      status: "pending",
      sync_status: "pending",
      payment_status: "pending",
      can_cancel: true,
      remaining_cancel_seconds: 600,
      cancel_window_expires_at: "2026-11-01T12:00:00Z",
      customer: {
        name: "Khách Vãng Lai",
        phone: "091****678", // Masked by Backend
      },
      delivery_type: "delivery",
      delivery: {
        receiver: "Khách Vãng Lai",
        contact_number: "091****678", // Masked
        address: "123 Đường ABC, Phường X, Quận Y",
        price: "15000",
      },
      payment: {
        method: "CASH",
        total_payment: "150000",
      },
      subtotal: "135000",
      total: "150000",
      items: [
        {
          product_name: "Cơm Thố Xá Xíu",
          quantity: 1,
          price: "135000",
        },
      ],
    };

    it("Case B1: Guest checkout redirects to /tra-cuu-don-hang?code=ORD-... (Masked Phone) -> Prompt phone input in modal and cancel successfully", async () => {
      mockSearchParams = new URLSearchParams("code=ORD-GUEST-1234");
      vi.spyOn(orderService, "lookupOrders").mockResolvedValue([mockMaskedGuestOrder as any]);
      const cancelApiMock = vi.spyOn(orderService, "cancelOrderApi").mockResolvedValue({
        message: "Hủy đơn hàng thành công",
        data: {
          ...mockMaskedGuestOrder,
          status: "cancelled",
          customer: {
            name: "Khách Vãng Lai",
            phone: "0912345678", // Backend returns unmasked on cancel
          },
          can_cancel: false,
        } as any,
      });

      render(<OrderLookupClient />);

      // Order details load
      await waitFor(() => {
        expect(screen.getByText(/ORD-GUEST-1234/)).toBeInTheDocument();
        expect(screen.getByText("Cơm Thố Xá Xíu")).toBeInTheDocument();
      });

      // Verify cancellation button is present
      const cancelBtn = screen.getByRole("button", { name: "Hủy đơn hàng" });
      expect(cancelBtn).toBeInTheDocument();

      // Open cancel modal
      fireEvent.click(cancelBtn);

      // Verify modal is open and shows phone verification input because phone is masked
      expect(screen.getByText("Xác nhận hủy đơn hàng")).toBeInTheDocument();
      const phoneInput = screen.getByLabelText(/Số điện thoại đặt hàng/i);
      expect(phoneInput).toBeInTheDocument();

      // Attempt submit without phone -> Should show error and NOT call API
      const confirmBtn = screen.getByRole("button", { name: "Xác nhận hủy" });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/Vui lòng nhập số điện thoại đặt hàng để xác thực hủy đơn/i)).toBeInTheDocument();
      });
      expect(cancelApiMock).not.toHaveBeenCalled();

      // Enter valid phone and submit
      fireEvent.change(phoneInput, { target: { value: "0912345678" } });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(cancelApiMock).toHaveBeenCalledWith("ORD-GUEST-1234", "0912345678", undefined);
      });

      // Status updated to cancelled, countdown and cancel button should disappear
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "Hủy đơn hàng" })).not.toBeInTheDocument();
      });
    });

    it("Case B2: Lookup by Phone (orderList displayed) -> Select an order -> Cancel modal should NOT ask for phone again", async () => {
      const orderInList = {
        ...mockMaskedGuestOrder,
        order_code: "ORD-LIST-001",
        customer: { name: "Khách SĐT", phone: "0912345678" },
      };

      // User enters phone and clicks lookup
      vi.spyOn(orderService, "lookupOrders").mockResolvedValue([orderInList as any]);
      const cancelApiMock = vi.spyOn(orderService, "cancelOrderApi").mockResolvedValue({
        message: "Hủy đơn hàng thành công",
        data: { ...orderInList, status: "cancelled", can_cancel: false } as any,
      });

      render(<OrderLookupClient />);

      // Enter phone in the lookup form
      const searchPhoneInput = screen.getByPlaceholderText(/Nhập số điện thoại/i);
      fireEvent.change(searchPhoneInput, { target: { value: "0912345678" } });

      const searchForm = searchPhoneInput.closest("form")!;
      fireEvent.submit(searchForm);

      // Wait for recent orders list to be displayed with view_details button
      await waitFor(() => {
        expect(screen.getByText(/ORD-LIST-001/)).toBeInTheDocument();
      });

      // User clicks "Xem chi tiết" (view_details) to select the order
      const viewDetailsBtn = screen.getByRole("button", { name: "Xem chi tiết" });
      fireEvent.click(viewDetailsBtn);

      // Now order detail is selected, click "Hủy đơn hàng"
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Hủy đơn hàng" })).toBeInTheDocument();
      });
      const cancelBtn = screen.getByRole("button", { name: "Hủy đơn hàng" });
      fireEvent.click(cancelBtn);

      // Verify cancel modal is open
      expect(screen.getByText("Xác nhận hủy đơn hàng")).toBeInTheDocument();

      // IMPORTANT: Since user ALREADY searched by unmasked phone "0912345678",
      // the modal MUST NOT prompt for phone input again!
      expect(screen.queryByLabelText(/Số điện thoại đặt hàng/i)).not.toBeInTheDocument();

      // Confirm cancel directly
      const confirmBtn = screen.getByRole("button", { name: "Xác nhận hủy" });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(cancelApiMock).toHaveBeenCalledWith("ORD-LIST-001", "0912345678", undefined);
      });
    });

    it("Case B3: Authenticated user with auth_token visits /tra-cuu-don-hang?code=... (Unmasked Phone from Backend) -> No phone prompt in modal", async () => {
      localStorage.setItem("auth_token", "valid-sanctum-token");
      mockSearchParams = new URLSearchParams("code=ORD-AUTH-001");

      const unmaskedAuthOrder = {
        ...mockMaskedGuestOrder,
        order_code: "ORD-AUTH-001",
        customer: {
          name: "Chủ Đơn Hàng VIP",
          phone: "0988888888", // Unmasked because token belongs to owner
        },
      };

      vi.spyOn(orderService, "lookupOrders").mockResolvedValue([unmaskedAuthOrder as any]);
      const cancelApiMock = vi.spyOn(orderService, "cancelOrderApi").mockResolvedValue({
        message: "Hủy thành công",
        data: { ...unmaskedAuthOrder, status: "cancelled", can_cancel: false } as any,
      });

      render(<OrderLookupClient />);

      await waitFor(() => {
        expect(screen.getByText(/ORD-AUTH-001/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));

      // Because order.customer.phone is unmasked ("0988888888"), no extra phone input is needed
      expect(screen.queryByLabelText(/Số điện thoại đặt hàng/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy" }));

      await waitFor(() => {
        expect(cancelApiMock).toHaveBeenCalledWith("ORD-AUTH-001", "0988888888", undefined);
      });
    });

    it("Case B4: User inputs phone with spaces or country code (+84) into cancel modal -> Passes validation and forwarded to API", async () => {
      mockSearchParams = new URLSearchParams("code=ORD-GUEST-1234");
      vi.spyOn(orderService, "lookupOrders").mockResolvedValue([mockMaskedGuestOrder as any]);
      const cancelApiMock = vi.spyOn(orderService, "cancelOrderApi").mockResolvedValue({
        message: "Hủy đơn hàng thành công",
        data: { ...mockMaskedGuestOrder, status: "cancelled" } as any,
      });

      render(<OrderLookupClient />);

      await waitFor(() => {
        expect(screen.getByText(/ORD-GUEST-1234/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));

      const phoneInput = screen.getByLabelText(/Số điện thoại đặt hàng/i);
      // User inputs phone with country code and spaces
      fireEvent.change(phoneInput, { target: { value: "  +84 912 345 678  " } });

      fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy" }));

      await waitFor(() => {
        expect(cancelApiMock).toHaveBeenCalledWith("ORD-GUEST-1234", "+84 912 345 678", undefined);
      });
    });

    it("Case B5: Online Paid order (TRANSFER) -> Renders 'Gửi yêu cầu hủy đơn', requires reason, calls requestCancelOrderApi", async () => {
      mockSearchParams = new URLSearchParams("code=ORD-PAID-001");
      const onlinePaidOrder = {
        ...mockMaskedGuestOrder,
        order_code: "ORD-PAID-001",
        payment: {
          method: "TRANSFER",
          status: "paid",
          total_payment: "200000",
        },
        payment_status: "paid",
        can_cancel: false, // Backend flag for instant cancel is false
        remaining_cancel_seconds: 500, // but within 15m window
      };

      vi.spyOn(orderService, "lookupOrders").mockResolvedValue([onlinePaidOrder as any]);
      const requestCancelApiMock = vi.spyOn(orderService, "requestCancelOrderApi").mockResolvedValue({
        message: "Đã gửi yêu cầu hủy đơn thành công",
        data: { ...onlinePaidOrder, status: "cancel_requested" } as any,
      });

      render(<OrderLookupClient />);

      await waitFor(() => {
        expect(screen.getByText(/ORD-PAID-001/)).toBeInTheDocument();
      });

      // Verify button on banner is "Gửi yêu cầu hủy đơn"
      const bannerBtn = screen.getByRole("button", { name: "Gửi yêu cầu hủy đơn" });
      expect(bannerBtn).toBeInTheDocument();

      fireEvent.click(bannerBtn);

      const phoneInput = screen.getByLabelText(/Số điện thoại đặt hàng/i);
      fireEvent.change(phoneInput, { target: { value: "0912345678" } });

      // In the modal, find the confirm button (which also has text "Gửi yêu cầu hủy đơn")
      const allActionButtons = screen.getAllByRole("button", { name: "Gửi yêu cầu hủy đơn" });
      const modalSubmitBtn = allActionButtons[allActionButtons.length - 1];

      // Attempt submit without reason -> Should show error
      fireEvent.click(modalSubmitBtn);
      await waitFor(() => {
        expect(screen.getByText(/Nhập lý do hủy đơn/i)).toBeInTheDocument();
      });
      expect(requestCancelApiMock).not.toHaveBeenCalled();

      // Enter reason and submit
      const reasonTextarea = screen.getByPlaceholderText(/Nhập lý do hủy đơn/i);
      fireEvent.change(reasonTextarea, { target: { value: "Khách bận việc đột xuất cần hoàn tiền" } });
      fireEvent.click(modalSubmitBtn);

      await waitFor(() => {
        expect(requestCancelApiMock).toHaveBeenCalledWith(
          "ORD-PAID-001",
          "0912345678",
          "Khách bận việc đột xuất cần hoàn tiền"
        );
      });
    });
  });

  // -------------------------------------------------------------
  // LUỒNG C: ProfileDashboard Order Cancellation
  // -------------------------------------------------------------
  describe("Luồng C: ProfileDashboard Order Cancellation Actions", () => {
    const mockUser = {
      id: 1,
      name: "Nguyễn Văn VIP",
      phone: "0901234567",
      email: "vip@example.com",
    };

    const mockOrders = [
      {
        id: 1,
        order_code: "ORD-COD-01",
        status: "pending",
        can_cancel: true,
        created_at: "2026-11-01T10:00:00Z",
        total: "150000",
        delivery: {
          receiver: "Nguyễn Văn VIP",
          contact_number: "0901234567",
          address: "456 Đường Lê Lợi",
        },
        payment: {
          method: "CASH",
          status: "pending",
          total_payment: "150000",
        },
      },
      {
        id: 2,
        order_code: "ORD-ONLINE-02",
        status: "pending",
        can_cancel: false,
        created_at: "2026-11-01T10:00:00Z",
        total: "250000",
        delivery: {
          receiver: "Nguyễn Văn VIP",
          contact_number: "0901234567",
          address: "456 Đường Lê Lợi",
        },
        payment: {
          method: "TRANSFER",
          status: "paid",
          total_payment: "250000",
        },
      },
    ];

    it("Case C1: COD order in ProfileDashboard -> Expand card and click cancel -> Calls cancelOrderApi with phone", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/user/orders")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: mockOrders }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const cancelApiMock = vi.spyOn(orderService, "cancelOrderApi").mockResolvedValue({
        message: "Hủy thành công",
        data: { ...mockOrders[0], status: "cancelled", can_cancel: false },
      });

      render(
        <ProfileDashboard
          user={mockUser as any}
          onLogout={vi.fn()}
          updateProfile={vi.fn()}
          refreshUser={vi.fn()}
        />
      );

      // Wait for orders to render
      await waitFor(() => {
        expect(screen.getByText(/ORD-COD-01/)).toBeInTheDocument();
      });

      // Expand the first order accordion by clicking "Xem chi tiết"
      const viewDetailsButtons = screen.getAllByRole("button", { name: /view_details|Xem chi tiết/i });
      fireEvent.click(viewDetailsButtons[0]);

      // Wait for bottom actions inside the expanded order card
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Hủy đơn" })).toBeInTheDocument();
      });

      // Click cancel on the first COD order
      fireEvent.click(screen.getByRole("button", { name: "Hủy đơn" }));

      await waitFor(() => {
        expect(cancelApiMock).toHaveBeenCalledWith(
          "ORD-COD-01",
          "0901234567",
          undefined
        );
      });
    });

    it("Case C2: Online Paid order in ProfileDashboard -> Triggers requestCancelOrderApi with phone", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/user/orders")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [mockOrders[1]] }), // Only online paid order
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const requestCancelApiMock = vi.spyOn(orderService, "requestCancelOrderApi").mockResolvedValue({
        message: "Đã gửi yêu cầu",
        data: { ...mockOrders[1], status: "cancel_requested" },
      });

      render(
        <ProfileDashboard
          user={mockUser as any}
          onLogout={vi.fn()}
          updateProfile={vi.fn()}
          refreshUser={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/ORD-ONLINE-02/)).toBeInTheDocument();
      });

      // Expand the online paid order
      const viewDetailsBtn = screen.getByRole("button", { name: /view_details|Xem chi tiết/i });
      fireEvent.click(viewDetailsBtn);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Hủy đơn" })).toBeInTheDocument();
      });

      const cancelBtn = screen.getByRole("button", { name: "Hủy đơn" });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(requestCancelApiMock).toHaveBeenCalledWith(
          "ORD-ONLINE-02",
          "0901234567",
          "Khách hàng gửi yêu cầu hủy đơn từ trang quản lý tài khoản"
        );
      });
    });

    it("Case C3: Delivery phone is masked -> Fallback to order.customer.phone or user.phone", async () => {
      const maskedPhoneOrder = {
        id: 3,
        order_code: "ORD-COD-MASKED",
        status: "pending",
        can_cancel: true,
        created_at: "2026-11-01T10:00:00Z",
        total: "120000",
        delivery: {
          receiver: "Nguyễn Văn VIP",
          contact_number: "090****567", // Masked!
          address: "123 Đường Trần Phú",
        },
        customer: {
          phone: "0987654321", // Valid unmasked fallback
        },
        payment: {
          method: "CASH",
          status: "pending",
          total_payment: "120000",
        },
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/user/orders")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [maskedPhoneOrder] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const cancelApiMock = vi.spyOn(orderService, "cancelOrderApi").mockResolvedValue({
        message: "Hủy thành công",
        data: { ...maskedPhoneOrder, status: "cancelled", can_cancel: false },
      });

      render(
        <ProfileDashboard
          user={mockUser as any}
          onLogout={vi.fn()}
          updateProfile={vi.fn()}
          refreshUser={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/ORD-COD-MASKED/)).toBeInTheDocument();
      });

      const viewDetailsBtn = screen.getByRole("button", { name: /view_details|Xem chi tiết/i });
      fireEvent.click(viewDetailsBtn);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Hủy đơn" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Hủy đơn" }));

      await waitFor(() => {
        expect(cancelApiMock).toHaveBeenCalledWith(
          "ORD-COD-MASKED",
          "0987654321", // Successfully resolved from order.customer.phone without masked '*'
          undefined
        );
      });
    });

    it("Case C4: Cancel button is hidden when order is cancelled or expired window", async () => {
      const expiredOnlineOrder = {
        id: 4,
        order_code: "ORD-ONLINE-EXPIRED",
        status: "pending",
        can_cancel: false,
        remaining_cancel_seconds: 0, // Window expired!
        created_at: "2026-11-01T10:00:00Z",
        total: "300000",
        payment: {
          method: "TRANSFER",
          status: "paid",
          total_payment: "300000",
        },
      };

      const cancelledOrder = {
        id: 5,
        order_code: "ORD-CANCELLED",
        status: "cancelled",
        can_cancel: false,
        created_at: "2026-11-01T10:00:00Z",
        total: "100000",
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("/user/orders")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [expiredOnlineOrder, cancelledOrder] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(
        <ProfileDashboard
          user={mockUser as any}
          onLogout={vi.fn()}
          updateProfile={vi.fn()}
          refreshUser={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/ORD-ONLINE-EXPIRED/)).toBeInTheDocument();
        expect(screen.getByText(/ORD-CANCELLED/)).toBeInTheDocument();
      });

      // Expand both
      const viewDetailsBtns = screen.getAllByRole("button", { name: /view_details|Xem chi tiết/i });
      fireEvent.click(viewDetailsBtns[0]);
      fireEvent.click(viewDetailsBtns[1]);

      // Neither should have "Hủy đơn" button
      expect(screen.queryByRole("button", { name: "Hủy đơn" })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // LUỒNG D: P2 Revalidate Endpoint & Middleware Redirect Verification
  // -------------------------------------------------------------
  describe("Luồng D: P2 Security & SEO Redirect Verification", () => {
    it("Case D1: /api/revalidate rejects when REVALIDATION_SECRET is missing or mismatched, and succeeds when matched", async () => {
      const { GET } = await import("@/app/api/revalidate/route");
      const { NextRequest } = await import("next/server");

      const originalSecret = process.env.REVALIDATION_SECRET;
      try {
        delete process.env.REVALIDATION_SECRET;
        const reqNoEnv = new NextRequest("http://localhost:3000/api/revalidate?secret=cothaotomca_secret_token_2026");
        const resNoEnv = await GET(reqNoEnv);
        expect(resNoEnv.status).toBe(401);

        process.env.REVALIDATION_SECRET = "secure_prod_secret_999";
        const reqWrong = new NextRequest("http://localhost:3000/api/revalidate?secret=wrong_token");
        const resWrong = await GET(reqWrong);
        expect(resWrong.status).toBe(401);
      } finally {
        if (originalSecret === undefined) {
          delete process.env.REVALIDATION_SECRET;
        } else {
          process.env.REVALIDATION_SECRET = originalSecret;
        }
      }
    });

    it("Case D2: middleware redirects /vi/{reset-password,forgot-password,checkout,order-lookup} with 301 to localized Vietnamese slugs", async () => {
      const { default: middleware } = await import("@/middleware");
      const { NextRequest } = await import("next/server");

      const cases: Array<[string, string]> = [
        ["http://localhost:3000/vi/reset-password?token=abc", "/dat-lai-mat-khau?token=abc"],
        ["http://localhost:3000/vi/forgot-password", "/quen-mat-khau"],
        ["http://localhost:3000/vi/checkout", "/thanh-toan"],
        ["http://localhost:3000/vi/order-lookup?code=ORD-1", "/tra-cuu-don-hang?code=ORD-1"],
      ];

      for (const [inputUrl, expectedLocationSuffix] of cases) {
        const req = new NextRequest(inputUrl);
        const res = middleware(req);
        expect(res.status).toBe(301);
        const location = res.headers.get("location") || "";
        expect(location.endsWith(expectedLocationSuffix)).toBe(true);
      }
    });
  });
});
